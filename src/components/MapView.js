'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, OverlayViewF, OverlayView } from '@react-google-maps/api';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import PawLogo from './PawLogo';
import EditProfile from './EditProfile';

const mapStyles = [
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#c8e6c9' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#2D6A4F' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#b3d9f2' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const AUTO_CHECKOUT_MS = 90 * 60 * 1000;

async function reverseGeocode(lat, lng) {
  try {
    const geocoder = new window.google.maps.Geocoder();
    const response = await geocoder.geocode({ location: { lat, lng } });
    if (response.results && response.results.length > 0) {
      const parkResult = response.results.find((r) =>
        r.types.some((t) => ['park', 'point_of_interest', 'natural_feature', 'campground', 'tourist_attraction'].includes(t))
      );
      if (parkResult) return parkResult.formatted_address.split(',')[0];
      const streetResult = response.results.find((r) =>
        r.types.some((t) => ['street_address', 'route', 'premise'].includes(t))
      );
      const neighborhoodResult = response.results.find((r) =>
        r.types.some((t) => ['neighborhood', 'sublocality', 'sublocality_level_1'].includes(t))
      );
      const localityResult = response.results.find((r) =>
        r.types.includes('locality')
      );
      const areaName = neighborhoodResult
        ? neighborhoodResult.formatted_address.split(',')[0]
        : localityResult
          ? localityResult.formatted_address.split(',')[0]
          : '';
      if (streetResult) {
        const addressParts = streetResult.formatted_address.split(',');
        const streetName = addressParts[0].replace(/^\d+\s*/, '').trim();
        const cityFromAddress = addressParts.length >= 2 ? addressParts[1].trim() : '';
        const area = areaName || cityFromAddress;
        return area ? streetName + ', ' + area : streetName;
      }
      if (areaName) return areaName;
      const parts = response.results[0].formatted_address.split(',');
      return parts.length >= 2 ? parts[parts.length - 2].trim() : parts[0];
    }
  } catch (err) {
    console.error('Reverse geocoding failed:', err);
  }
  return '';
}

export default function MapView() {
  const { user, dogs, checkIn, checkOut, signOut, updateDog } = useAuth();
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(defaultCenter);
  const [nearbyDogs, setNearbyDogs] = useState([]);
  const [selectedDog, setSelectedDog] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [showCheckInPanel, setShowCheckInPanel] = useState(false);
  const autoCheckoutRef = useRef(null);
  const myDog = dogs[0];

  const [hasLocation, setHasLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [refreshingLocation, setRefreshingLocation] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location services.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(coords);
        setGpsCoords(coords);
        setHasLocation(true);
        setLocationError(null);
      },
      (err) => {
        if (err.code === 1) {
          setLocationError('Location access was denied. To check in, please enable location services in your browser settings and reload the page.');
        } else {
          setLocationError('Could not determine your location. Make sure location services are enabled and try again.');
        }
        setHasLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'dogs'), where('checkedIn', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      const dogsOnMap = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((d) => d.checkedInLocation);
      setNearbyDogs(dogsOnMap);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (myDog?.checkedIn && myDog?.checkedInTime) {
      const checkedInAt = myDog.checkedInTime.toDate ? myDog.checkedInTime.toDate().getTime() : Date.now();
      const remaining = AUTO_CHECKOUT_MS - (Date.now() - checkedInAt);
      if (remaining <= 0) { checkOut(myDog.id); }
      else { autoCheckoutRef.current = setTimeout(() => checkOut(myDog.id), remaining); }
    }
    return () => { if (autoCheckoutRef.current) clearTimeout(autoCheckoutRef.current); };
  }, [myDog?.checkedIn, myDog?.checkedInTime]);

  const mapRef = useRef(null);

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
  }

  async function handleOpenCheckIn() {
    setLocationError(null);
    setDetectingLocation(true);
    setShowCheckInPanel(true);
    setLocationName('');
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location services.');
      setDetectingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoords(coords);
        setCenter(coords);
        setHasLocation(true);
        setLocationError(null);
        if (window.google && window.google.maps) {
          const placeName = await reverseGeocode(coords.lat, coords.lng);
          if (placeName) setLocationName(placeName);
        }
        setDetectingLocation(false);
      },
      (err) => {
        if (err.code === 1) {
          setLocationError('Location access was denied. To check in, please enable location services in your browser settings and reload the page.');
        } else {
          setLocationError('Could not determine your location. Make sure location services are enabled and try again.');
        }
        setHasLocation(false);
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleCheckIn() {
    if (!locationName.trim() || !hasLocation || !gpsCoords) return;
    setCheckingIn(true);
    try {
      await checkIn(myDog.id, locationName.trim(), gpsCoords.lat, gpsCoords.lng);
      setShowCheckInPanel(false);
      setLocationName('');
    } catch (err) { console.error('Check-in failed:', err); }
    setCheckingIn(false);
  }

  async function handleCheckOut() {
    try { await checkOut(myDog.id); }
    catch (err) { console.error('Check-out failed:', err); }
  }

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'var(--gs-bg)' }}>
        <div className="text-center fade-in">
          <PawLogo size={60} className="mx-auto mb-3" animate />
          <p style={{ color: 'var(--gs-green)', fontWeight: 600 }}>Loading map...</p>
        </div>
      </div>
    );
  }

  if (locationError && !hasLocation) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--gs-bg)' }}>
        <div className="text-center fade-in max-w-sm">
          <PawLogo size={72} className="mx-auto mb-4" animate />
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>GoSniff needs your location</h1>
          <p className="mb-6" style={{ color: 'var(--gs-text-light)', lineHeight: 1.6 }}>
            GoSniff uses your location to show you nearby dogs and let you check in at parks. Without it, we cannot place you on the map.
          </p>
          <div className="gs-card mb-6 text-left" style={{ background: 'var(--gs-cream)' }}>
            <p className="font-semibold text-sm mb-2" style={{ color: 'var(--gs-forest)' }}>How to enable location:</p>
            <p className="text-sm mb-2" style={{ color: 'var(--gs-text-light)', lineHeight: 1.6 }}>
              <strong>iPhone:</strong> Go to Settings &gt; Privacy &amp; Security &gt; Location Services &gt; turn on for your browser (Safari or Chrome). Set to "While Using."
            </p>
            <p className="text-sm" style={{ color: 'var(--gs-text-light)', lineHeight: 1.6 }}>
              <strong>Android:</strong> Go to Settings &gt; Location &gt; make sure it is on. Then open your browser settings and allow location access.
            </p>
          </div>
          <button className="btn-primary w-full text-lg" onClick={() => window.location.reload()}>
            I have enabled location, reload
          </button>
          <button className="btn-secondary w-full mt-3" onClick={() => { setLocationError(null); }}>
            Browse without checking in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={14} onLoad={onMapLoad}
        options={{ styles: mapStyles, disableDefaultUI: true, zoomControl: true, zoomControlOptions: { position: 6 }, clickableIcons: false }}>
        {nearbyDogs.map((dog) => (
          <OverlayViewF key={dog.id} position={dog.checkedInLocation} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div className="dog-pin bounce-in" onClick={() => setSelectedDog(dog)} title={dog.name + ' at ' + dog.checkedInAt}
              style={{ border: dog.id === myDog?.id ? '3px solid var(--gs-warm)' : '3px solid var(--gs-green)' }}>
              {dog.photoURL ? (<img src={dog.photoURL} alt={dog.name} />) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--gs-cream)' }}>
                  <PawLogo size={24} />
                </div>
              )}
            </div>
          </OverlayViewF>
        ))}
      </GoogleMap>

      {/* HEADER BAR */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.95)',
        zIndex: 9999,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PawLogo size={32} />
          <span style={{ fontFamily: "'Fredoka', sans-serif", color: '#1a1a1a', fontSize: '1.25rem', fontWeight: 700 }}>GoSniff</span>
        </div>
        <button onClick={() => setShowMenu(!showMenu)} style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          background: '#ffffff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #e5e5e5',
          cursor: 'pointer',
        }}>
          <span style={{ display: 'block', width: '18px', height: '2px', background: '#1a1a1a', borderRadius: '1px' }} />
          <span style={{ display: 'block', width: '18px', height: '2px', background: '#1a1a1a', borderRadius: '1px' }} />
          <span style={{ display: 'block', width: '18px', height: '2px', background: '#1a1a1a', borderRadius: '1px' }} />
        </button>
      </div>

      {/* DROPDOWN MENU */}
      {showMenu && (
        <div className="gs-card fade-in" style={{ position: 'fixed', top: '60px', right: '16px', zIndex: 10000, minWidth: '220px' }}>
          {/* Dog profile header */}
          <div className="flex items-center gap-3 mb-3 pb-3" style={{ borderBottom: '1px solid var(--gs-gray-200, #e5e5e5)' }}>
            <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: '2px solid var(--gs-green)' }}>
              {myDog?.photoURL ? (<img src={myDog.photoURL} alt={myDog.name} className="w-full h-full object-cover" />) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--gs-cream)' }}><PawLogo size={16} /></div>
              )}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--gs-forest)' }}>{myDog?.name}</p>
              <p className="text-xs" style={{ color: 'var(--gs-text-light)' }}>{myDog?.breed}</p>
            </div>
          </div>
          {/* Menu items */}
          {/* FIX: stopPropagation prevents backdrop click, 50ms delay lets menu unmount before modal renders */}
          <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); setTimeout(() => setShowEditProfile(true), 50); }}
            className="w-full text-left text-sm font-semibold py-2.5 px-1 flex items-center gap-2"
            style={{ color: 'var(--gs-forest)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Edit Profile
          </button>
          <button onClick={() => { signOut(); setShowMenu(false); }}
            className="w-full text-left text-sm font-semibold py-2.5 px-1 flex items-center gap-2"
            style={{ color: 'var(--gs-coral)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6M10.5 11.5L14 8M14 8L10.5 4.5M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}

      {/* FIX: Wrapper div at z-index 10001 ensures EditProfile renders above everything */}
      {showEditProfile && myDog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001 }}>
          <EditProfile dog={myDog} onClose={() => setShowEditProfile(false)} />
        </div>
      )}

      {/* BOTTOM PANEL */}
      <div className="fixed bottom-0 left-0 right-0 p-4" style={{ pointerEvents: 'none', zIndex: 9999 }}>
        {myDog?.checkedIn && (
          <div className="gs-card mb-3 flex items-center justify-between fade-in" style={{ pointerEvents: 'auto' }}>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--gs-forest)' }}>{myDog.name} is at {myDog.checkedInAt}</p>
              <p className="text-xs" style={{ color: 'var(--gs-text-light)' }}>Checked in — visible to nearby dogs</p>
            </div>
            <button onClick={handleCheckOut} className="btn-secondary text-sm" style={{ padding: '8px 16px' }}>Leave</button>
          </div>
        )}

        {showCheckInPanel && !myDog?.checkedIn && (
          <div className="gs-card mb-3 slide-up" style={{ pointerEvents: 'auto' }}>
            {locationError && (
              <div className="mb-3 p-3 rounded-lg" style={{ background: 'var(--gs-cream)', border: '1px solid var(--gs-warm)' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--gs-coral)' }}>Location needed</p>
                <p className="text-xs" style={{ color: 'var(--gs-text-light)', lineHeight: 1.5 }}>{locationError}</p>
              </div>
            )}
            {detectingLocation && !locationError && (
              <div className="mb-3 text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--gs-green)' }}>Sniffing out your location...</p>
              </div>
            )}
            {hasLocation && !detectingLocation && !locationError && (
              <>
                <h3 className="font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>
                  {locationName ? 'Looks like you are at:' : 'Where are you?'}
                </h3>
                <input
                  type="text"
                  className="gs-input mb-3"
                  placeholder="e.g. Dolores Park, Ocean Beach..."
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
                />
                <p className="text-xs mb-3" style={{ color: 'var(--gs-text-light)' }}>
                  Edit the name above if it does not look right.
                </p>
              </>
            )}
            <div className="flex gap-2">
              <button className="btn-secondary flex-1 text-sm" onClick={() => { setShowCheckInPanel(false); setLocationName(''); setLocationError(null); }}>Cancel</button>
              <button
                className="btn-primary flex-1 text-sm"
                disabled={!locationName.trim() || checkingIn || !hasLocation || detectingLocation}
                onClick={handleCheckIn}
              >
                {checkingIn ? 'Checking in...' : 'Check In'}
              </button>
            </div>
          </div>
        )}

        {!myDog?.checkedIn && !showCheckInPanel && (
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
        )}
      </div>

      {/* DOG PROFILE SHEET */}
      {selectedDog && (
        <div className="absolute inset-0 z-40 flex items-end" onClick={() => setSelectedDog(null)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
          <div className="relative w-full gs-card slide-up" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '60vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedDog(null)} className="absolute top-3 right-4 text-2xl" style={{ color: 'var(--gs-text-light)' }}>×</button>
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0" style={{ border: '3px solid var(--gs-green)' }}>
                {selectedDog.photoURL ? (<img src={selectedDog.photoURL} alt={selectedDog.name} className="w-full h-full object-cover" />) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--gs-cream)' }}><PawLogo size={32} /></div>
                )}
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-xl font-bold" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>{selectedDog.name}</h3>
                <p className="text-sm" style={{ color: 'var(--gs-text-light)' }}>{selectedDog.breed} · {selectedDog.gender} · {selectedDog.age || 'Age unknown'}</p>
                {selectedDog.checkedInAt && (<p className="text-sm font-semibold mt-1" style={{ color: 'var(--gs-green)' }}>At {selectedDog.checkedInAt}</p>)}
              </div>
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              <span className="gs-chip selected" style={{ cursor: 'default' }}>{selectedDog.size || 'Size?'}</span>
              {(Array.isArray(selectedDog.energy) ? selectedDog.energy : [selectedDog.energy].filter(Boolean)).map((e) => (
                <span key={e} className="gs-chip selected" style={{ cursor: 'default' }}>{e}</span>
              ))}
              {!selectedDog.energy || (Array.isArray(selectedDog.energy) && selectedDog.energy.length === 0) ? (
                <span className="gs-chip selected" style={{ cursor: 'default' }}>Personality?</span>
              ) : null}
            </div>
            {selectedDog.id !== myDog?.id && (
              <button className="btn-primary w-full mt-4" onClick={() => alert('Messaging coming soon!')}>Say Hi to {selectedDog.name}</button>
            )}
          </div>
        </div>
      )}

      {showMenu && (<div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setShowMenu(false)} />)}
    </div>
  );
}
