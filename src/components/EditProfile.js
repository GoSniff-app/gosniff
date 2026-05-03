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

export default function EditProfile({ dog, onClose }) {
  const { updateDog, deleteAccount } = useAuth();
  const [dogName, setDogName] = useState(dog.name || '');
  const [dogPhotoPreview, setDogPhotoPreview] = useState(dog.photoURL || null);
  const [breed, setBreed] = useState(dog.breed || '');
  const [breedSearch, setBreedSearch] = useState('');
  const [size, setSize] = useState(dog.size || '');
  const [energy, setEnergy] = useState(
    Array.isArray(dog.energy) ? dog.energy : dog.energy ? [dog.energy] : []
  );
  const [gender, setGender] = useState(dog.gender || '');
  const [age, setAge] = useState(dog.age || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setDogPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateDog(dog.id, {
        name: dogName.trim(),
        photoURL: dogPhotoPreview || null,
        breed,
        size,
        energy,
        gender,
        age: age || 'Not specified',
      });
      setSaved(true);
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Something went wrong saving the profile. Try again.');
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (deleteText !== dog.name) return;
    setDeleting(true);
    try {
      await deleteAccount(dog.id);
    } catch (err) {
      console.error('Failed to delete account:', err);
      alert('Something went wrong. Try again.');
      setDeleting(false);
    }
  }

  const filteredBreeds = breedSearch
    ? BREEDS.filter((b) => b.toLowerCase().includes(breedSearch.toLowerCase()))
    : BREEDS;

  if (saved) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 10000 }}>
        <div className="gs-card text-center bounce-in" style={{ maxWidth: '320px' }}>
          <PawLogo size={48} className="mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>Updated!</h2>
          <p style={{ color: 'var(--gs-text-light)' }}>{dogName}'s profile has been saved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: 10000 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md gs-card slide-up"
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '85vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>
            Edit {dog.name}'s Profile
          </h2>
          <button onClick={onClose} className="text-2xl" style={{ color: 'var(--gs-text-light)' }}>×</button>
        </div>

        {/* Photo */}
        <div className="flex flex-col items-center gap-3 mb-5">
          {dogPhotoPreview ? (
            <div className="w-24 h-24 rounded-full overflow-hidden" style={{ border: '3px solid var(--gs-green)' }}>
              <img src={dogPhotoPreview} alt={dogName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'var(--gs-cream)', border: '3px dashed var(--gs-mint)' }}>
              <PawLogo size={36} color="var(--gs-mint)" />
            </div>
          )}
          <label className="btn-secondary cursor-pointer text-sm" style={{ padding: '6px 16px' }}>
            Change Photo
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
          </label>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>Name</label>
          <input type="text" className="gs-input" value={dogName} onChange={(e) => setDogName(e.target.value)} />
        </div>

        {/* Breed */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>Breed</label>
          <input type="text" className="gs-input mb-2" placeholder="Search breeds..." value={breedSearch} onChange={(e) => setBreedSearch(e.target.value)} />
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {filteredBreeds.map((b) => (
              <button key={b} className={'gs-chip ' + (breed === b ? 'selected' : '')} onClick={() => setBreed(b)}>{b}</button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>Size</label>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button key={s} className={'gs-chip ' + (size === s ? 'selected' : '')} onClick={() => setSize(s)}>{s}</button>
            ))}
          </div>
        </div>

        {/* Personality (multi-select, max 3) */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>Personality (pick up to 3)</label>
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

        {/* Gender */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>Gender</label>
          <div className="flex gap-2">
            {GENDERS.map((g) => (
              <button key={g} className={'gs-chip ' + (gender === g ? 'selected' : '')} onClick={() => setGender(g)}>{g}</button>
            ))}
          </div>
        </div>

        {/* Age */}
        <div className="mb-5">
          <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>Age</label>
          <input type="text" className="gs-input" placeholder="e.g. 3 years, 6 months, puppy..." value={age} onChange={(e) => setAge(e.target.value)} />
        </div>

        {/* Save button */}
        <button
          className="btn-primary w-full mb-4"
          disabled={!dogName.trim() || !breed || !size || energy.length === 0 || !gender || saving}
          onClick={handleSave}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        {/* Delete section */}
        <div className="pt-4" style={{ borderTop: '1px solid var(--gs-mint)' }}>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-center text-sm font-semibold py-2"
              style={{ color: 'var(--gs-coral)' }}
            >
              Delete Account
            </button>
          ) : (
            <div className="fade-in">
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--gs-coral)' }}>
                This will permanently delete {dog.name}'s profile and your account. This cannot be undone.
              </p>
              <p className="text-sm mb-2" style={{ color: 'var(--gs-text-light)' }}>
                Type <strong>{dog.name}</strong> to confirm:
              </p>
              <input
                type="text"
                className="gs-input mb-3"
                placeholder={dog.name}
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 text-sm" onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }}>
                  Cancel
                </button>
                <button
                  className="flex-1 text-sm font-bold py-2 px-4 rounded-xl"
                  style={{ background: deleteText === dog.name ? 'var(--gs-coral)' : '#e0e0e0', color: '#fff' }}
                  disabled={deleteText !== dog.name || deleting}
                  onClick={handleDelete}
                >
                  {deleting ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
