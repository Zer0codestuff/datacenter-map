"""Fetch data-center features from OpenStreetMap via the Overpass API.

Queries nodes/ways/relations tagged ``telecom=data_center`` or
``building=data_center`` worldwide and stores them in ``data/raw/osm.json``.
Ways/relations are reduced to their centroid via Overpass ``out center``.

Usage: python scripts/fetch_osm.py [--out data/raw/osm.json]
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
USER_AGENT = "datacenter-map/1.0 (https://github.com/Zer0codestuff/datacenter-map)"

QUERY = """
[out:json][timeout:300];
(
  nwr["telecom"="data_center"];
  nwr["building"="data_center"];
);
out center tags;
"""


def element_to_record(el: dict, retrieved: str) -> dict | None:
    tags = el.get("tags", {})
    if el["type"] == "node":
        lat, lng = el.get("lat"), el.get("lon")
    else:
        center = el.get("center") or {}
        lat, lng = center.get("lat"), center.get("lon")
    if lat is None or lng is None:
        return None
    return {
        "osm_id": f"{el['type'][0]}{el['id']}",
        "name": tags.get("name") or tags.get("name:en"),
        "operator": tags.get("operator") or tags.get("brand"),
        "owner": tags.get("owner"),
        "lat": lat,
        "lng": lng,
        "country": (tags.get("addr:country") or "").upper() or None,
        "city": tags.get("addr:city"),
        "website": tags.get("website") or tags.get("contact:website"),
        "wikidata": tags.get("wikidata") or tags.get("operator:wikidata"),
        "start_date": tags.get("start_date") or tags.get("opening_date"),
        "retrieved": retrieved,
    }


def fetch(timeout: int = 320) -> list[dict]:
    last_error: Exception | None = None
    for endpoint in ENDPOINTS:
        try:
            resp = requests.post(
                endpoint, data={"data": QUERY}, headers={"User-Agent": USER_AGENT}, timeout=timeout
            )
            resp.raise_for_status()
            elements = resp.json().get("elements", [])
            retrieved = datetime.now(timezone.utc).date().isoformat()
            records = [r for r in (element_to_record(e, retrieved) for e in elements) if r]
            return records
        except Exception as exc:  # noqa: BLE001 - try next mirror
            last_error = exc
            print(f"overpass mirror failed ({endpoint}): {exc}", file=sys.stderr)
            time.sleep(5)
    raise RuntimeError(f"all Overpass mirrors failed: {last_error}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="data/raw/osm.json")
    args = parser.parse_args()
    records = fetch()
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(records, ensure_ascii=False, indent=1))
    print(f"osm: {len(records)} records -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
