# In-App Detail Pattern – Keep Users in Search (Feb 10, 2026)

## Goal

All search result widgets (genetics, chemistry, research, species, taxonomy, media, news) should keep the user on the search page. Clicking a result or a “source” link (e.g. GenBank, PubMed, ChemSpider) must **not** navigate away. Instead:

1. **Expand in-widget detail** – Open a wider or expanded detail view inside the same widget.
2. **Data in MINDEX** – If the full record is not yet in MINDEX, an automated service fetches it from the external source, stores it in MINDEX, then returns it.
3. **Detail from MINDEX** – The widget displays the full record from MINDEX so the next time any user requests it, it loads quickly from the database.

## Implemented: Genetics (GenBank)

- **Widget:** Genetics widget “View details” opens an in-widget detail panel (no external GenBank link in the list).
- **Backend:** MINDEX `POST /api/genetics/ingest-accession` fetches a single GenBank record by accession from NCBI, inserts into `bio.genetic_sequence`, returns the record.
- **Website API:** `GET /api/mindex/genetics/detail?accession=...` or `?id=...` returns full record; if missing, calls MINDEX ingest then returns.
- **UX:** User clicks “View details” → genetics widget expands/focuses and shows detail panel → data loaded from MINDEX (or ingested on first request). “Open in GenBank” remains only in the detail panel as a secondary link.

## Pattern to Apply Elsewhere

| Widget / Source | External link to replace | MINDEX store | Ingest trigger |
|-----------------|--------------------------|--------------|----------------|
| Chemistry       | ChemSpider / PubChem     | compounds    | On-demand by ID/identifier |
| Research        | PubMed / DOI             | research / papers | On-demand by DOI/PMID |
| Species         | iNaturalist / GBIF       | taxa / observations | On-demand by taxon/obs ID |
| Media           | External media URLs      | media blob or metadata | On-demand or pre-cache |
| News            | Article URL              | news cache   | On-demand or pre-cache |

For each:

1. **No external link in list view** – Use “View details” (or card click) that opens in-widget detail.
2. **Detail API** – Website route that returns full record from MINDEX; if 404, call MINDEX (or ETL) to ingest by ID/accession/DOI, then return.
3. **Widget detail panel** – Same pattern as genetics: focused item → fetch detail → show in expanded panel; optional “Open in [source]” only in detail.

## Reference

- Genetics implementation: `components/search/fluid/widgets/GeneticsWidget.tsx`, `app/api/mindex/genetics/detail/route.ts`, MINDEX `routers/genetics.py` (ingest-accession), `mindex_etl/sources/genbank.py` (fetch_record_by_accession).
