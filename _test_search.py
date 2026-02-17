#!/usr/bin/env python3
"""Quick test of unified search API"""
import requests

try:
    r = requests.get(
        "http://localhost:3010/api/search/unified",
        params={"q": "Amanita", "limit": 5},
        timeout=30
    )
    d = r.json()
    print(f"Status: {r.status_code}")
    print(f"Species: {len(d.get('species', []))}")
    print(f"Compounds: {len(d.get('compounds', []))}")
    print(f"Genetics: {len(d.get('genetics', []))}")
    print(f"Research: {len(d.get('research', []))}")
    print(f"Live Results: {len(d.get('live_results', []))}")
    
    if d.get('compounds'):
        print("\nCompound sample:", d['compounds'][0].get('name', 'N/A'))
    else:
        print("\nNo compounds found in response")
        
except Exception as e:
    print(f"Error: {e}")
