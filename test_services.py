"""Test script to verify all service modules can be imported."""

import sys
import os

# Add service paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services', 'geocoding'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services', 'collectors'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services', 'mindex_logger'))

def test_geocoding():
    """Test geocoding service."""
    print('Testing geocoding service import...')
    from geocoding_service import GeocodingCache, GeocodingPipeline, NominatimProvider, PhotonProvider
    
    # Test cache initialization
    cache = GeocodingCache('./data/test_geocoding.db')
    print('  - GeocodingCache: OK')
    
    # Clean up
    import os
    if os.path.exists('./data/test_geocoding.db'):
        os.remove('./data/test_geocoding.db')
    
    print('[PASS] Geocoding service OK')
    return True

def test_aviation():
    """Test aviation collector."""
    print('Testing aviation collector import...')
    from aviation_collector import AviationCollector, SQLiteCache, Aircraft
    
    # Test cache
    cache = SQLiteCache('./data/test_aviation.db')
    print('  - SQLiteCache: OK')
    
    # Test dataclass
    aircraft = Aircraft(
        icao24='ABC123',
        callsign='TEST001',
        latitude=33.94,
        longitude=-118.40,
        altitude=10000,
        heading=270,
        velocity=250,
        vertical_rate=0,
        on_ground=False
    )
    cache.upsert_aircraft(aircraft)
    print('  - Aircraft insertion: OK')
    
    result = cache.get_all_aircraft()
    assert len(result) >= 1
    print('  - Aircraft retrieval: OK')
    
    # Clean up
    import os
    if os.path.exists('./data/test_aviation.db'):
        os.remove('./data/test_aviation.db')
    
    print('[PASS] Aviation collector OK')
    return True

def test_maritime():
    """Test maritime collector."""
    print('Testing maritime collector import...')
    from maritime_collector import MaritimeCollector, SQLiteCache, Vessel
    
    # Test cache
    cache = SQLiteCache('./data/test_maritime.db')
    print('  - SQLiteCache: OK')
    
    # Test dataclass
    vessel = Vessel(
        mmsi='123456789',
        name='TEST VESSEL',
        latitude=33.74,
        longitude=-118.27,
        course=180,
        speed=12.5,
        heading=180
    )
    cache.upsert_vessel(vessel)
    print('  - Vessel insertion: OK')
    
    result = cache.get_all_vessels()
    assert len(result) >= 1
    print('  - Vessel retrieval: OK')
    
    # Clean up
    import os
    if os.path.exists('./data/test_maritime.db'):
        os.remove('./data/test_maritime.db')
    
    print('[PASS] Maritime collector OK')
    return True

def test_satellite():
    """Test satellite collector."""
    print('Testing satellite collector import...')
    from satellite_collector import SatelliteCollector, SQLiteCache, Satellite
    
    # Test cache
    cache = SQLiteCache('./data/test_satellite.db')
    print('  - SQLiteCache: OK')
    
    # Test dataclass
    satellite = Satellite(
        norad_id='25544',
        name='ISS (ZARYA)',
        latitude=45.0,
        longitude=-122.0,
        altitude=420,
        velocity=7.66,
        inclination=51.6,
        period=92.9,
        apogee=421,
        perigee=418
    )
    cache.upsert_satellite(satellite)
    print('  - Satellite insertion: OK')
    
    result = cache.get_all_satellites()
    assert len(result) >= 1
    print('  - Satellite retrieval: OK')
    
    # Clean up
    import os
    if os.path.exists('./data/test_satellite.db'):
        os.remove('./data/test_satellite.db')
    
    print('[PASS] Satellite collector OK')
    return True

def test_mindex_logger():
    """Test MINDEX audit logger."""
    print('Testing MINDEX audit logger import...')
    from mindex_audit_logger import MINDEXAuditLogger, LocalAuditStore, EventType, AuditEvent
    
    # Test local store
    store = LocalAuditStore('./data/test_audit.db')
    print('  - LocalAuditStore: OK')
    
    # Test event logging
    event = AuditEvent(
        event_id='test-123',
        event_type=EventType.DATA_COLLECTED.value,
        source='test',
        entity_type='test',
        entity_id='1',
        action='test_action',
        metadata={'test': True},
        timestamp='2026-01-15T10:00:00Z'
    )
    store.log_event(event)
    print('  - Event logging: OK')
    
    # Test query
    events = store.get_events(limit=10)
    assert len(events) >= 1
    print('  - Event query: OK')
    
    # Clean up
    import os
    if os.path.exists('./data/test_audit.db'):
        os.remove('./data/test_audit.db')
    
    print('[PASS] MINDEX audit logger OK')
    return True

def main():
    """Run all tests."""
    print('=' * 50)
    print('Mycosoft Service Module Tests')
    print('=' * 50)
    print()
    
    # Ensure data directory exists
    import os
    os.makedirs('./data', exist_ok=True)
    
    tests = [
        test_geocoding,
        test_aviation,
        test_maritime,
        test_satellite,
        test_mindex_logger
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f'[FAIL] {test.__name__} FAILED: {e}')
            failed += 1
        print()
    
    print('=' * 50)
    print(f'Results: {passed} passed, {failed} failed')
    print('=' * 50)
    
    return failed == 0

if __name__ == '__main__':
    import sys
    success = main()
    sys.exit(0 if success else 1)
