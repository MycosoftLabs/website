#!/usr/bin/env python3
"""Test MINDEX unified search API directly"""
import requests

try:
    # Test MINDEX directly
    r = requests.get(
        "http://192.168.0.189:8000/api/mindex/unified-search",
        params={"q": "Amanita", "limit": 5},
        timeout=30
    )
    d = r.json()
    print(f"MINDEX Status: {r.status_code}")
    print(f"Taxa: {len(d.get('taxa', []))}")
    print(f"Compounds: {len(d.get('compounds', []))}")
    print(f"Genetics: {len(d.get('genetics', []))}")
    
    if d.get('taxa'):
        print(f"\nTaxa sample: {d['taxa'][0]}")
    if d.get('compounds'):
        print(f"\nCompound sample: {d['compounds'][0]}")
    if d.get('genetics'):
        print(f"\nGenetics sample: {d['genetics'][0]}")
        
except Exception as e:
    print(f"Error: {e}")
