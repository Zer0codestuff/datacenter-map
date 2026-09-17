"""Fetch data-center items from Wikidata via SPARQL.

Queries every item whose `instance of` (P31) is `data center` (Q1073180) or a
subclass of it and that has coordinates (P625). Results are saved as a raw JSON
list under ``data/raw/wikidata.json`` and later normalised by ``build_dataset.py``.

Usage: python scripts/fetch_wikidata.py [--out data/raw/wikidata.json]
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

ENDPOINT = "https://query.wikidata.org/sparql"
USER_AGENT = "datacenter-map/1.0 (https://github.com/Zer0codestuff/datacenter-map)"

QUERY = """
SELECT DISTINCT ?item ?itemLabel ?coord WHERE {
  ?item wdt:P31 wd:Q671224 ; wdt:P625 ?coord .
  OPTIONAL { ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = "en") }
}
"""


def parse_point(wkt: str) -> tuple[float, float] | None:
    """Parse a WKT ``Point(lng lat)`` string into (lat, lng)."""
    if not wkt or not wkt.startswith("Point("):
        return None
    try:
        lng_s, lat_s = wkt[6:-1].split()
        return float(lat_s), float(lng_s)
    except ValueError:
        return None


def fetch(timeout: int = 120) -> list[dict]:
    resp = requests.get(
        ENDPOINT,
        params={"query": QUERY, "format": "json"},
        headers={"User-Agent": USER_AGENT, "Accept": "application/sparql-results+json"},
        timeout=timeout,
    )
    resp.raise_for_status()
    rows = resp.json()["results"]["bindings"]
    retrieved = datetime.now(timezone.utc).date().isoformat()
    out: dict[str, dict] = {}
    for row in rows:
        qid = row["item"]["value"].rsplit("/", 1)[-1]
        point = parse_point(row.get("coord", {}).get("value", ""))
        if point is None:
            continue
        rec = out.setdefault(
            qid,
            {
                "qid": qid,
                "name": row.get("itemLabel", {}).get("value"),
                "lat": point[0],
                "lng": point[1],
                "country": row.get("countryCode", {}).get("value"),
                "operator": row.get("operatorLabel", {}).get("value"),
                "owner": row.get("ownerLabel", {}).get("value"),
                "inception": row.get("inception", {}).get("value"),
                "article": row.get("article", {}).get("value"),
                "retrieved": retrieved,
            },
        )
        # Fill blanks from duplicate rows (multiple operators etc.)
        for key in ("country", "operator", "owner", "inception", "article"):
            if not rec.get(key) and row.get(key if key != "country" else "countryCode"):
                rec[key] = row[key if key != "country" else "countryCode"]["value"]
    return list(out.values())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="data/raw/wikidata.json")
    args = parser.parse_args()
    records = fetch()
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(records, ensure_ascii=False, indent=1))
    print(f"wikidata: {len(records)} records -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
