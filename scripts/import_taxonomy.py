"""Read the supplied workbook without modifying it; preserve source IDs and provenance."""
import sys, json, re, hashlib
from pathlib import Path
import openpyxl

source = Path(sys.argv[1])
workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
def records(name):
    rows = list(workbook[name].values)
    return [dict(zip(rows[0], row)) for row in rows[1:] if row[0]]
def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower().replace("&", "and")).strip("-")
def split(value):
    return [x.strip() for x in (value or "").split(";") if x.strip()]

categories = [{"id": r["Category ID"], "name": r["Primary Category"], "slug": slug(r["Primary Category"]), "description": r["Definition"], "subcategories": [{"id": r["Category ID"] + "-" + str(i+1).zfill(2), "name": n, "slug": slug(n)} for i,n in enumerate(split(r["Recommended Subcategories"]))]} for r in records("Categories")]
industries = [{"id": r["Vertical ID"], "name": r["Vertical"], "slug": slug(r["Vertical"]), "description": r["Who It Includes"], "needs": split(r["Common AI Needs"]), "categoryIds": split(r["Best-Fit Categories"]), "priority": r["MVP Priority"]} for r in records("Verticals")]
use_cases = [{"id": r["Use Case ID"], "name": r["Use Case"], "slug": slug(r["Use Case"]), "audience": r["Vertical/Audience"], "description": r["User Intent / Job To Be Done"], "listingTypeIds": split(r["Relevant Listing Types"]), "priority": r["MVP Priority"]} for r in records("Use Cases")]
listing_types = [{"id":r["Listing Type ID"],"name":r["Listing Type"],"description":r["Definition"],"priority":r["MVP Priority"]} for r in records("Listing Types")]
result = {"source": source.name, "sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "sourceVersion": "v1 (provided workbook)", "categories":categories,"industries":industries,"useCases":use_cases,"listingTypes":listing_types}
for group in [categories, industries, use_cases, listing_types]:
    assert len({r["id"] for r in group}) == len(group), "Duplicate source IDs"
for group in [categories, industries, use_cases]:
    assert len({r["slug"] for r in group}) == len(group), "Duplicate generated slugs"
target = Path(__file__).resolve().parents[1] / "src/data/taxonomy.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print(json.dumps({"categories":len(categories),"subcategories":sum(len(c["subcategories"]) for c in categories),"industries":len(industries),"useCases":len(use_cases),"listingTypes":len(listing_types)}))
