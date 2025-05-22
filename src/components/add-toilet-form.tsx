"use client";
import React, { useState } from "react";
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/AuthContext';

const TOILET_TYPES = [
  { id: "sitting", label: "Sitting Toilet" },
  { id: "squat", label: "Squat Toilet" },
  { id: "urinal", label: "Urinal" },
  { id: "attended", label: "Attended Toilet" },
  { id: "women", label: "Women-Only" },
  { id: "men", label: "Men-Only" },
  { id: "gender_neutral", label: "Gender-Neutral" },
];

const EXTRAS = [
  { id: "baby_changing", label: "Baby Changing" },
  { id: "soap", label: "Soap Present" },
  { id: "toilet_paper", label: "Toilet Paper" },
];

const LOCATION_TYPES = [
  "Public Restroom",
  "Cafe/Restaurant",
  "Shopping Center",
  "Park",
  "Other",
];

const ACCESSIBILITY_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not Sure" },
];

const QUICK_TAGS = [
  { id: "best", label: "Best Visit Ever", emoji: "✨" },
  { id: "clean", label: "Spotless Clean", emoji: "🧼" },
  { id: "easy", label: "Quick & Easy", emoji: "🚀" },
  { id: "safe", label: "Well-lit & Safe", emoji: "💡" },
  { id: "nothing", label: "Nothing Special", emoji: "🤷" },
  { id: "ok", label: "Just OK", emoji: "🙂" },
  { id: "disaster", label: "Total Disaster", emoji: "💩" },
  { id: "awful", label: "Smelled Awful", emoji: "🦨" },
  { id: "no_paper", label: "No Toilet Paper", emoji: "🚫🧻" },
  { id: "long_wait", label: "Long Wait", emoji: "⏱️" },
  { id: "emergency", label: "Emergency Exit Only?", emoji: "🚨" },
];

