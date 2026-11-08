#!/usr/bin/env python3
"""Replace the 'region' of catalogue records with a real administrative area, derived from the coordinates.

Catalogue sources usually put the nearest TOWN in `region` ("Newquay", "Mundaka"). Filters and "N spots" suggestions
need an AREA ("Cornwall", "Basque Country"). This reads GeoNames offline (the `reverse_geocoder` package), so it
needs no network and no API key.

    pip install reverse_geocoder          # pulls numpy + scipy
    python3 scripts/catalog/assign_regions.py in.json out.json

Input/output: a JSON array of records with name, lat, lon|lng, country, region (the same file the importer takes).
Only `region` changes. Import the result with the importer's --update flag to rewrite regions of rows that
already exist (matched by their source id), or without it for a new batch.

Rules
- Level: GeoNames admin1 (state / province / prefecture / autonomous community). For the countries in
  ADMIN2_COUNTRIES admin1 is too coarse (the UK has four), so admin2 (county / province) is used instead.
- If admin1 is empty, admin2 is tried; for the admin2 countries there is no fallback. If nothing fits, the
  original region is kept.
- Border cases: if the nearest place is in a different country than most of the batch's spots for that
  country, the original region is kept (the nearest town may be across the border).
- A few cosmetic prefixes are removed ("Province of ", "County " for Ireland, " Sheng").
"""
import json
import re
import sys
from collections import Counter

import reverse_geocoder as rg

ADMIN2_COUNTRIES = {"United Kingdom", "Ireland", "Philippines"}

# GeoNames gives Irish counties in Irish; Fingal is the north of County Dublin.
NAME_FIXES = {
    "Maigh Eo": "Mayo", "Ciarrai": "Kerry", "An Clar": "Clare", "Lu": "Louth",
    "Loch Garman": "Wexford", "Fingal County": "Dublin",
}


def clean(country: str, name: str) -> str:
    name = re.sub(r"^Province of ", "", name)
    name = re.sub(r" Sheng$", "", name)
    if country == "Ireland":
        name = re.sub(r"^County ", "", name)
    return NAME_FIXES.get(name.strip(), name.strip())


def assign(records):
    geo = rg.search([(float(r["lat"]), float(r.get("lon", r.get("lng")))) for r in records], mode=1)
    # The country code most spots of each stated country resolve to; others are border cases.
    votes = {}
    for r, g in zip(records, geo):
        votes.setdefault(r.get("country") or "", Counter())[g["cc"]] += 1
    expected = {c: v.most_common(1)[0][0] for c, v in votes.items()}

    out, kept_original, changed = [], 0, 0
    for r, g in zip(records, geo):
        country = r.get("country") or ""
        # admin2 countries do NOT fall back to admin1: a province next to counties would mix granularities.
        order = ("admin2",) if country in ADMIN2_COUNTRIES else ("admin1", "admin2")
        value = ""
        if g["cc"] == expected.get(country):
            value = next((clean(country, g[k]) for k in order if g[k]), "")
            if country == "Maldives" and g["admin1"] == "Maale":
                # GeoNames lumps the whole Malé area into one region. Our hand-curated breaks (and tourists)
                # distinguish the two atolls, with Malé city (~4.17 N) roughly in the middle.
                value = "South Malé Atoll" if float(r["lat"]) < 4.1 else "North Malé Atoll"
        new = dict(r)
        if value:
            changed += value != r.get("region")
            new["region"] = value
        else:
            kept_original += 1
        out.append(new)
    return out, changed, kept_original


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    records = json.load(open(sys.argv[1], encoding="utf-8"))
    out, changed, kept = assign(records)
    json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    sizes = Counter((r["country"], r["region"]) for r in out)
    tiny = sum(v for v in sizes.values() if v <= 2)
    print(f"{len(out)} records | region changed {changed} | original kept {kept}")
    print(f"distinct regions {len(sizes)} | records in regions with <= 2 spots: {tiny} ({round(100 * tiny / len(out))}%)")


if __name__ == "__main__":
    main()
