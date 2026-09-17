"""Tests for the dataset build pipeline (dedupe, validation, stats, geojson)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from build_dataset import (  # noqa: E402
    blank_record, dedupe, validate, finalize, compute_stats, to_geojson,
    infer_country, canonical_operator, haversine_m, SCHEMA_FIELDS, TIERS,
)


def make_rec(**kw):
    rec = blank_record()
    rec.update(id="x", lat=10.0, lng=10.0, tier="confirmed",
               status="operational", type="colocation",
               sources=[{"url": "https://example.com", "retrieved": "2026-09-17"}])
    rec.update(kw)
    return rec


def test_infer_country():
    assert infer_country(39.0, -77.5) == "US"
    assert infer_country(48.85, 2.35) == "FR"
    assert infer_country(35.68, 139.69) == "JP"
    assert infer_country(0.0, 0.0) is None  # Gulf of Guinea, no bbox


def test_canonical_operator():
    assert canonical_operator("AWS") == "Amazon Web Services"
    assert canonical_operator("amazon web services") == "Amazon Web Services"
    assert canonical_operator("Equinix") == "Equinix"
    assert canonical_operator("Small Local Provider") == "Small Local Provider"
    assert canonical_operator(None) is None


def test_haversine():
    # ~111 km per degree of latitude
    d = haversine_m(0, 0, 1, 0)
    assert 110_000 < d < 112_000


def test_dedupe_merges_nearby_same_operator():
    a = make_rec(id="a", name="Site Alpha", operator="Equinix", lat=51.5, lng=-0.1)
    b = make_rec(id="b", name="Site Alpha", operator="Equinix", lat=51.5001, lng=-0.1001,
                 sources=[{"url": "https://other.example", "retrieved": "2026-09-17"}])
    a["_source"] = b["_source"] = "osm"
    merged = dedupe([a, b])
    assert len(merged) == 1
    urls = {s["url"] for s in merged[0]["sources"]}
    assert urls == {"https://example.com", "https://other.example"}


def test_dedupe_keeps_distant_sites():
    a = make_rec(id="a", operator="Equinix", lat=51.5, lng=-0.1)
    b = make_rec(id="b", operator="Equinix", lat=48.85, lng=2.35)
    a["_source"] = b["_source"] = "osm"
    assert len(dedupe([a, b])) == 2


def test_validate_catches_bad_records():
    good = make_rec(id="g1")
    assert validate([good]) == []
    bad_tier = make_rec(id="b1", tier="maybe")
    bad_lat = make_rec(id="b2", lat=123.0)
    no_src = make_rec(id="b3", sources=[])
    problems = validate([bad_tier, bad_lat, no_src])
    assert any("tier" in p for p in problems)
    assert any("lat" in p for p in problems)
    assert any("sources" in p for p in problems)


def test_finalize_assigns_stable_ids_and_names():
    recs = [make_rec(id=None, name=None, operator="Equinix", country="GB", lat=51.5, lng=-0.1)]
    out = finalize(recs)
    assert out[0]["id"].startswith("dc-")
    assert "Equinix" in out[0]["name"]
    assert set(out[0].keys()) >= set(SCHEMA_FIELDS)


def test_geojson_structure():
    recs = finalize([make_rec(id=None, lat=1.0, lng=2.0)])
    gj = to_geojson(recs)
    assert gj["type"] == "FeatureCollection"
    f = gj["features"][0]
    assert f["geometry"]["coordinates"] == [2.0, 1.0]
    assert "lat" not in f["properties"]


def test_compute_stats():
    recs = finalize([
        make_rec(id=None, country="US", operator="Equinix", power_capacity_mw=100, year_opened=2010),
        make_rec(id=None, country="US", operator="Equinix", power_capacity_mw=None),
        make_rec(id=None, country="DE", operator="Hetzner", power_capacity_mw=20),
    ])
    stats = compute_stats(recs)
    assert stats["total_sites"] == 3
    assert stats["total_power_mw_known"] == 120
    assert stats["sites_with_power_data"] == 2
    us = next(c for c in stats["countries"] if c["code"] == "US")
    assert us["count"] == 2
    assert stats["top_operators"][0]["operator"] == "Equinix"


def test_shipped_dataset_is_valid():
    """The committed canonical dataset must pass validation and tier rules."""
    path = Path(__file__).resolve().parent.parent / "data" / "datacenters.json"
    if not path.exists():
        return  # dataset not built in this environment
    records = json.loads(path.read_text())
    assert len(records) > 1000
    assert validate(records) == []
    assert all(r["tier"] in TIERS for r in records)
    assert all(r["sources"] for r in records)
