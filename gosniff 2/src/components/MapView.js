'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, OverlayViewF, OverlayView } from '@react-google-maps/api';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import PawLogo from './PawLogo';

// Google Maps custom styling (subtle, clean, nature-toned)
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

// Default center (San Francisco - will be replaced by user's location)
const defaultCenter = { lat: 37.7749, lng: -122.4194 };

// Auto-checkout timer (90 minutes)
const AUTO_CHECKOUT_MS = 90 * 60 * 1000;

export default function MapView() {
  const { user, dogs, checkIn, checkOut, signOut } = useAuth();
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(defaultCenter);
  const [nearbyDogs, setNearbyDogs] = useState([]);
  const [selectedDog, setSelectedDog] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [showCheckInPanel, setShowCheckInPanel] = useState(false);
  const autoCheckoutRef = useRef(null);

  const myDog = dogs[0]; // For MVP, use the first dog

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  // Get user's real location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // If denied, stay at default (SF)
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Listen for ALL checked-in dogs (real-time)
  useEffect(() => {
    const q = query(collection(db, 'dogs'), where('checkedIn', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      const dogsOnMap = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((d) => d.checkedInLocation); // only dogs with location data
      setNearbyDogs(dogsOnMap);
    });
    return () => unsub();
  }, []);

  // Auto-checkout timer
  useEffect(() => {
    if (myDog?.checkedIn && myDog?.checkedInTime) {
      const checkedInAt = myDog.checkedInTime.toDate
        ? myDog.checkedInTime.toDate().getTime()
        : Date.now();
      const elapsed = Date.now() - checkedInAt;
      const remaining = AUTO_CHECKOUT_MS - elapsed;

      if (remaining <= 0) {
        checkOut(myDog.id);
      } else {
        autoCheckoutRef.current = setTimeout(() => {
          checkOut(myDog.id);
        }, remaining);
      }
    }
    return () => {
      if (autoCheckoutRef.current) clearTimeout(autoCheckoutRef.current);
    };
  }, [myDog?.checkedIn, myDog?.checkedInTime]);

  const onMapLoad = useCallback((mapInstance) => setMap(mapInstance), []);

  // Handle check-in
  async function handleCheckIn() {
    if (!locationName.trim()) return;
    setCheckingIn(true);
    try {
      await checkIn(myDog.id, locationName.trim(), center.lat, center.lng);
      setShowCheckInPanel(false);
      setLocationName('');
    } catch (err) {
      console.error('Check-in failed:', err);
    }
    setCheckingIn(false);
  }

  // Handle check-out
  async function handleCheckOut() {
    try {
      await checkOut(myDog.id);
    } catch (err) {
      console.error('Check-out failed:', err);
    }
  }

  if (!isLoaded) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ background: 'var(--gs-bg)' }}
      >
        <div className="text-center fade-in">
          <PawLogo size={60} className="mx-auto mb-3" />
          <p style={{ color: 'var(--gs-green)', fontWeight: 600 }}>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* The Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={14}
        onLoad={onMapLoad}
        options={{
          styles: mapStyles,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: 6 }, // RIGHT_CENTER
          clickableIcons: false,
        }}
      >
        {/* Dog pins on the map */}
        {nearbyDogs.map((dog) => (
          <OverlayViewF
            key={dog.id}
            position={dog.checkedInLocation}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              className="dog-pin bounce-in"
              onClick={() => setSelectedDog(dog)}
              title={`${dog.name} at ${dog.checkedInAt}`}
              style={{
                border: dog.id === myDog?.id ? '3px solid var(--gs-warm)' : '3px solid var(--gs-green)',
              }}
            >
              {dog.photoURL ? (
                <img src={dog.photoURL} alt={dog.name} />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: 'var(--gs-cream)' }}
                >
                  <PawLogo size={24} color="var(--gs-green-mid)" />
                </div>
              )}
            </div>
          </OverlayViewF>
        ))}
      </GoogleMap>

      {/* Top bar: GoSniff branding + menu */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3 pb-2"
        style={{
          background: 'linear-gradient(to bottom, rgba(233,245,240,0.95), rgba(233,245,240,0))',
          pointerEvents: 'none',
        }}
      >
        <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
          <PawLogo size={32} />
          <span
            className="text-xl font-bold"
            style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}
          >
            GoSniff
          </span>
        </div>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: 'var(--gs-white)',
            boxShadow: '0 2px 8px var(--gs-shadow)',
            pointerEvents: 'auto',
          }}
        >
          {myDog?.photoURL ? (
            <img
              src={myDog.photoURL}
              alt={myDog.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <PawLogo size={20} color="var(--gs-green)" />
          )}
        </button>
      </div>

      {/* Menu dropdown */}
      {showMenu && (
        <div
          className="absolute top-16 right-4 gs-card fade-in z-50"
          style={{ minWidth: '200px' }}
        >
          <div className="flex items-center gap-3 mb-3 pb-3" style={{ borderBottom: '1px solid var(--gs-mint)' }}>
            <div
              className="w-10 h-10 rounded-full overflow-hidden"
              style={{ border: '2px solid var(--gs-green)' }}
            >
              {myDog?.photoURL ? (
                <img src={myDog.photoURL} alt={myDog.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--gs-cream)' }}>
                  <PawLogo size={16} />
                </div>
              )}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--gs-forest)' }}>{myDog?.name}</p>
              <p className="text-xs" style={{ color: 'var(--gs-text-light)' }}>
                {myDog?.breed} · {myDog?.size?.split(' ')[0]}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              signOut();
              setShowMenu(false);
            }}
            className="w-full text-left text-sm font-semibold py-2 px-1"
            style={{ color: 'var(--gs-coral)' }}
          >
            Sign Out
          </button>
        </div>
      )}

      {/* Bottom panel: Check-in / Check-out */}
      <div className="absolute bottom-0 left-0 right-0 p-4" style={{ pointerEvents: 'none' }}>
        {/* Status bar when checked in */}
        {myDog?.checkedIn && (
          <div
            className="gs-card mb-3 flex items-center justify-between fade-in"
            style={{ pointerEvents: 'auto' }}
          >
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--gs-forest)' }}>
                {myDog.name} is at {myDog.checkedInAt}
              </p>
              <p className="text-xs" style={{ color: 'var(--gs-text-light)' }}>
                Checked in · Visible to nearby dogs
              </p>
            </div>
            <button
              onClick={handleCheckOut}
              className="btn-secondary text-sm"
              style={{ padding: '8px 16px' }}
            >
              Leave
            </button>
          </div>
        )}

        {/* Check-in panel */}
        {showCheckInPanel && !myDog?.checkedIn && (
          <div className="gs-card mb-3 slide-up" style={{ pointerEvents: 'auto' }}>
            <h3
              className="font-bold mb-2"
              style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}
            >
              Where are you?
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
            <div className="flex gap-2">
              <button
                className="btn-secondary flex-1 text-sm"
                onClick={() => {
                  setShowCheckInPanel(false);
                  setLocationName('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex-1 text-sm"
                disabled={!locationName.trim() || checkingIn}
                onClick={handleCheckIn}
              >
                {checkingIn ? 'Checking in...' : 'Check In'}
              </button>
            </div>
          </div>
        )}

        {/* Main check-in button */}
        {!myDog?.checkedIn && !showCheckInPanel && (
          <button
            className="btn-primary w-full text-lg bounce-in"
            onClick={() => setShowCheckInPanel(true)}
            style={{
              pointerEvents: 'auto',
              padding: '18px',
              fontSize: '1.1rem',
              borderRadius: '18px',
            }}
          >
            🐾 We're Here!
          </button>
        )}
      </div>

      {/* Selected dog profile panel */}
      {selectedDog && (
        <div
          className="absolute inset-0 z-40 flex items-end"
          onClick={() => setSelectedDog(null)}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.3)' }}
          />
          <div
            className="relative w-full gs-card slide-up"
            style={{
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              maxHeight: '60vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedDog(null)}
              className="absolute top-3 right-4 text-2xl"
              style={{ color: 'var(--gs-text-light)' }}
            >
              ×
            </button>
            <div className="flex items-start gap-4">
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: '3px solid var(--gs-green)' }}
              >
                {selectedDog.photoURL ? (
                  <img
                    src={selectedDog.photoURL}
                    alt={selectedDog.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: 'var(--gs-cream)' }}
                  >
                    <PawLogo size={32} color="var(--gs-green-mid)" />
                  </div>
                )}
              </div>
              <div className="flex-1 pt-1">
                <h3
                  className="text-xl font-bold"
                  style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}
                >
                  {selectedDog.name}
                </h3>
                <p className="text-sm" style={{ color: 'var(--gs-text-light)' }}>
                  {selectedDog.breed} · {selectedDog.gender} · {selectedDog.age || 'Age unknown'}
                </p>
                {selectedDog.checkedInAt && (
                  <p
                    className="text-sm font-semibold mt-1"
                    style={{ color: 'var(--gs-green)' }}
                  >
                    📍 {selectedDog.checkedInAt}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap">
              <span className="gs-chip selected" style={{ cursor: 'default' }}>
                {selectedDog.size?.split(' ')[0] || 'Size?'}
              </span>
              <span className="gs-chip selected" style={{ cursor: 'default' }}>
                {selectedDog.energy || 'Energy?'}
              </span>
            </div>

            {/* Placeholder for future messaging */}
            {selectedDog.id !== myDog?.id && (
              <button
                className="btn-primary w-full mt-4"
                onClick={() => alert('Messaging coming soon!')}
              >
                Say Hi to {selectedDog.name} 👋
              </button>
            )}
          </div>
        </div>
      )}

      {/* Click outside menu to close it */}
      {showMenu && (
        <div
          className="absolute inset-0 z-30"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
