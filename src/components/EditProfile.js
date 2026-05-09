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
  'Maltese', 'Yorkshire Terrier', 'Vizsla', 'Weimaraner', 'Greyhound',
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

export default function EditProfile({ dog, onClose }) {
  const { updateDog, deleteAccount } = useAuth();
  const [dogName, setDogName] = useState(dog.name || '');
  const [dogPhotoPreview, setDogPhotoPreview] = useState(dog.photoURL || null);
  const [breed, setBreed] = useState(() => {
    const raw = Array.isArray(dog.breed) ? dog.breed : dog.breed ? [dog.breed] : [];
    return raw.filter((b) => b !== 'Other');
  });
  const [customBreed, setCustomBreed] = useState('');
  const [maxBreedMsg, setMaxBreedMsg] = useState(false);
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

  async function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (file) {
      const compressed = await compressImage(file);
      setDogPhotoPreview(compressed);
    }
  }

  function toggleBreed(b) {
    if (breed.includes(b)) { setBreed(breed.filter((x) => x !== b)); return; }
    if (breed.length >= 2) { setMaxBreedMsg(true); setTimeout(() => setMaxBreedMsg(false), 1500); return; }
    setBreed([...breed, b]);
  }

  function addCustomBreed() {
    const val = customBreed.trim();
    if (!val) return;
    if (breed.includes(val)) { setCustomBreed(''); return; }
    if (breed.length >= 2) { setMaxBreedMsg(true); setTimeout(() => setMaxBreedMsg(false), 1500); return; }
    setBreed([...breed, val]);
    setCustomBreed('');
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


  if (saved) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
        <div className="gs-card text-center bounce-in" style={{ maxWidth: '320px' }}>
          <PawLogo size={48} className="mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>Updated!</h2>
          <p style={{ color: 'var(--gs-text-light)' }}>{dogName}'s profile has been saved.</p>
        </div>
      </div>
    );
  }

  return (
    /* FIX: Removed onClick={onClose} from this outer wrapper — it was catching stray events and closing the modal instantly */
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* FIX: Only this backdrop div closes the modal now (deliberate tap on dark area) */}
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
              <PawLogo size={36} />
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
          <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>Breed <span style={{ fontWeight: 400, color: 'var(--gs-text-light)' }}>(pick up to 2)</span></label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto mb-2">
            {BREEDS.map((b) => (
              <button key={b} className={'gs-chip ' + (breed.includes(b) ? 'selected' : '')} onClick={() => toggleBreed(b)}>{b}</button>
            ))}
          </div>
          {maxBreedMsg && (
            <p style={{ fontSize: '0.75rem', color: 'var(--gs-coral)', margin: '0 0 6px' }}>2 breeds max</p>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="gs-input"
              placeholder="Breed not listed? Type it in"
              value={customBreed}
              onChange={(e) => setCustomBreed(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomBreed(); } }}
              style={{ flex: 1 }}
            />
            {customBreed.trim() && (
              <button className="btn-primary" style={{ padding: '10px 16px', fontSize: '0.875rem', flexShrink: 0 }} onClick={addCustomBreed}>
                Add
              </button>
            )}
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
          disabled={!dogName.trim() || breed.length === 0 || !size || energy.length === 0 || !gender || saving}
          onClick={handleSave}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        {/* Delete section */}
        <div className="pt-4" style={{ borderTop: '1px solid var(--gs-gray-200, #e5e5e5)' }}>
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
