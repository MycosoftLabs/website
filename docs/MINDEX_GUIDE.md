# MINDEX Integration Guide

## Overview

MINDEX (Mycological Index) is Mycosoft's comprehensive fungal database. It provides:
- Fungal observation data with GPS
- Species taxonomy
- Geocoding for observations without GPS

## Geocoding Pipeline

The service enriches observations lacking GPS:
1. Fetch observations where has_gps=false
2. Build query from location_name, region, country
3. Geocode via Nominatim then Photon
4. Cache results in Redis + SQLite
5. Update observation with GPS

## API Endpoints

- GET /api/v1/observations - List observations
- GET /api/v1/species - List species  
- POST /api/v1/audit/events - Log audit event

## Running

```bash
python services/geocoding/geocoding_service.py
```

## Related Docs

- [CREP System](./CREP_SYSTEM.md)
- [NatureOS](./NATUREOS_SYSTEM.md)