function StarRating({ rating, setRating }: { rating: number; setRating: (n: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          style={{
            cursor: "pointer",
            color: n <= rating ? "#facc15" : "#d1d5db",
            fontSize: 28,
          }}
          onClick={() => setRating(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function AddToiletForm() {
  const { authUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    address: "",
    latitude: 51.5074,
    longitude: 0.1278,
    locationType: "",
    accessibility: "not_sure",
    toiletTypes: [] as string[],
    extras: [] as string[],
    rating: 3,
    review: "",
    quickTags: [] as string[],
    photo: null as File | null,
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleMulti = (key: "toiletTypes" | "extras" | "quickTags", id: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((x) => x !== id) : [...prev[key], id],
    }));
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, photo: file }));
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) {
      alert('You must be logged in to add a toilet.');
      return;
    }
    let photoUrls: string[] = [];
    if (form.photo) {
      const photoRef = ref(storage, `toiletPhotos/${Date.now()}_${form.photo.name}`);
      await uploadBytes(photoRef, form.photo);
      const url = await getDownloadURL(photoRef);
      photoUrls.push(url);
    }
    const features = {
      hasSoap: form.extras.includes('soap'),
      hasToiletPaper: form.extras.includes('toilet_paper'),
      babyChanging: form.extras.includes('baby_changing'),
    };
    // 1. Add the toilet
    const toiletDocRef = await addDoc(collection(db, 'toilets'), {
      name: form.name,
      address: form.address,
      location: { latitude: Number(form.latitude), longitude: Number(form.longitude) },
      createdAt: serverTimestamp(),
      createdBy: authUser.uid,
      features,
      hasSoap: features.hasSoap,
      hasToiletPaper: features.hasToiletPaper,
      photoUrls,
      toiletTypes: form.toiletTypes,
      quickTags: form.quickTags,
      accessibility: form.accessibility,
      locationType: form.locationType,
      averageRating: form.rating,
      reviewCount: 1,
    });
    // 2. Add the review
    await addDoc(collection(db, 'reviews'), {
      createdAt: serverTimestamp(),
      comment: form.review,
      rating: form.rating,
      toiletId: toiletDocRef.id,
      userId: authUser.uid,
    });
    alert('Toilet and review added successfully!');
    // Optionally reset form or redirect
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: 32,
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 2px 16px #0001",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>Add a New Loo</h1>
      <p style={{ color: "#6b7280" }}>
        Found a toilet worth talking about? Fill in the details below. Your contribution helps everyone!
      </p>

      {/* Location Details */}
      <section>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Location Details</h2>
        <label>
          <div style={{ fontWeight: 500 }}>Toilet Name*</div>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="e.g., Starbucks, Central Station"
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", marginTop: 4 }}
          />
        </label>
        <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 12 }}>Give it a name people will recognize.</div>

        <label>
          <div style={{ fontWeight: 500 }}>Address (Optional)</div>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="e.g., Main Street 123, London"
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", marginTop: 4 }}
          />
        </label>
        <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 12 }}>
          If known, type the address. The map will update.
        </div>

        <div style={{ fontWeight: 500, marginBottom: 8 }}>Location on Map*</div>
        <div style={{ marginBottom: 8 }}>
          {/* You can replace this with a real map if you want */}
          <img
            src={`https://maps.googleapis.com/maps/api/staticmap?center=${form.latitude},${form.longitude}&zoom=15&size=600x200&markers=color:blue%7C${form.latitude},${form.longitude}&key=YOUR_API_KEY`}
            alt="Map"
            style={{ width: "100%", borderRadius: 8, border: "1px solid #d1d5db" }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/600x200?text=Map+Unavailable";
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label>
              Latitude
              <input
                name="latitude"
                value={form.latitude}
                onChange={handleChange}
                type="number"
                step="any"
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db", marginTop: 4 }}
              />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <label>
              Longitude
              <input
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
                type="number"
                step="any"
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db", marginTop: 4 }}
              />
            </label>
          </div>
        </div>
      </section>

      {/* Location & Access Info */}
      <section>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Location & Access Info</h2>
        <label>
          <div style={{ fontWeight: 500 }}>Location Type</div>
          <select
            name="locationType"
            value={form.locationType}
            onChange={handleChange}
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", marginTop: 4 }}
          >
            <option value="">Select location type</option>
            {LOCATION_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
      </section>

      {/* Accessibility */}
      <section>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Accessibility</h2>
        <div style={{ display: "flex", gap: 24, marginBottom: 12 }}>
          {ACCESSIBILITY_OPTIONS.map((opt) => (
            <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="radio"
                name="accessibility"
                value={opt.value}
                checked={form.accessibility === opt.value}
                onChange={handleChange}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      {/* Types of Thrones */}
      <section>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Types of Thrones</h2>
        <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 12 }}>Select all toilet types present.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {TOILET_TYPES.map((type) => (
            <button
              type="button"
              key={type.id}
              onClick={() => toggleMulti("toiletTypes", type.id)}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: form.toiletTypes.includes(type.id) ? "2px solid #2563eb" : "1px solid #d1d5db",
                background: form.toiletTypes.includes(type.id) ? "#dbeafe" : "#f9fafb",
                color: "#111",
                fontWeight: 500,
                cursor: "pointer",
                outline: "none",
              }}
              aria-pressed={form.toiletTypes.includes(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </section>

      {/* Extras Available */}
      <section>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Extras Available</h2>
        <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 12 }}>Tag the available extras.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {EXTRAS.map((extra) => (
            <button
              type="button"
              key={extra.id}
              onClick={() => toggleMulti("extras", extra.id)}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: form.extras.includes(extra.id) ? "2px solid #059669" : "1px solid #d1d5db",
                background: form.extras.includes(extra.id) ? "#d1fae5" : "#f9fafb",
                color: "#111",
                fontWeight: 500,
                cursor: "pointer",
                outline: "none",
              }}
              aria-pressed={form.extras.includes(extra.id)}
            >
              {extra.label}
            </button>
          ))}
        </div>
      </section>

      {/* Rating & Review */}
      <section>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Rating & Review</h2>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 500 }}>Star Rating*</div>
          <StarRating rating={form.rating} setRating={(n) => setForm((prev) => ({ ...prev, rating: n }))} />
          <div style={{ color: "#6b7280", fontSize: 14 }}>From 1 (disaster area) to 5 (luxury suite).</div>
        </div>
        <label>
          <div style={{ fontWeight: 500 }}>Short Review (Optional)</div>
          <textarea
            name="review"
            value={form.review}
            onChange={handleChange}
            rows={3}
            placeholder="e.g., Surprisingly clean! But the music was terrible."
            style={{ width: "100%", borderRadius: 8, border: "1px solid #d1d5db", padding: 12, fontSize: 16, resize: "vertical", marginTop: 4 }}
          />
        </label>
        <div style={{ color: "#6b7280", fontSize: 14 }}>Just a few words about your experience.</div>
      </section>

      {/* Quick Tags */}
      <section>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Quick Tags – How was it?</h2>
        <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 12 }}>
          Optionally pick a few quick tags to describe your experience
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {QUICK_TAGS.map((tag) => (
            <button
              type="button"
              key={tag.id}
              onClick={() => toggleMulti("quickTags", tag.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 20,
                border: form.quickTags.includes(tag.id) ? "2px solid #a21caf" : "1px solid #d1d5db",
                background: form.quickTags.includes(tag.id) ? "#f3e8ff" : "#f9fafb",
                color: "#111",
                fontWeight: 500,
                cursor: "pointer",
                outline: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              aria-pressed={form.quickTags.includes(tag.id)}
            >
              <span style={{ fontSize: 18 }}>{tag.emoji}</span> {tag.label}
            </button>
          ))}
        </div>
      </section>

      {/* Photo Upload */}
      <section>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Photo Upload</h2>
        <label>
          <div style={{ fontWeight: 500 }}>Photo (Optional)</div>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            style={{ marginTop: 8 }}
          />
        </label>
        {photoPreview && (
          <div style={{ marginTop: 12 }}>
            <img
              src={photoPreview}
              alt="Preview"
              style={{ maxWidth: 300, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </div>
        )}
        <div style={{ color: "#6b7280", fontSize: 14, marginTop: 8 }}>
          Drag & drop or click to upload. Show the good, the bad, and the moldy.
        </div>
      </section>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 16, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            background: "#f3f4f6",
            color: "#374151",
            fontWeight: 600,
            fontSize: 18,
            border: "none",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            background: "#2563eb",
            color: "#fff",
            fontWeight: 600,
            fontSize: 18,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span role="img" aria-label="save">💾</span>
          <span role="img" aria-label="toilet">🚽</span>
          Flush & Save
        </button>
      </div>
    </form>
  );
}