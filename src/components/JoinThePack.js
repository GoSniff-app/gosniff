'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import PawLogo from './PawLogo';

const BREEDS = [
  'Mixed Breed', 'Labrador Retriever', 'Golden Retriever', 'German Shepherd',
  'Bulldog', 'Poodle', 'Beagle', 'Rottweiler', 'Dachshund', 'Corgi',
  'Husky', 'Boxer', 'Great Dane', 'Doberman', 'Australian Shepherd',
  'Shih Tzu', 'Chihuahua', 'Pit Bull', 'Border Collie', 'Bernese Mountain Dog',
  'French Bulldog', 'Cavalier King Charles', 'Cocker Spaniel', 'Pomeranian',
  'Maltese', 'Yorkshire Terrier', 'Vizsla', 'Weimaraner', 'Greyhound', 'Other',
];

const SIZES = ['Small (under 25 lbs)', 'Medium (25-50 lbs)', 'Large (50-90 lbs)', 'XL (90+ lbs)'];
const ENERGY = [
  'Couch Potato', 'Casual Sniffer', 'Full Zoomies', 'Adolescent Insanity',
  'Puppy Pandemonium', 'Senior Sniffs', 'Shy But Canine Curious',
  'Selective Sniffer', 'Ball Is Life', 'Social Butterfly',
];
const GENDERS = ['Male', 'Female'];

function compressImage(file, maxWidth = 400, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function JoinThePack() {
  const { signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dogName, setDogName] = useState('');
  const [dogPhoto, setDogPhoto] = useState(null);
  const [dogPhotoPreview, setDogPhotoPreview] = useState(null);
  const [breed, setBreed] = useState('');
  const [breedSearch, setBreedSearch] = useState('');
  const [size, setSize] = useState('');
  const [energy, setEnergy] = useState([]);
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const totalSteps = 5;

  async function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (file) {
      setDogPhoto(file);
      const compressed = await compressImage(file);
      setDogPhotoPreview(compressed);
    }
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const dogData = {
        name: dogName,
        photoURL: dogPhotoPreview || null,
        breed, size, energy, gender,
        age: age || 'Not specified',
      };
      await signUp(email, password, dogData);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('That email is already registered. Try signing in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password needs to be at least 6 characters.');
      } else {
        setError(err.message);
      }
      setSubmitting(false);
    }
  }

  const filteredBreeds = breedSearch
    ? BREEDS.filter((b) => b.toLowerCase().includes(breedSearch.toLowerCase()))
    : BREEDS;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 paw-pattern" style={{ background: 'var(--gs-bg)' }}>
      <div className="gs-card w-full max-w-md slide-up">
        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className="h-1.5 rounded-full flex-1 transition-all duration-300" style={{ background: i < step ? 'var(--gs-green)' : 'var(--gs-mint)' }} />
          ))}
        </div>

        {step === 1 && (
          <div className="fade-in">
            <div className="text-center mb-6">
              <PawLogo size={56} className="mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>Join the Pack</h2>
              <p style={{ color: 'var(--gs-text-light)' }}>Let's start with the important stuff.</p>
            </div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--gs-green)' }}>What's your dog's name?</label>
            <input type="text" className="gs-input text-lg" placeholder="e.g. Biscuit, Mochi, Luna..." value={dogName} onChange={(e) => setDogName(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && dogName.trim() && setStep(2)} />
            <button className="btn-primary w-full mt-6" disabled={!dogName.trim()} onClick={() => setStep(2)}>Next</button>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>Upload {dogName}'s Photo</h2>
              <p style={{ color: 'var(--gs-text-light)' }}>You can always change it later.</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              {dogPhotoPreview ? (
                <div className="w-32 h-32 rounded-full overflow-hidden bounce-in" style={{ border: '4px solid var(--gs-green)' }}>
                  <img src={dogPhotoPreview} alt={dogName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ background: 'var(--gs-cream)', border: '3px dashed var(--gs-mint)' }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="20" r="8" stroke="#a3a3a3" strokeWidth="2" fill="none"/>
                    <path d="M8 40c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="#a3a3a3" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    <circle cx="20" cy="12" r="3" fill="#a3a3a3"/>
                    <circle cx="28" cy="12" r="3" fill="#a3a3a3"/>
                  </svg>
                </div>
              )}
              <label className="btn-secondary cursor-pointer">
                {dogPhotoPreview ? 'Change Photo' : 'Upload Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary flex-1" onClick={() => setStep(3)}>{dogPhotoPreview ? 'Next' : 'Skip for Now'}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>What kind of pup is {dogName}?</h2>
            </div>
            <input type="text" className="gs-input mb-3" placeholder="Search breeds..." value={breedSearch} onChange={(e) => setBreedSearch(e.target.value)} autoFocus />
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pb-2">
              {filteredBreeds.map((b) => (
                <button key={b} className={'gs-chip ' + (breed === b ? 'selected' : '')} onClick={() => setBreed(b)}>{b}</button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setStep(2)}>Back</button>
              <button className="btn-primary flex-1" disabled={!breed} onClick={() => setStep(4)}>Next</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="fade-in">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>Tell us about {dogName}</h2>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--gs-green)' }}>Size</label>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (<button key={s} className={'gs-chip ' + (size === s ? 'selected' : '')} onClick={() => setSize(s)}>{s}</button>))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--gs-green)' }}>Personality (pick up to 3)</label>
              <div className="flex flex-wrap gap-2">
                {ENERGY.map((e) => (
                  <button key={e} className={'gs-chip ' + (energy.includes(e) ? 'selected' : '')}
                    onClick={() => {
                      if (energy.includes(e)) { setEnergy(energy.filter((x) => x !== e)); }
                      else if (energy.length < 3) { setEnergy([...energy, e]); }
                    }}>{e}</button>
                ))}
              </div>
              {energy.length === 3 && <p className="text-xs mt-1" style={{ color: 'var(--gs-text-light)' }}>Max 3 selected</p>}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--gs-green)' }}>Gender</label>
              <div className="flex gap-2">
                {GENDERS.map((g) => (<button key={g} className={'gs-chip ' + (gender === g ? 'selected' : '')} onClick={() => setGender(g)}>{g}</button>))}
              </div>
            </div>
            <div className="mb-2">
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--gs-green)' }}>Age (optional)</label>
              <input type="text" className="gs-input" placeholder="e.g. 3 years, 6 months, puppy..." value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setStep(3)}>Back</button>
              <button className="btn-primary flex-1" disabled={!size || energy.length === 0 || !gender} onClick={() => setStep(5)}>Almost Done!</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="fade-in">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>Last step!</h2>
              <p style={{ color: 'var(--gs-text-light)' }}>Create your (human) account. Nobody will see this. {dogName} is the star here.</p>
            </div>
            {error && (<div className="p-3 rounded-xl mb-4 text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>)}
            <div className="mb-3">
              <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>Email</label>
              <input type="email" className="gs-input" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="gs-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--gs-text-light)', display: 'flex', alignItems: 'center' }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setStep(4)}>Back</button>
              <button className="btn-primary flex-1" disabled={!email || password.length < 6 || submitting} onClick={handleSubmit}>
                {submitting ? 'Creating Pack...' : "Let's GoSniff!"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
