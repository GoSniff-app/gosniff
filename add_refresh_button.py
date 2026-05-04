#!/usr/bin/env python3
"""Add Refresh My Location button to MapView.js"""

import sys

filepath = 'src/components/MapView.js'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Add refreshingLocation state after detectingLocation state
old1 = "const [detectingLocation, setDetectingLocation] = useState(false);"
new1 = """const [detectingLocation, setDetectingLocation] = useState(false);
  const [refreshingLocation, setRefreshingLocation] = useState(false);"""

if old1 not in content:
    print("ERROR: Could not find detectingLocation state line")
    sys.exit(1)
content = content.replace(old1, new1)

# 2. Replace onMapLoad with mapRef + onMapLoad + handleRefreshLocation
old2 = "  const onMapLoad = useCallback((mapInstance) => setMap(mapInstance), []);"
new2 = """  const mapRef = useRef(null);

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
    mapRef.current = mapInstance;
  }, []);

  function handleRefreshLocation() {
    if (!navigator.geolocation || refreshingLocation) return;
    setRefreshingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoords(coords);
        setCenter(coords);
        setHasLocation(true);
        setLocationError(null);
        const m = mapRef.current || map;
        if (m) {
          m.panTo(coords);
          m.setZoom(15);
        }
        setTimeout(() => setRefreshingLocation(false), 800);
      },
      (err) => {
        setRefreshingLocation(false);
        alert('Could not get your location. Make sure location services are enabled.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }"""

if old2 not in content:
    print("ERROR: Could not find onMapLoad line")
    sys.exit(1)
content = content.replace(old2, new2)

# 3. Replace the We are Here button with combined row
old3 = """        {!myDog?.checkedIn && !showCheckInPanel && (
          <button className="btn-primary w-full text-lg bounce-in" onClick={handleOpenCheckIn}
            style={{ pointerEvents: 'auto', padding: '18px', fontSize: '1.1rem', borderRadius: '18px' }}>
            We are Here!
          </button>
        )}"""
new3 = """        {!myDog?.checkedIn && !showCheckInPanel && (
          <div className="flex gap-3 bounce-in" style={{ pointerEvents: 'auto' }}>
            <button className="btn-primary text-lg" onClick={handleOpenCheckIn}
              style={{ flex: 1, padding: '18px', fontSize: '1.1rem', borderRadius: '18px' }}>
              We are Here!
            </button>
            <button
              onClick={handleRefreshLocation}
              disabled={refreshingLocation}
              title="Refresh My Location"
              style={{
                padding: '14px',
                borderRadius: '18px',
                background: refreshingLocation ? 'var(--gs-teal-light)' : '#ffffff',
                border: '1.5px solid var(--gs-gray-200)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: refreshingLocation ? 'wait' : 'pointer',
                flexShrink: 0,
              }}
            >
              <svg
                width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                style={{ animation: refreshingLocation ? 'pulse-logo 1s ease-in-out infinite' : 'none' }}
              >
                <circle cx="12" cy="12" r="3" stroke="var(--gs-teal)" strokeWidth="2" />
                <circle cx="12" cy="12" r="8" stroke="var(--gs-teal)" strokeWidth="1.5" fill="none" />
                <line x1="12" y1="0" x2="12" y2="4" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="20" x2="12" y2="24" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="0" y1="12" x2="4" y2="12" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="20" y1="12" x2="24" y2="12" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}"""

if old3 not in content:
    print("ERROR: Could not find We are Here button block")
    sys.exit(1)
content = content.replace(old3, new3)

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS! All 3 changes applied to MapView.js")
print("  1. Added refreshingLocation state")
print("  2. Added mapRef + handleRefreshLocation function")
print("  3. Added refresh button next to We are Here")
