#!/usr/bin/env python3
"""
Check MINDEX Compounds/Genetics Tables - Feb 2026

Directly query MINDEX DB to see if data exists and what schema issues cause 500 errors.
"""

import psycopg2
import sys

# MINDEX DB connection
DB_HOST = "192.168.0.189"
DB_PORT = 5432
DB_NAME = "mindex"
DB_USER = "mycosoft"
DB_PASSWORD = "REDACTED_DB_PASSWORD"

def main():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            connect_timeout=10
        )
        cur = conn.cursor()
        
        # Check bio.compound table
        print("=== bio.compound table check ===")
        cur.execute("SELECT COUNT(*) FROM bio.compound")
        compound_count = cur.fetchone()[0]
        print(f"Total compounds: {compound_count}")
        
        if compound_count > 0:
            cur.execute("SELECT id, name, formula, molecular_weight FROM bio.compound LIMIT 3")
            print("\nSample compounds:")
            for row in cur.fetchall():
                print(f"  - {row[1]} ({row[2]}) MW={row[3]}")
        
        # Check bio.genetic_sequence table
        print("\n=== bio.genetic_sequence table check ===")
        cur.execute("SELECT COUNT(*) FROM bio.genetic_sequence")
        sequence_count = cur.fetchone()[0]
        print(f"Total sequences: {sequence_count}")
        
        if sequence_count > 0:
            cur.execute("SELECT id, accession, species_name, gene, sequence_length FROM bio.genetic_sequence LIMIT 3")
            print("\nSample sequences:")
            for row in cur.fetchall():
                print(f"  - {row[1]} {row[2]} gene={row[3]} len={row[4]}")
        
        # Test compound search query (same as router)
        print("\n=== Test compound search (router query) ===")
        search_query = "psilocybin"
        cur.execute("""
            SELECT 
                c.id, c.name, c.formula, c.molecular_weight, c.chemical_class, c.smiles
            FROM bio.compound c
            WHERE c.name ILIKE %s OR c.formula ILIKE %s
            ORDER BY c.name
            LIMIT 3
        """, (f"%{search_query}%", f"%{search_query}%"))
        
        rows = cur.fetchall()
        if rows:
            print(f"Found {len(rows)} compounds matching '{search_query}':")
            for row in rows:
                print(f"  - {row[1]} ({row[2]})")
        else:
            print(f"No compounds found matching '{search_query}'")
        
        # Test genetics search query
        print("\n=== Test genetics search (router query) ===")
        search_query = "amanita"
        cur.execute("""
            SELECT 
                id, accession, species_name, gene, sequence_length, source
            FROM bio.genetic_sequence
            WHERE species_name ILIKE %s OR accession ILIKE %s OR gene ILIKE %s
            ORDER BY species_name
            LIMIT 3
        """, (f"%{search_query}%", f"%{search_query}%", f"%{search_query}%"))
        
        rows = cur.fetchall()
        if rows:
            print(f"Found {len(rows)} sequences matching '{search_query}':")
            for row in rows:
                print(f"  - {row[1]} {row[2]} gene={row[3]}")
        else:
            print(f"No sequences found matching '{search_query}'")
        
        cur.close()
        conn.close()
        
        print("\n✅ Database connection and schema OK")
        return 0
        
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
