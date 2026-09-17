"""Build the canonical datacenter-map dataset.

Reads raw sources from ``data/raw/`` (OSM Overpass, Wikidata SPARQL, curated
seed), normalises them into a single schema, deduplicates records that refer
to the same physical site, validates every record, and writes:

- ``data/datacenters.json``  -- canonical JSON dataset (full schema)
- ``data/dist/datacenters.geojson`` -- GeoJSON for the web app
- ``data/dist/stats.json``   -- precomputed global + per-country statistics

Usage: python scripts/build_dataset.py [--raw-dir data/raw] [--out data/datacenters.json]
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

TIERS = ("confirmed", "probable", "theorized")
STATUSES = ("operational", "under construction", "planned", "decommissioned")
TYPES = (
    "hyperscale", "colocation", "enterprise", "edge",
    "hpc/supercomputer", "government", "crypto mining", "ai training",
)

SCHEMA_FIELDS = [
    "id", "name", "operator", "owner", "lat", "lng", "country", "city",
    "tier", "status", "type", "purpose", "power_capacity_mw",
    "power_capacity_mw_estimated", "it_load_mw", "pue", "area_sqm",
    "num_buildings", "year_opened", "cooling_type", "renewable_notes",
    "connectivity", "sources",
]

# ISO 3166-1 alpha-2 -> country name (subset used for validation/labels)
COUNTRY_NAMES = {
    "US": "United States", "CA": "Canada", "MX": "Mexico", "BR": "Brazil",
    "CL": "Chile", "AR": "Argentina", "CO": "Colombia", "PE": "Peru",
    "GB": "United Kingdom", "IE": "Ireland", "FR": "France", "DE": "Germany",
    "NL": "Netherlands", "BE": "Belgium", "LU": "Luxembourg", "CH": "Switzerland",
    "AT": "Austria", "IT": "Italy", "ES": "Spain", "PT": "Portugal",
    "SE": "Sweden", "NO": "Norway", "DK": "Denmark", "FI": "Finland",
    "IS": "Iceland", "PL": "Poland", "CZ": "Czechia", "HU": "Hungary",
    "RO": "Romania", "BG": "Bulgaria", "GR": "Greece", "UA": "Ukraine",
    "RU": "Russia", "TR": "Turkey", "IL": "Israel", "AE": "United Arab Emirates",
    "SA": "Saudi Arabia", "QA": "Qatar", "BH": "Bahrain", "OM": "Oman",
    "IN": "India", "CN": "China", "HK": "Hong Kong", "TW": "Taiwan",
    "JP": "Japan", "KR": "South Korea", "SG": "Singapore", "MY": "Malaysia",
    "ID": "Indonesia", "TH": "Thailand", "VN": "Vietnam", "PH": "Philippines",
    "AU": "Australia", "NZ": "New Zealand", "ZA": "South Africa",
    "KE": "Kenya", "NG": "Nigeria", "EG": "Egypt", "MA": "Morocco",
    "EE": "Estonia", "LV": "Latvia", "LT": "Lithuania", "SK": "Slovakia",
    "SI": "Slovenia", "HR": "Croatia", "RS": "Serbia", "UY": "Uruguay",
    "PA": "Panama", "CR": "Costa Rica", "KW": "Kuwait", "JO": "Jordan",
    "PK": "Pakistan", "BD": "Bangladesh", "KH": "Cambodia", "MN": "Mongolia",
    "KZ": "Kazakhstan", "GE": "Georgia", "AM": "Armenia", "AZ": "Azerbaijan",
    "MT": "Malta", "CY": "Cyprus", "DZ": "Algeria", "TN": "Tunisia",
    "GH": "Ghana", "CI": "Ivory Coast", "SN": "Senegal", "ET": "Ethiopia",
    "UG": "Uganda", "TZ": "Tanzania", "ZW": "Zimbabwe", "BW": "Botswana",
    "NA": "Namibia", "MU": "Mauritius", "RE": "Reunion", "PR": "Puerto Rico",
    "JM": "Jamaica", "TT": "Trinidad and Tobago", "EC": "Ecuador",
    "BO": "Bolivia", "PY": "Paraguay", "VE": "Venezuela", "GT": "Guatemala",
    "DO": "Dominican Republic", "IQ": "Iraq", "IR": "Iran", "AF": "Afghanistan",
    "LK": "Sri Lanka", "NP": "Nepal", "MM": "Myanmar", "LA": "Laos",
    "UZ": "Uzbekistan", "TM": "Turkmenistan", "KG": "Kyrgyzstan",
    "TJ": "Tajikistan", "BY": "Belarus", "MD": "Moldova", "AL": "Albania",
    "MK": "North Macedonia", "BA": "Bosnia and Herzegovina", "ME": "Montenegro",
    "XK": "Kosovo", "LI": "Liechtenstein", "MC": "Monaco", "AD": "Andorra",
    "SM": "San Marino", "VA": "Vatican City", "FO": "Faroe Islands",
    "GL": "Greenland", "GU": "Guam", "MO": "Macau", "BN": "Brunei",
    "PG": "Papua New Guinea", "FJ": "Fiji", "NC": "New Caledonia",
    "PF": "French Polynesia", "BM": "Bermuda", "KY": "Cayman Islands",
    "BS": "Bahamas", "BB": "Barbados", "CW": "Curacao", "AW": "Aruba",
    "LB": "Lebanon", "SY": "Syria", "YE": "Yemen", "LY": "Libya",
    "SD": "Sudan", "SS": "South Sudan", "CD": "DR Congo", "CG": "Congo",
    "CM": "Cameroon", "AO": "Angola", "MZ": "Mozambique", "MG": "Madagascar",
    "ZM": "Zambia", "MW": "Malawi", "RW": "Rwanda", "BI": "Burundi",
    "DJ": "Djibouti", "SO": "Somalia", "ER": "Eritrea", "TD": "Chad",
    "NE": "Niger", "ML": "Mali", "BF": "Burkina Faso", "MR": "Mauritania",
    "GN": "Guinea", "SL": "Sierra Leone", "LR": "Liberia", "TG": "Togo",
    "BJ": "Benin", "GA": "Gabon", "GQ": "Equatorial Guinea", "SZ": "Eswatini",
    "LS": "Lesotho", "CV": "Cape Verde", "ST": "Sao Tome and Principe",
    "KM": "Comoros", "SC": "Seychelles", "IO": "British Indian Ocean Territory",
    "PS": "Palestine", "IM": "Isle of Man", "JE": "Jersey", "GG": "Guernsey",
    "BT": "Bhutan", "KP": "North Korea", "SV": "El Salvador", "GY": "Guyana",
    "SR": "Suriname", "HN": "Honduras", "NI": "Nicaragua", "BZ": "Belize",
    "CU": "Cuba", "HT": "Haiti", "GF": "French Guiana", "GP": "Guadeloupe",
    "MQ": "Martinique", "VI": "U.S. Virgin Islands", "AS": "American Samoa",
    "MP": "Northern Mariana Islands", "CK": "Cook Islands", "VU": "Vanuatu",
    "WS": "Samoa", "TO": "Tonga", "SB": "Solomon Islands", "TL": "Timor-Leste",
    "PW": "Palau", "MH": "Marshall Islands", "KI": "Kiribati", "TV": "Tuvalu",
    "NR": "Nauru", "FM": "Micronesia", "LI2": "unused",
    "GI": "Gibraltar", "AX": "Aland Islands", "SJ": "Svalbard and Jan Mayen",
}

# Rough bounding boxes per ISO-2 code for country inference from coordinates.
# Format: code: (min_lat, max_lat, min_lng, max_lng). Coarse but effective for
# inferring a country when the source did not provide one.
COUNTRY_BBOX = {
    "US": (24.5, 49.5, -125.0, -66.9), "CA": (42.0, 70.0, -141.0, -52.6),
    "MX": (14.5, 32.7, -118.4, -86.7), "BR": (-33.8, 5.3, -73.99, -34.8),
    "CL": (-56.0, -17.5, -75.7, -66.4), "AR": (-55.1, -21.8, -73.6, -53.6),
    "CO": (-4.2, 13.4, -79.0, -66.9), "PE": (-18.4, -0.04, -81.3, -68.7),
    "GB": (49.9, 60.9, -8.6, 1.8), "IE": (51.4, 55.4, -10.5, -6.0),
    "FR": (41.3, 51.1, -5.2, 9.6), "DE": (47.3, 55.1, 5.9, 15.0),
    "NL": (50.75, 53.6, 3.3, 7.2), "BE": (49.5, 51.5, 2.5, 6.4),
    "LU": (49.4, 50.2, 5.7, 6.5), "CH": (45.8, 47.8, 5.9, 10.5),
    "AT": (46.4, 49.0, 9.5, 17.2), "IT": (36.6, 47.1, 6.6, 18.5),
    "ES": (35.9, 43.8, -9.3, 4.3), "PT": (36.9, 42.2, -9.5, -6.2),
    "SE": (55.3, 69.1, 11.0, 24.2), "NO": (57.9, 71.2, 4.5, 31.1),
    "DK": (54.5, 57.8, 8.0, 15.2), "FI": (59.8, 70.1, 20.5, 31.6),
    "IS": (63.3, 66.6, -24.5, -13.5), "PL": (49.0, 54.9, 14.1, 24.2),
    "CZ": (48.6, 51.1, 12.1, 18.9), "HU": (45.7, 48.6, 16.1, 22.9),
    "RO": (43.6, 48.3, 20.3, 29.7), "BG": (41.2, 44.2, 22.4, 28.6),
    "GR": (34.8, 41.8, 19.4, 29.7), "UA": (44.4, 52.4, 22.1, 40.2),
    "RU": (41.2, 77.7, 19.6, 180.0), "TR": (35.8, 42.1, 25.7, 44.8),
    "IL": (29.5, 33.3, 34.3, 35.9), "AE": (22.6, 26.1, 51.5, 56.4),
    "SA": (16.3, 32.2, 34.5, 55.7), "QA": (24.5, 26.2, 50.7, 51.7),
    "BH": (25.6, 26.3, 50.4, 50.8), "OM": (16.6, 26.4, 52.0, 59.8),
    "IN": (6.7, 35.5, 68.2, 97.4), "CN": (18.2, 53.6, 73.5, 134.8),
    "HK": (22.15, 22.6, 113.8, 114.4), "TW": (21.9, 25.3, 119.3, 122.0),
    "JP": (30.0, 45.6, 129.0, 145.9), "KR": (33.1, 38.6, 124.6, 130.9),
    "SG": (1.2, 1.5, 103.6, 104.1), "MY": (0.9, 7.4, 99.6, 119.3),
    "ID": (-11.0, 6.1, 95.0, 141.0), "TH": (5.6, 20.5, 97.3, 105.7),
    "VN": (8.4, 23.4, 102.1, 109.5), "PH": (4.6, 21.1, 116.9, 126.6),
    "AU": (-43.7, -10.7, 113.2, 153.6), "NZ": (-47.3, -34.4, 166.4, 178.6),
    "ZA": (-34.9, -22.1, 16.5, 32.9), "KE": (-4.7, 5.0, 33.9, 41.9),
    "NG": (4.3, 13.9, 2.7, 14.7), "EG": (22.0, 31.7, 24.7, 36.9),
    "MA": (27.7, 35.9, -13.2, -1.0), "EE": (57.5, 59.7, 21.8, 28.2),
    "LV": (55.7, 58.1, 20.9, 28.2), "LT": (53.9, 56.5, 20.9, 26.8),
    "SK": (47.7, 49.6, 16.8, 22.6), "SI": (45.4, 46.9, 13.4, 16.6),
    "HR": (42.4, 46.6, 13.5, 19.4), "RS": (42.2, 46.2, 18.8, 23.0),
    "UY": (-34.98, -30.1, -58.5, -53.1), "PA": (7.0, 9.7, -83.1, -77.2),
    "KW": (28.5, 30.1, 46.6, 48.4), "JO": (29.2, 33.4, 34.9, 39.3),
    "PK": (23.7, 37.1, 60.9, 77.8), "KZ": (40.6, 55.4, 46.5, 87.3),
    "GE": (41.0, 43.6, 39.9, 46.7), "MT": (35.8, 36.1, 14.2, 14.6),
    "CY": (34.6, 35.7, 32.3, 34.6), "DZ": (18.9, 37.1, -8.7, 12.0),
    "TN": (30.2, 37.6, 7.5, 11.6), "GH": (4.7, 11.2, -3.3, 1.2),
    "ET": (3.4, 14.9, 32.99, 48.0), "TZ": (-11.8, -0.99, 29.3, 40.5),
    "PR": (17.9, 18.5, -67.9, -65.2), "EC": (-5.0, 1.5, -81.1, -75.2),
    "BO": (-22.9, -9.7, -69.7, -57.5), "PY": (-27.6, -19.3, -62.7, -54.3),
    "VE": (0.7, 12.2, -73.4, -59.8), "GT": (13.7, 17.8, -92.2, -88.2),
    "DO": (17.5, 19.9, -72.0, -68.7), "IQ": (29.1, 37.4, 38.8, 48.6),
    "IR": (25.1, 39.8, 44.0, 63.3), "LK": (5.9, 9.9, 79.7, 81.9),
    "MM": (9.8, 28.6, 92.2, 101.2), "KH": (10.4, 14.7, 102.3, 107.6),
    "LA": (13.9, 22.5, 100.1, 107.7), "UZ": (37.2, 45.6, 55.99, 73.2),
    "BY": (51.3, 56.2, 23.2, 32.8), "MD": (45.5, 48.5, 26.6, 30.2),
    "AL": (39.6, 42.7, 19.3, 21.1), "MK": (40.9, 42.4, 20.5, 23.0),
    "BA": (42.6, 45.3, 15.7, 19.6), "ME": (41.8, 43.6, 18.4, 20.4),
    "MO": (22.1, 22.2, 113.5, 113.6), "BN": (4.0, 5.1, 114.1, 115.4),
    "PG": (-11.7, -0.9, 140.8, 156.0), "FJ": (-20.7, -12.5, 176.9, -178.2),
    "BM": (32.2, 32.4, -64.9, -64.6), "LB": (33.1, 34.7, 35.1, 36.6),
    "PS": (31.2, 32.6, 34.2, 35.6), "MU": (-20.6, -19.9, 57.3, 57.9),
    "ZW": (-22.5, -15.6, 25.2, 33.1), "BW": (-26.9, -17.8, 20.0, 29.4),
    "NA": (-29.0, -16.9, 11.7, 25.3), "ZM": (-18.1, -8.2, 22.0, 33.7),
    "AO": (-18.0, -4.4, 11.7, 24.1), "MZ": (-26.9, -10.5, 30.2, 40.8),
    "MG": (-25.6, -11.9, 43.2, 50.5), "CM": (1.7, 13.1, 8.5, 16.2),
    "SN": (12.3, 16.7, -17.5, -11.4), "CI": (4.3, 10.7, -8.6, -2.5),
    "UG": (-1.5, 4.2, 29.6, 35.0), "RW": (-2.8, -1.1, 28.9, 30.9),
    "DJ": (10.9, 12.7, 41.8, 43.4), "LY": (19.5, 33.2, 9.3, 25.2),
    "SD": (9.5, 22.2, 21.8, 38.6), "AF": (29.4, 38.5, 60.9, 75.0),
    "NP": (26.3, 30.5, 80.1, 88.2), "BD": (20.7, 26.6, 88.0, 92.7),
    "MN": (41.6, 52.2, 87.7, 119.9), "AM": (38.8, 41.3, 43.4, 46.6),
    "AZ": (38.4, 41.9, 44.8, 50.4), "JM": (17.7, 18.5, -78.4, -76.2),
    "TT": (10.0, 10.9, -61.9, -60.5), "BS": (22.8, 27.3, -79.3, -72.7),
    "BB": (13.0, 13.3, -59.7, -59.4), "GY": (1.2, 8.6, -61.4, -56.5),
    "SR": (1.8, 6.0, -58.1, -54.0), "HN": (13.0, 16.5, -89.4, -83.2),
    "NI": (10.7, 15.0, -87.7, -82.7), "SV": (13.2, 14.5, -90.1, -87.7),
    "BZ": (15.9, 18.5, -89.2, -87.8), "CU": (19.8, 23.3, -84.9, -74.1),
    "HT": (18.0, 20.1, -74.5, -71.6), "KP": (37.7, 43.0, 124.2, 130.7),
    "BT": (26.7, 28.3, 88.7, 92.1), "TM": (35.1, 42.8, 52.4, 66.7),
    "KG": (39.2, 43.2, 69.3, 80.3), "TJ": (36.7, 41.1, 67.3, 75.2),
    "YE": (12.1, 19.0, 42.6, 54.5), "SY": (32.3, 37.3, 35.7, 42.4),
    "NO_SJ": (76.5, 80.8, 10.5, 33.3),
}

# Operator name canonicalisation (lowercased alias -> canonical name)
OPERATOR_ALIASES = {
    "amazon": "Amazon Web Services", "aws": "Amazon Web Services",
    "amazon web services": "Amazon Web Services",
    "microsoft": "Microsoft", "microsoft azure": "Microsoft Azure",
    "azure": "Microsoft Azure",
    "google": "Google", "google cloud": "Google Cloud",
    "meta": "Meta", "facebook": "Meta",
    "equinix": "Equinix", "digital realty": "Digital Realty",
    "ntt": "NTT", "ntt communications": "NTT", "ntt ltd": "NTT",
    "oracle": "Oracle Cloud", "oracle cloud": "Oracle Cloud",
    "ibm": "IBM", "ibm cloud": "IBM Cloud",
    "alibaba": "Alibaba Cloud", "alibaba cloud": "Alibaba Cloud",
    "tencent": "Tencent Cloud", "huawei": "Huawei Cloud",
    "ovh": "OVHcloud", "ovhcloud": "OVHcloud",
    "switch": "Switch", "vantage": "Vantage Data Centers",
    "qts": "QTS Realty Trust", "cyrusone": "CyrusOne",
    "iron mountain": "Iron Mountain", "coresite": "CoreSite",
    "stack infrastructure": "STACK Infrastructure",
    "stack": "STACK Infrastructure",
    "global switch": "Global Switch", "colt": "Colt Data Centre Services",
    "data4": "DATA4", "aruba": "Aruba S.p.A.", "aruba s.p.a.": "Aruba S.p.A.",
    "interxion": "Digital Realty (Interxion)",
    "apple": "Apple", "tiktok": "TikTok / ByteDance", "bytedance": "TikTok / ByteDance",
    "coreweave": "CoreWeave", "crusoe": "Crusoe", "xai": "xAI",
    "openai": "OpenAI", "hetzner": "Hetzner", "ionos": "IONOS",
    "telehouse": "Telehouse", "kddi": "KDDI / Telehouse",
    "teraco": "Teraco", "nextdc": "NEXTDC", "airtrunk": "AirTrunk",
    "st telemedia global data centres": "ST Telemedia Global Data Centres",
    "stt gdc": "ST Telemedia Global Data Centres",
    "verne global": "Verne Global", "green mountain": "Green Mountain",
    "atnorth": "atNorth", "bulk infrastructure": "Bulk Infrastructure",
    "riot platforms": "Riot Platforms", "riot": "Riot Platforms",
    "marathon digital holdings": "Marathon Digital Holdings",
    "marathon digital": "Marathon Digital Holdings",
    "cern": "CERN", "bahnhof": "Bahnhof",
}

HYPERSCALERS = {
    "Amazon Web Services", "Microsoft Azure", "Google Cloud", "Oracle Cloud",
    "IBM Cloud", "Alibaba Cloud", "Tencent Cloud", "Huawei Cloud", "Meta",
    "Apple", "TikTok / ByteDance", "CoreWeave", "xAI", "OpenAI",
}


def infer_country(lat: float, lng: float) -> str | None:
    """Infer an ISO-2 country code from coordinates using coarse bounding boxes."""
    candidates = []
    for code, (min_lat, max_lat, min_lng, max_lng) in COUNTRY_BBOX.items():
        if code.endswith("_SJ"):
            continue
        if min_lat <= lat <= max_lat and min_lng <= lng <= max_lng:
            area = (max_lat - min_lat) * (max_lng - min_lng)
            candidates.append((area, code))
    if not candidates:
        return None
    candidates.sort()
    return candidates[0][1]


def canonical_operator(name: str | None) -> str | None:
    if not name:
        return None
    key = re.sub(r"[^a-z0-9 ]", "", name.lower()).strip()
    if key in OPERATOR_ALIASES:
        return OPERATOR_ALIASES[key]
    for alias, canon in OPERATOR_ALIASES.items():
        if key.startswith(alias) or alias in key:
            return canon
    return name.strip()


def classify_type(operator: str | None, source: str) -> str:
    if operator in HYPERSCALERS:
        return "hyperscale"
    if source in ("osm", "wikidata"):
        return "colocation" if operator else "enterprise"
    return "colocation"


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def norm_name(name: str | None) -> str:
    if not name:
        return ""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def blank_record() -> dict:
    return {f: None for f in SCHEMA_FIELDS} | {"sources": [], "power_capacity_mw_estimated": False}


def load_raw(raw_dir: Path) -> list[dict]:
    """Load and normalise all raw source files into candidate records."""
    candidates: list[dict] = []

    osm_path = raw_dir / "osm.json"
    if osm_path.exists():
        for r in json.loads(osm_path.read_text()):
            rec = blank_record()
            rec.update(
                id=f"osm-{r['osm_id']}",
                name=r.get("name"),
                operator=canonical_operator(r.get("operator")),
                owner=r.get("owner"),
                lat=r["lat"],
                lng=r["lng"],
                country=r.get("country"),
                city=r.get("city"),
                tier="confirmed",
                status="operational",
                type=None,  # classified later
                sources=[{
                    "url": f"https://www.openstreetmap.org/{r['osm_id'][0] if r['osm_id'][0] != 'n' else 'node'}"
                           f"{'ode' if r['osm_id'][0] == 'n' else ('ay' if r['osm_id'][0] == 'w' else 'elation')}/"
                           f"{r['osm_id'][1:]}",
                    "retrieved": r.get("retrieved"),
                }],
            )
            if r.get("website"):
                rec["sources"].append({"url": r["website"], "retrieved": r.get("retrieved")})
            if r.get("start_date"):
                m = re.match(r"(\d{4})", r["start_date"])
                if m:
                    rec["year_opened"] = int(m.group(1))
            rec["_source"] = "osm"
            candidates.append(rec)

    wd_path = raw_dir / "wikidata.json"
    if wd_path.exists():
        for r in json.loads(wd_path.read_text()):
            rec = blank_record()
            rec.update(
                id=f"wd-{r['qid']}",
                name=r.get("name"),
                operator=canonical_operator(r.get("operator")),
                owner=r.get("owner"),
                lat=r["lat"],
                lng=r["lng"],
                country=r.get("country"),
                tier="confirmed",
                status="operational",
                sources=[{"url": f"https://www.wikidata.org/wiki/{r['qid']}", "retrieved": r.get("retrieved")}],
            )
            if r.get("article"):
                rec["sources"].append({"url": r["article"], "retrieved": r.get("retrieved")})
            if r.get("inception"):
                m = re.match(r"(\d{4})", r["inception"])
                if m:
                    rec["year_opened"] = int(m.group(1))
            rec["_source"] = "wikidata"
            candidates.append(rec)

    curated_path = raw_dir / "curated.json"
    if curated_path.exists():
        for r in json.loads(curated_path.read_text()):
            rec = blank_record()
            rec.update(
                id=r["seed_id"],
                name=r["name"],
                operator=canonical_operator(r.get("operator")),
                owner=r.get("owner"),
                lat=r["lat"],
                lng=r["lng"],
                country=r.get("country"),
                city=r.get("city"),
                tier=r["tier"],
                status=r["status"],
                type=r["type"],
                power_capacity_mw=r.get("power_capacity_mw"),
                year_opened=r.get("year_opened"),
                sources=r.get("sources", []),
            )
            rec["_source"] = "curated"
            candidates.append(rec)

    return candidates


def dedupe(candidates: list[dict]) -> list[dict]:
    """Merge records that refer to the same physical site.

    Two records are duplicates when they are within 500 m of each other and
    either share a normalised name or share a canonical operator. Curated
    records take precedence for descriptive fields; sources are merged.
    """
    rank = {"curated": 0, "wikidata": 1, "osm": 2}
    ordered = sorted(candidates, key=lambda r: rank.get(r["_source"], 3))
    kept: list[dict] = []
    for rec in ordered:
        merged = False
        for base in kept:
            dist = haversine_m(rec["lat"], rec["lng"], base["lat"], base["lng"])
            if dist > 500:
                continue
            same_name = norm_name(rec["name"]) and norm_name(rec["name"]) == norm_name(base["name"])
            same_op = rec["operator"] and rec["operator"] == base["operator"]
            if same_name or same_op:
                # fill missing fields on the higher-priority record
                for field in SCHEMA_FIELDS:
                    if field == "sources":
                        continue
                    if base.get(field) is None and rec.get(field) is not None:
                        base[field] = rec[field]
                existing_urls = {s["url"] for s in base["sources"]}
                for s in rec["sources"]:
                    if s["url"] not in existing_urls:
                        base["sources"].append(s)
                merged = True
                break
        if not merged:
            kept.append(rec)
    return kept


def validate(records: list[dict]) -> list[str]:
    """Validate records against the schema. Returns a list of problems."""
    problems: list[str] = []
    seen_ids: set[str] = set()
    for rec in records:
        rid = rec.get("id")
        if not rid or rid in seen_ids:
            problems.append(f"duplicate or missing id: {rid}")
        seen_ids.add(rid)
        lat, lng = rec.get("lat"), rec.get("lng")
        if not isinstance(lat, (int, float)) or not (-90 <= lat <= 90):
            problems.append(f"{rid}: invalid lat {lat}")
        if not isinstance(lng, (int, float)) or not (-180 <= lng <= 180):
            problems.append(f"{rid}: invalid lng {lng}")
        if rec.get("tier") not in TIERS:
            problems.append(f"{rid}: invalid tier {rec.get('tier')}")
        if rec.get("status") not in STATUSES:
            problems.append(f"{rid}: invalid status {rec.get('status')}")
        if rec.get("type") not in TYPES:
            problems.append(f"{rid}: invalid type {rec.get('type')}")
        if rec.get("country") and rec["country"] not in COUNTRY_NAMES:
            problems.append(f"{rid}: unknown country code {rec['country']}")
        if not rec.get("sources"):
            problems.append(f"{rid}: no sources")
        if rec.get("power_capacity_mw") is not None and rec["power_capacity_mw"] <= 0:
            problems.append(f"{rid}: non-positive power {rec['power_capacity_mw']}")
        if rec.get("year_opened") is not None and not (1900 <= rec["year_opened"] <= 2035):
            problems.append(f"{rid}: implausible year_opened {rec['year_opened']}")
    return problems


def finalize(records: list[dict]) -> list[dict]:
    """Fill derived fields, classify types, renumber ids, sort."""
    out = []
    for i, rec in enumerate(records):
        rec = {k: v for k, v in rec.items() if not k.startswith("_")}
        if not rec["country"]:
            rec["country"] = infer_country(rec["lat"], rec["lng"])
        if not rec["type"]:
            rec["type"] = classify_type(rec["operator"], "osm")
        if not rec["name"]:
            op = rec["operator"] or "Unknown operator"
            city = rec["city"] or rec["country"] or "unknown location"
            rec["name"] = f"{op} data center ({city})"
        rec["id"] = f"dc-{i:05d}"
        out.append(rec)
    out.sort(key=lambda r: (r["country"] or "ZZ", r["name"]))
    # renumber after sort for stable ids
    for i, rec in enumerate(out):
        rec["id"] = f"dc-{i:05d}"
    return out


def to_geojson(records: list[dict]) -> dict:
    features = []
    for rec in records:
        props = {k: v for k, v in rec.items() if k not in ("lat", "lng")}
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [rec["lng"], rec["lat"]]},
            "properties": props,
        })
    return {"type": "FeatureCollection", "features": features}


def compute_stats(records: list[dict]) -> dict:
    """Precompute global and per-country statistics for the dashboard."""
    countries: dict[str, dict] = {}
    operators: dict[str, int] = {}
    by_type: dict[str, int] = {}
    by_tier: dict[str, int] = {}
    by_year: dict[str, int] = {}
    total_mw = 0.0
    mw_known = 0

    for rec in records:
        c = rec["country"] or "??"
        cs = countries.setdefault(c, {
            "code": c, "name": COUNTRY_NAMES.get(c, "Unknown"),
            "count": 0, "total_power_mw": 0.0, "power_known": 0,
            "by_type": {}, "by_tier": {}, "operators": {},
        })
        cs["count"] += 1
        if rec["power_capacity_mw"]:
            cs["total_power_mw"] += rec["power_capacity_mw"]
            cs["power_known"] += 1
            total_mw += rec["power_capacity_mw"]
            mw_known += 1
        cs["by_type"][rec["type"]] = cs["by_type"].get(rec["type"], 0) + 1
        cs["by_tier"][rec["tier"]] = cs["by_tier"].get(rec["tier"], 0) + 1
        if rec["operator"]:
            cs["operators"][rec["operator"]] = cs["operators"].get(rec["operator"], 0) + 1
            operators[rec["operator"]] = operators.get(rec["operator"], 0) + 1
        by_type[rec["type"]] = by_type.get(rec["type"], 0) + 1
        by_tier[rec["tier"]] = by_tier.get(rec["tier"], 0) + 1
        if rec["year_opened"]:
            y = str(rec["year_opened"])
            by_year[y] = by_year.get(y, 0) + 1

    top_operators = sorted(operators.items(), key=lambda kv: -kv[1])[:20]
    return {
        "generated": datetime.now(timezone.utc).isoformat(),
        "total_sites": len(records),
        "total_countries": len([c for c in countries if c != "??"]),
        "total_power_mw_known": round(total_mw, 1),
        "sites_with_power_data": mw_known,
        "by_type": by_type,
        "by_tier": by_tier,
        "by_year": dict(sorted(by_year.items())),
        "top_operators": [{"operator": k, "count": v} for k, v in top_operators],
        "countries": sorted(countries.values(), key=lambda c: -c["count"]),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", default="data/raw")
    parser.add_argument("--out", default="data/datacenters.json")
    parser.add_argument("--dist-dir", default="data/dist")
    args = parser.parse_args()

    raw_dir = Path(args.raw_dir)
    candidates = load_raw(raw_dir)
    print(f"loaded {len(candidates)} candidate records from raw sources")

    merged = dedupe(candidates)
    print(f"deduplicated to {len(merged)} unique sites")

    records = finalize(merged)
    problems = validate(records)
    if problems:
        for p in problems[:50]:
            print(f"VALIDATION: {p}", file=sys.stderr)
        if len(problems) > 50:
            print(f"VALIDATION: ... and {len(problems) - 50} more", file=sys.stderr)
    else:
        print("validation: all records OK")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(records, ensure_ascii=False, indent=1))

    dist = Path(args.dist_dir)
    dist.mkdir(parents=True, exist_ok=True)
    (dist / "datacenters.geojson").write_text(json.dumps(to_geojson(records), ensure_ascii=False))
    (dist / "stats.json").write_text(json.dumps(compute_stats(records), ensure_ascii=False, indent=1))
    print(f"wrote {out_path} ({len(records)} records)")
    print(f"wrote {dist/'datacenters.geojson'} and {dist/'stats.json'}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
