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
const ENERGY = ['Couch Potato', 'Moderate', 'High Energy', 'Turbo Mode'];
const GENDERS = ['Male', 'Female'];

export default function JoinThePack({ onComplete }) {
  const { signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Dog data
  const [dogName, setDogName] = useState('');
  const [dogPhoto, setDogPhoto] = useState(null);
  const [dogPhotoPreview, setDogPhotoPreview] = useState(null);
  const [breed, setBreed] = useState('');
  const [breedSearch, setBreedSearch] = useState('');
  const [size, setSize] = useState('');
  const [energy, setEnergy] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');

  // Human account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const totalSteps = 5;

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (file) {
      setDogPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setDogPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const dogData = {
        name: dogName,
        photoURL: dogPhotoPreview || null, // For MVP, store base64 (switch to Storage later)
        breed,
        size,
        energy,
        gender,
        age: age || 'Not specified',
      };
      await signUp(email, password, dogData);
      if (onComplete) onComplete();
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
    <div
      className="min-h-screen flex items-center justify-center p-4 paw-pattern"
      style={{ background: 'var(--gs-bg)' }}
    >
      <div className="gs-card w-full max-w-md slide-up">
        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full flex-1 transition-all duration-300"
              style={{
                background: i < step ? 'var(--gs-green)' : 'var(--gs-mint)',
              }}
            />
          ))}
        </div>

        {/* Step 1: Dog's name */}
        {step === 1 && (
          <div className="fade-in">
            <div className="text-center mb-6">
              <PawLogo size={56} className="mx-auto mb-3" />
              <h2
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}
              >
                Join the Pack
              </h2>
              <p style={{ color: 'var(--gs-text-light)' }}>Let's start with the important stuff.</p>
            </div>
            <label
              className="block text-sm font-bold mb-2"
              style={{ color: 'var(--gs-green)' }}
            >
              What's your dog's name?
            </label>
            <input
              type="text"
              className="gs-input text-lg"
              placeholder="e.g. Biscuit, Mochi, Luna..."
              value={dogName}
              onChange={(e) => setDogName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && dogName.trim() && setStep(2)}
            />
            <button
              className="btn-primary w-full mt-6"
              disabled={!dogName.trim()}
              onClick={() => setStep(2)}
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Photo */}
        {step === 2 && (
          <div className="fade-in">
            <div className="text-center mb-6">
              <h2
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}
              >
                Show us that face!
              </h2>
              <p style={{ color: 'var(--gs-text-light)' }}>
                {dogName}'s profile photo (you can change it later)
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              {dogPhotoPreview ? (
                <div
                  className="w-32 h-32 rounded-full overflow-hidden bounce-in"
                  style={{ border: '4px solid var(--gs-green)' }}
                >
                  <img
                    src={dogPhotoPreview}
                    alt={dogName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--gs-cream)', border: '3px dashed var(--gs-mint)' }}
                >
                  <PawLogo size={48} color="var(--gs-mint)" />
                </div>
              )}
              <label className="btn-secondary cursor-pointer">
                {dogPhotoPreview ? 'Change Photo' : 'Upload Photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="btn-primary flex-1" onClick={() => setStep(3)}>
                {dogPhotoPreview ? 'Next' : 'Skip for Now'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Breed */}
        {step === 3 && (
          <div className="fade-in">
            <div className="text-center mb-4">
              <h2
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}
              >
                What kind of pup is {dogName}?
              </h2>
            </div>
            <input
              type="text"
              className="gs-input mb-3"
              placeholder="Search breeds..."
              value={breedSearch}
              onChange={(e) => setBreedSearch(e.target.value)}
              autoFocus
            />
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pb-2">
              {filteredBreeds.map((b) => (
                <button
                  key={b}
                  className={`gs-chip ${breed === b ? 'selected' : ''}`}
                  onClick={() => setBreed(b)}
                >
                  {b}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setStep(2)}>
                Back
              </button>
              <button
                className="btn-primary flex-1"
                disabled={!breed}
                onClick={() => setStep(4)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Size, energy, gender, age */}
        {step === 4 && (
          <div className="fade-in">
            <div className="text-center mb-4">
              <h2
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}
              >
                Tell us about {dogName}
              </h2>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--gs-green)' }}>
                Size
              </label>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    className={`gs-chip ${size === s ? 'selected' : ''}`}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--gs-green)' }}>
                Energy Level
              </label>
              <div className="flex flex-wrap gap-2">
                {ENERGY.map((e) => (
                  <button
                    key={e}
                    className={`gs-chip ${energy === e ? 'selected' : ''}`}
                    onClick={() => setEnergy(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--gs-green)' }}>
                Gender
              </label>
              <div className="flex gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    className={`gs-chip ${gender === g ? 'selected' : ''}`}
                    onClick={() => setGender(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-2">
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--gs-green)' }}>
                Age (optional)
              </label>
              <input
                type="text"
                className="gs-input"
                placeholder="e.g. 3 years, 6 months, puppy..."
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setStep(3)}>
                Back
              </button>
              <button
                className="btn-primary flex-1"
                disabled={!size || !energy || !gender}
                onClick={() => setStep(5)}
              >
                Almost Done!
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Create account (human layer) */}
        {step === 5 && (
          <div className="fade-in">
            <div className="text-center mb-4">
              <h2
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}
              >
                Last step!
              </h2>
              <p style={{ color: 'var(--gs-text-light)' }}>
                Create your (human) account. Don't worry, nobody will see this.
                {dogName} is the star here.
              </p>
            </div>

            {error && (
              <div
                className="p-3 rounded-xl mb-4 text-sm"
                style={{ background: '#FEE2E2', color: '#991B1B' }}
              >
                {error}
              </div>
            )}

            <div className="mb-3">
              <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>
                Email
              </label>
              <input
                type="email"
                className="gs-input"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>
                Password
              </label>
              <input
                type="password"
                className="gs-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setStep(4)}>
                Back
              </button>
              <button
                className="btn-primary flex-1"
                disabled={!email || password.length < 6 || submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Creating Pack...' : `Let's GoSniff!`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
