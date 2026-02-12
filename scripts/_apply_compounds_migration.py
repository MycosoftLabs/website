#!/usr/bin/env python3
"""Apply compounds migration to MINDEX DB."""
import psycopg2
import sys

DB_HOST = "192.168.0.189"
DB_PORT = 5432
DB_NAME = "mindex"
DB_USER = "mycosoft"
DB_PASSWORD = "REDACTED_DB_PASSWORD"

MIGRATION_SQL = """
-- Migration: 0007_compounds.sql (applying directly)

BEGIN;

-- Ensure pg_trgm extension is enabled for trigram indexing
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Main compound table
CREATE TABLE IF NOT EXISTS bio.compound (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    iupac_name text,
    formula text,
    smiles text,
    inchi text,
    inchikey text UNIQUE,
    molecular_weight double precision,
    monoisotopic_mass double precision,
    average_mass double precision,
    chemspider_id integer UNIQUE,
    pubchem_id integer,
    cas_number text,
    chebi_id text,
    chemical_class text,
    compound_type text,
    source text NOT NULL DEFAULT 'chemspider',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compound_name ON bio.compound (name);
CREATE INDEX IF NOT EXISTS idx_compound_formula ON bio.compound (formula);
CREATE INDEX IF NOT EXISTS idx_compound_smiles ON bio.compound (smiles);
CREATE INDEX IF NOT EXISTS idx_compound_chemspider_id ON bio.compound (chemspider_id);
CREATE INDEX IF NOT EXISTS idx_compound_pubchem_id ON bio.compound (pubchem_id);
CREATE INDEX IF NOT EXISTS idx_compound_chemical_class ON bio.compound (chemical_class);
CREATE INDEX IF NOT EXISTS idx_compound_type ON bio.compound (compound_type);
CREATE INDEX IF NOT EXISTS idx_compound_name_trgm ON bio.compound USING gin (name gin_trgm_ops);

-- Taxon-compound relationship
CREATE TABLE IF NOT EXISTS bio.taxon_compound (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    taxon_id uuid NOT NULL REFERENCES core.taxon (id) ON DELETE CASCADE,
    compound_id uuid NOT NULL REFERENCES bio.compound (id) ON DELETE CASCADE,
    relationship_type text DEFAULT 'produces',
    evidence_level text DEFAULT 'reported',
    concentration_min double precision,
    concentration_max double precision,
    concentration_unit text,
    tissue_location text,
    source text,
    source_url text,
    doi text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (taxon_id, compound_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_taxon_compound_taxon ON bio.taxon_compound (taxon_id);
CREATE INDEX IF NOT EXISTS idx_taxon_compound_compound ON bio.taxon_compound (compound_id);
CREATE INDEX IF NOT EXISTS idx_taxon_compound_type ON bio.taxon_compound (relationship_type);

-- Biological activities
CREATE TABLE IF NOT EXISTS bio.biological_activity (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    category text,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO bio.biological_activity (name, category, description) VALUES
    ('Antibacterial', 'antimicrobial', 'Activity against bacteria'),
    ('Antifungal', 'antimicrobial', 'Activity against fungi'),
    ('Anticancer', 'oncology', 'Anticancer or cytotoxic activity'),
    ('Neuroprotective', 'neurology', 'Protects neurons from damage'),
    ('Psychoactive', 'neurology', 'Affects mental processes'),
    ('Antioxidant', 'general', 'Reduces oxidative stress')
ON CONFLICT (name) DO NOTHING;

-- Compound-activity relationship
CREATE TABLE IF NOT EXISTS bio.compound_activity (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    compound_id uuid NOT NULL REFERENCES bio.compound (id) ON DELETE CASCADE,
    activity_id uuid NOT NULL REFERENCES bio.biological_activity (id) ON DELETE CASCADE,
    potency text,
    mechanism text,
    target text,
    evidence_level text DEFAULT 'reported',
    source text,
    doi text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (compound_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_compound_activity_compound ON bio.compound_activity (compound_id);
CREATE INDEX IF NOT EXISTS idx_compound_activity_activity ON bio.compound_activity (activity_id);

COMMIT;
"""

def main():
    try:
        print(f"[*] Connecting to MINDEX DB at {DB_HOST}...")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            connect_timeout=15
        )
        
        print("[*] Applying compounds migration...")
        cur = conn.cursor()
        cur.execute(MIGRATION_SQL)
        conn.commit()
        
        # Verify
        print("[*] Verifying tables...")
        cur.execute("SELECT COUNT(*) FROM bio.compound")
        compound_count = cur.fetchone()[0]
        print(f"[+] bio.compound table exists (rows: {compound_count})")
        
        cur.execute("SELECT COUNT(*) FROM bio.genetic_sequence")
        genetics_count = cur.fetchone()[0]
        print(f"[+] bio.genetic_sequence table exists (rows: {genetics_count})")
        
        cur.close()
        conn.close()
        
        print("[+] Migrations applied successfully")
        return 0
        
    except Exception as e:
        print(f"[!] Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
