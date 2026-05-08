'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, OverlayViewF, OverlayView } from '@react-google-maps/api';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { usePack } from '@/lib/pack-context';
import PawLogo from './PawLogo';
import EditProfile from './EditProfile';
import MyPackList from './MyPackList';

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
const AUTO_CHECKOUT_MS = 60 * 60 * 1000;

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
  const { pendingReceived, myPack, getPackRequestStatus, sendPackRequest, acceptPackRequest, declinePackRequest, removeFromPack } = usePack();
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(defaultCenter);
  const [nearbyDogs, setNearbyDogs] = useState([]);
  const [selectedDog, setSelectedDog] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showMyPack, setShowMyPack] = useState(false);
  const [packActionLoading, setPackActionLoading] = useState(null);
  const [confirmRemoveFromSheet, setConfirmRemoveFromSheet] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [showCheckInPanel, setShowCheckInPanel] = useState(false);
  const [checkInVisibility, setCheckInVisibility] = useState('everyone');
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

  // Reset pack button state whenever the user opens a different dog's profile sheet.
  useEffect(() => {
    setPackActionLoading(null);
    setConfirmRemoveFromSheet(false);
  }, [selectedDog?.id]);

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
      await checkIn(myDog.id, locationName.trim(), gpsCoords.lat, gpsCoords.lng, checkInVisibility);
      setShowCheckInPanel(false);
      setLocationName('');
      setCheckInVisibility('everyone');
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
        {nearbyDogs
          .filter((dog) => {
            if (dog.id === myDog?.id) return true;
            if (dog.visibilityOnCheckIn === 'friends') return myPack.some((link) => link.dogIds?.includes(dog.id));
            return true;
          })
          .map((dog) => (
          <OverlayViewF key={dog.id} position={dog.checkedInLocation} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div
              className="dog-pin bounce-in"
              title={dog.name + ' at ' + dog.checkedInAt}
              style={{
                border: dog.id === myDog?.id ? '3px solid var(--gs-warm)' : '3px solid var(--gs-green)',
                position: 'relative',
                zIndex: 1,
              }}
              onMouseDown={(e) => { e.stopPropagation(); setSelectedDog(dog); }}
              onTouchStart={(e) => { e.stopPropagation(); setSelectedDog(dog); }}
            >
              {dog.photoURL ? (<img src={dog.photoURL} alt={dog.name} draggable={false} style={{ pointerEvents: 'none' }} />) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--gs-cream)', pointerEvents: 'none' }}>
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
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PawLogo size={32} />
          <span style={{ fontFamily: "'Fredoka', sans-serif", color: '#1a1a1a', fontSize: '1.25rem', fontWeight: 700 }}>GoSniff</span>
        </div>
        <button onClick={() => setShowMenu(!showMenu)} style={{
          position: 'relative',
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
          {pendingReceived.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '0px',
              right: '0px',
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              background: 'var(--gs-teal)',
              color: '#fff',
              fontSize: '0.6rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #fff',
              padding: '0 3px',
              lineHeight: 1,
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}>
              {pendingReceived.length > 9 ? '9+' : pendingReceived.length}
            </span>
          )}
        </button>
      </div>

      {/* DROPDOWN MENU */}
      {showMenu && (
        <div className="gs-card fade-in" style={{ position: 'fixed', top: '60px', right: '16px', zIndex: 300, minWidth: '220px', padding: '16px' }}>
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
            className="w-full text-left text-sm font-semibold flex items-center gap-3"
            style={{
              color: 'var(--gs-forest)',
              padding: '10px 12px',
              borderRadius: '10px',
              transition: 'background 0.15s',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gs-gray-100, #f5f5f5)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 1.5L16.5 5L5.5 16H2V12.5L13 1.5Z" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Edit Profile
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); setTimeout(() => setShowMyPack(true), 50); }}
            className="w-full text-left text-sm font-semibold flex items-center gap-3"
            style={{
              color: 'var(--gs-forest)',
              padding: '10px 12px',
              borderRadius: '10px',
              transition: 'background 0.15s',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gs-gray-100, #f5f5f5)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="6.5" cy="5.5" r="2.5" stroke="var(--gs-teal)" strokeWidth="1.5" />
              <path d="M1 15c0-3.04 2.46-5.5 5.5-5.5S12 11.96 12 15" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12.5" cy="5.5" r="2" stroke="var(--gs-teal)" strokeWidth="1.5" />
              <path d="M13.5 9.7c1.97.6 3.5 2.45 3.5 4.8" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ flex: 1 }}>
              My Pack{myPack.length > 0 && ` (${myPack.length})`}
            </span>
            {pendingReceived.length > 0 && (
              <span style={{
                background: 'var(--gs-teal)',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 7px',
                lineHeight: '1.4',
              }}>
                {pendingReceived.length}
              </span>
            )}
          </button>

          <button onClick={() => { signOut(); setShowMenu(false); }}
            className="w-full text-left text-sm font-semibold flex items-center gap-3"
            style={{
              color: 'var(--gs-text-light)',
              padding: '10px 12px',
              borderRadius: '10px',
              transition: 'background 0.15s',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gs-gray-100, #f5f5f5)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 16H3.5C2.94772 16 2.5 15.5523 2.5 15V3C2.5 2.44772 2.94772 2 3.5 2H7M12 12.5L16 9M16 9L12 5.5M16 9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}

      {/* FIX: Wrapper div at z-index 400 ensures EditProfile renders above everything */}
      {showEditProfile && myDog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
          <EditProfile dog={myDog} onClose={() => setShowEditProfile(false)} />
        </div>
      )}

      {showMyPack && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
          <MyPackList onClose={() => setShowMyPack(false)} />
        </div>
      )}

      {/* BOTTOM PANEL */}
      <div style={{ pointerEvents: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', zIndex: 10 }}>
        {myDog?.checkedIn && (
          <div className="gs-card mb-3 flex items-center justify-between fade-in" style={{ pointerEvents: 'auto' }}>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--gs-forest)' }}>{myDog.name} is at {myDog.checkedInAt}</p>
              <p className="text-xs" style={{ color: 'var(--gs-text-light)' }}>Checked in — visible to nearby dogs</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleRefreshLocation} disabled={refreshingLocation} className="btn-secondary text-sm" style={{ padding: '8px 16px' }}>
                {refreshingLocation ? 'Finding...' : 'Refresh Location'}
              </button>
              <button onClick={handleCheckOut} className="btn-secondary text-sm" style={{ padding: '8px 16px' }}>Leave</button>
            </div>
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
                  {locationName ? 'Where exactly are you?' : 'Where are you?'}
                </h3>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="gs-input mb-2"
                    placeholder="e.g. The Pond at McLaren Park, Big Dog Area..."
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
                    style={{ paddingRight: '36px' }}
                  />
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
                    style={{ position: 'absolute', right: '12px', top: '14px', opacity: 0.4 }}>
                    <path d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--gs-text-light)' }}>
                  Tap to rename your spot (e.g. "The Pond" or "Big Dog Area")
                </p>

                {/* Visibility toggle */}
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--gs-green)' }}>Who can see you?</p>
                <div style={{ display: 'flex', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid var(--gs-gray-200, #e5e5e5)', marginBottom: '10px' }}>
                  <button
                    style={{
                      flex: 1, padding: '9px 10px', fontSize: '0.825rem', fontWeight: 600,
                      border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                      background: checkInVisibility === 'everyone' ? 'var(--gs-teal)' : '#fff',
                      color: checkInVisibility === 'everyone' ? '#fff' : 'var(--gs-text-light)',
                    }}
                    onClick={() => setCheckInVisibility('everyone')}
                  >
                    Visible to Everyone
                  </button>
                  <button
                    style={{
                      flex: 1, padding: '9px 10px', fontSize: '0.825rem', fontWeight: 600,
                      border: 'none', borderLeft: '1.5px solid var(--gs-gray-200, #e5e5e5)',
                      cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                      background: checkInVisibility === 'friends' ? 'var(--gs-teal)' : '#fff',
                      color: checkInVisibility === 'friends' ? '#fff' : 'var(--gs-text-light)',
                    }}
                    onClick={() => setCheckInVisibility('friends')}
                  >
                    Friends Only
                  </button>
                </div>

                {checkInVisibility === 'friends' && myPack.length === 0 && (
                  <div className="mb-2" style={{ background: 'var(--gs-cream)', borderRadius: '10px', padding: '9px 12px' }}>
                    <p className="text-xs" style={{ color: 'var(--gs-text-light)', lineHeight: 1.5, margin: 0 }}>
                      You don't have any pack members yet. Check in visible to everyone, or tap a dog on the map to add them to your pack first.
                    </p>
                  </div>
                )}
              </>
            )}
            <div className="flex gap-2">
              <button className="btn-secondary flex-1 text-sm" onClick={() => { setShowCheckInPanel(false); setLocationName(''); setLocationError(null); setCheckInVisibility('everyone'); }}>Cancel</button>
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
            <button className="btn-primary" onClick={handleOpenCheckIn}
              style={{ flex: 1, padding: '14px', fontSize: '0.95rem', borderRadius: '18px' }}>
              We are Here!
            </button>
            <button
              onClick={handleRefreshLocation}
              disabled={refreshingLocation}
              style={{
                padding: '10px 14px',
                borderRadius: '18px',
                background: refreshingLocation ? 'var(--gs-teal-light)' : '#ffffff',
                border: '1.5px solid var(--gs-gray-200)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: refreshingLocation ? 'wait' : 'pointer',
                flexShrink: 0,
              }}
            >
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                style={{ animation: refreshingLocation ? 'pulse-logo 1s ease-in-out infinite' : 'none', flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="3" stroke="var(--gs-teal)" strokeWidth="2" />
                <circle cx="12" cy="12" r="8" stroke="var(--gs-teal)" strokeWidth="1.5" fill="none" />
                <line x1="12" y1="0" x2="12" y2="4" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="20" x2="12" y2="24" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="0" y1="12" x2="4" y2="12" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="20" y1="12" x2="24" y2="12" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gs-teal)', whiteSpace: 'nowrap' }}>
                {refreshingLocation ? 'Finding...' : 'Refresh Location'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* DOG PROFILE SHEET */}
      {selectedDog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={() => setSelectedDog(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
          <div
            className="relative w-full slide-up"
            style={{
              background: 'var(--gs-white, #fff)',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              padding: '20px',
              paddingTop: '16px',
              maxHeight: '45vh',
              overflow: 'auto',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedDog(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--gs-gray-100, #f5f5f5)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: 'var(--gs-gray-500, #737373)',
              }}
            >×</button>

            {/* Dog info row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px', paddingRight: '36px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                minWidth: '64px',
                minHeight: '64px',
                maxWidth: '64px',
                maxHeight: '64px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--gs-green)',
              }}>
                {selectedDog.photoURL ? (
                  <img src={selectedDog.photoURL} alt={selectedDog.name} style={{ width: '64px', height: '64px', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gs-cream)' }}>
                    <PawLogo size={28} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)', fontSize: '1.25rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                  {selectedDog.name}
                </h3>
                <p style={{ color: 'var(--gs-text-light)', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                  {selectedDog.breed} · {selectedDog.gender} · {selectedDog.age || 'Age unknown'}
                </p>
                {selectedDog.checkedInAt && (
                  <p style={{ color: 'var(--gs-green)', fontSize: '0.85rem', fontWeight: 600, margin: '4px 0 0 0' }}>
                    At {selectedDog.checkedInAt}
                  </p>
                )}
              </div>
            </div>

            {/* Personality chips */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <span className="gs-chip selected" style={{ cursor: 'default', fontSize: '0.8rem', padding: '6px 12px' }}>{selectedDog.size || 'Size?'}</span>
              {(Array.isArray(selectedDog.energy) ? selectedDog.energy : [selectedDog.energy].filter(Boolean)).map((e) => (
                <span key={e} className="gs-chip selected" style={{ cursor: 'default', fontSize: '0.8rem', padding: '6px 12px' }}>{e}</span>
              ))}
              {!selectedDog.energy || (Array.isArray(selectedDog.energy) && selectedDog.energy.length === 0) ? (
                <span className="gs-chip selected" style={{ cursor: 'default', fontSize: '0.8rem', padding: '6px 12px' }}>Personality?</span>
              ) : null}
            </div>

            {/* Pack relationship button */}
            {selectedDog.id !== myDog?.id && (() => {
              const status = getPackRequestStatus(selectedDog.id);

              if (status === 'accepted') {
                const packLink = myPack.find((l) => l.dogIds?.includes(selectedDog.id));
                if (confirmRemoveFromSheet) {
                  return (
                    <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p style={{ flex: 1, fontSize: '0.8rem', color: 'var(--gs-text-light)', margin: 0, lineHeight: 1.4 }}>
                        Remove {selectedDog.name} from your pack?
                      </p>
                      <button
                        className="btn-secondary"
                        style={{ padding: '7px 12px', fontSize: '0.8rem', flexShrink: 0 }}
                        onClick={() => setConfirmRemoveFromSheet(false)}
                      >
                        Keep
                      </button>
                      <button
                        style={{ padding: '7px 12px', fontSize: '0.8rem', fontWeight: 700, background: 'var(--gs-coral, #FF6B6B)', color: '#fff', border: 'none', borderRadius: '10px', cursor: packActionLoading === 'remove' ? 'wait' : 'pointer', flexShrink: 0 }}
                        disabled={packActionLoading === 'remove'}
                        onClick={async () => {
                          if (!packLink) return;
                          setPackActionLoading('remove');
                          try { await removeFromPack(packLink.id); setConfirmRemoveFromSheet(false); }
                          catch (err) { console.error('Failed to remove from pack:', err); }
                          setPackActionLoading(null);
                        }}
                      >
                        {packActionLoading === 'remove' ? '…' : 'Remove'}
                      </button>
                    </div>
                  );
                }
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(45, 106, 79, 0.07)', borderRadius: '14px', border: '1.5px solid var(--gs-green)' }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                      <path d="M3 9l4 4 8-8" stroke="var(--gs-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: '0.95rem', color: 'var(--gs-forest)' }}>In Your Pack</span>
                    <button
                      onClick={() => setConfirmRemoveFromSheet(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gs-text-light)', padding: 0 }}
                    >
                      Remove
                    </button>
                  </div>
                );
              }

              if (status === 'sent') {
                return (
                  <button
                    className="btn-secondary w-full"
                    disabled
                    style={{ padding: '12px', fontSize: '0.95rem', opacity: 0.65, cursor: 'default' }}
                  >
                    Pack Request Sent
                  </button>
                );
              }

              if (status === 'received') {
                const req = pendingReceived.find((r) => r.fromDogId === selectedDog.id);
                return (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-primary"
                      style={{ flex: 1, padding: '12px', fontSize: '0.9rem' }}
                      disabled={packActionLoading !== null}
                      onClick={async () => {
                        if (!req) return;
                        setPackActionLoading('accept');
                        try { await acceptPackRequest(req.id); }
                        catch (err) { console.error('Failed to accept pack request:', err); }
                        setPackActionLoading(null);
                      }}
                    >
                      {packActionLoading === 'accept' ? '…' : 'Accept Pack Request'}
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '12px 16px', fontSize: '0.9rem' }}
                      disabled={packActionLoading !== null}
                      onClick={async () => {
                        if (!req) return;
                        setPackActionLoading('decline');
                        try { await declinePackRequest(req.id); }
                        catch (err) { console.error('Failed to decline pack request:', err); }
                        setPackActionLoading(null);
                      }}
                    >
                      Decline
                    </button>
                  </div>
                );
              }

              // status === 'none'
              return (
                <button
                  className="btn-primary w-full"
                  style={{ padding: '12px', fontSize: '0.95rem' }}
                  disabled={packActionLoading === 'send'}
                  onClick={async () => {
                    if (!myDog) return;
                    setPackActionLoading('send');
                    try { await sendPackRequest(myDog.id, selectedDog.id); }
                    catch (err) { console.error('Failed to send pack request:', err); }
                    setPackActionLoading(null);
                  }}
                >
                  {packActionLoading === 'send' ? 'Sending…' : `Add ${selectedDog.name} to My Pack`}
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {showMenu && (<div style={{ position: 'fixed', inset: 0, zIndex: 250 }} onClick={() => setShowMenu(false)} />)}
    </div>
  );
}
