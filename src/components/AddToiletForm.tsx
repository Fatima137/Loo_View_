"use client";
import React, { useRef, useState, useEffect } from "react";
import {
  MapPin,
  Landmark,
  Accessibility,
  Toilet,
  Puzzle,
  Star,
  MessageSquare,
  Camera,
  Tag,
  Save,
  Navigation,
} from "lucide-react";
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/AuthContext';

const GOOGLE_MAPS_API_KEY = "AIzaSyAXaoanceqRHMtdXm2Yvb-9YUpogZAjDIQ";

const TOILET_TYPES = [
  { id: "sitting", label: "Sitting Toilet", icon: "🚽" },
  { id: "squat", label: "Squat Toilet", icon: "⬇️" },
  { id: "urinal", label: "Urinal", icon: "🚹" },
  { id: "attended", label: "Attended Toilet", icon: "🛎️" },
  { id: "women", label: "Women-Only", icon: "♀️" },
  { id: "men", label: "Men-Only", icon: "♂️" },
  { id: "gender_neutral", label: "Gender-Neutral", icon: "👥" },
];

const EXTRAS = [
  { id: "baby_changing", label: "Baby Changing", icon: "👶" },
  { id: "soap", label: "Soap Present", icon: "💧" },
  { id: "toilet_paper", label: "Toilet Paper", icon: "🧻" },
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

function StarRating({ rating, setRating }) {
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
          <Star fill={n <= rating ? "#facc15" : "none"} stroke={n <= rating ? "#facc15" : "#d1d5db"} />
        </span>
      ))}
    </div>
  );
}

// Google Maps component
function GoogleMap({ lat, lng, onLocationChange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load Google Maps script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsLoaded(true);
      document.head.appendChild(script);
    } else {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && mapRef.current && !mapInstanceRef.current) {
      // Initialize map
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Add marker
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        draggable: true,
        title: "Toilet Location"
      });

      // Handle marker drag
      markerRef.current.addListener('dragend', (event) => {
        const newLat = event.latLng.lat();
        const newLng = event.latLng.lng();
        onLocationChange(newLat, newLng);
      });

      // Handle map click
      mapInstanceRef.current.addListener('click', (event) => {
        const newLat = event.latLng.lat();
        const newLng = event.latLng.lng();
        markerRef.current.setPosition({ lat: newLat, lng: newLng });
        onLocationChange(newLat, newLng);
      });
    }
  }, [isLoaded, lat, lng, onLocationChange]);

  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      const newPosition = { lat, lng };
      markerRef.current.setPosition(newPosition);
      mapInstanceRef.current.setCenter(newPosition);
    }
  }, [lat, lng]);

  if (!isLoaded) {
    return (
      <div style={{
        width: "100%",
        height: 300,
        border: "2px solid #e5e7eb",
        borderRadius: 8,
        background: "#f9fafb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6b7280"
      }}>
        Loading map...
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: 300,
        border: "2px solid #e5e7eb",
        borderRadius: 8,
      }}
    />
  );
}

export default function AddToiletForm() {
  const { authUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    address: "",
    latitude: 51.5074,
    longitude: -0.1278,
    locationType: "",
    accessibility: "not_sure",
    toiletTypes: [],
    extras: [],
    rating: 3,
    review: "",
    quickTags: [],
    photo: null,
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [mapStatus, setMapStatus] = useState("Location pinned");
  const [isGeocodingEnabled, setIsGeocodingEnabled] = useState(false);

  // Check if geocoding is available
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      setIsGeocodingEnabled(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleMulti = (key, id) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((x) => x !== id) : [...prev[key], id],
    }));
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, photo: file }));
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file && file.type.startsWith('image/')) {
      setForm((prev) => ({ ...prev, photo: file }));
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleLocationChange = (lat, lng) => {
    setForm(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
    
    // Reverse geocode to get address
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results[0]) {
            setForm(prev => ({
              ...prev,
              address: results[0].formatted_address
            }));
            setMapStatus("Location updated with address");
          } else {
            setMapStatus("Location updated, but address could not be retrieved");
          }
        }
      );
    } else {
      setMapStatus("Location updated");
    }
  };

  const handleAddressChange = (e) => {
    const address = e.target.value;
    setForm(prev => ({ ...prev, address }));
    
    // Geocode address to coordinates
    if (address && window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      const timeoutId = setTimeout(() => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            setForm(prev => ({
              ...prev,
              latitude: location.lat(),
              longitude: location.lng()
            }));
            setMapStatus("Map updated from address");
          } else {
            setMapStatus("Could not update map from address");
          }
        });
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      setMapStatus("Getting your location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          handleLocationChange(lat, lng);
        },
        (error) => {
          setMapStatus("Could not get your location");
          console.error("Geolocation error:", error);
        }
      );
    } else {
      setMapStatus("Geolocation is not supported by this browser");
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
    // Add toilet
    const toiletDocRef = await addDoc(collection(db, 'toilets'), {
      name: form.name,
      address: form.address,
      location: { latitude: Number(form.latitude), longitude: Number(form.longitude) },
      createdAt: serverTimestamp(),
      createdBy: authUser.uid,
      features: {
        hasSoap: form.extras.includes('soap'),
        hasToiletPaper: form.extras.includes('toilet_paper'),
        babyChanging: form.extras.includes('baby_changing'),
      },
      photoUrls,
      toiletTypes: form.toiletTypes,
      quickTags: form.quickTags,
      accessibility: form.accessibility,
      locationType: form.locationType,
      averageRating: form.rating,
      reviewCount: 1,
    });
    // Add review
    await addDoc(collection(db, 'reviews'), {
      createdAt: serverTimestamp(),
      comment: form.review,
      rating: form.rating,
      toiletId: toiletDocRef.id,
      userId: authUser.uid,
    });
    alert('Toilet and review added!');
    // Optionally reset form or redirect
  };

  const tagsByCategory = {
    positive: QUICK_TAGS.slice(0, 4),
    neutral: QUICK_TAGS.slice(4, 6),
    negative: QUICK_TAGS.slice(6),
  };

  const getStatusColor = () => {
    if (mapStatus.includes("updated")) return "#10b981";
    if (mapStatus.includes("Could not") || mapStatus.includes("not supported")) return "#f59e0b";
    return "#6b7280";
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#f9fafb", 
      padding: "32px 16px" 
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 700,
          margin: "0 auto",
          padding: 32,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 16px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, marginBottom: 8 }}>Add a New Loo</h1>
          <p style={{ color: "#6b7280", margin: 0, fontSize: 16 }}>
            Found a toilet worth talking about? Fill in the details below. Your contribution helps everyone!
          </p>
        </div>

        {/* Location Details */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <MapPin color="#2563eb" size={20} />
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Location Details</h2>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
              Toilet Name*
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g., Starbucks, Central Station"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "2px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 16,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "#2563eb"}
              onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
            />
            <p style={{ color: "#6b7280", fontSize: 14, margin: "4px 0 0 0" }}>
              Give it a name people will recognize.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
              Address (Optional)
            </label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleAddressChange}
              placeholder="e.g., Main Street 123, London"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "2px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 16,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "#2563eb"}
              onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
            />
            <p style={{ color: "#6b7280", fontSize: 14, margin: "4px 0 0 0" }}>
              Type the address and the map will update automatically.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontWeight: 500 }}>Location on Map*</label>
              <button
                type="button"
                onClick={handleUseMyLocation}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                <Navigation size={16} />
                Use My Location
              </button>
            </div>
            
            <GoogleMap 
              lat={form.latitude} 
              lng={form.longitude} 
              onLocationChange={handleLocationChange}
            />
            
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              background: mapStatus.includes("Could not") ? "#fef3c7" : "#ecfdf5",
              border: `1px solid ${getStatusColor()}`,
              borderRadius: 8,
              marginTop: 8,
              fontSize: 14,
            }}>
              <MapPin size={16} color={getStatusColor()} />
              <span style={{ color: getStatusColor() }}>{mapStatus}. Click on the map or drag the marker to adjust the location.</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Latitude</label>
              <input
                type="number"
                step="any"
                value={form.latitude.toFixed(6)}
                onChange={(e) => setForm(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 16,
                  background: "#fff",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Longitude</label>
              <input
                type="number"
                step="any"
                value={form.longitude.toFixed(6)}
                onChange={(e) => setForm(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 16,
                  background: "#fff",
                }}
              />
            </div>
          </div>
        </section>

        {/* Location & Access Info */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Landmark color="#2563eb" size={20} />
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Location & Access Info</h2>
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Location Type</label>
            <select
              name="locationType"
              value={form.locationType}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "2px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 16,
                background: "#f9fafb",
                color: form.locationType ? "#000" : "#9ca3af",
              }}
            >
              <option value="">Select location type</option>
              {LOCATION_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Accessibility */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Accessibility color="#2563eb" size={20} />
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Accessibility</h2>
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>
              Is this toilet wheelchair accessible?*
            </label>
            <div style={{ display: "flex", gap: 24 }}>
              {ACCESSIBILITY_OPTIONS.map((option) => (
                <label key={option.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="accessibility"
                    value={option.value}
                    checked={form.accessibility === option.value}
                    onChange={handleChange}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Types of Thrones */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Toilet color="#2563eb" size={20} />
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Types of Thrones</h2>
          </div>
          
          <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 14 }}>
            Select all toilet types present.
          </p>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {TOILET_TYPES.map((type) => (
              <div
                key={type.id}
                onClick={() => toggleMulti("toiletTypes", type.id)}
                style={{
                  padding: "16px",
                  border: `2px solid ${form.toiletTypes.includes(type.id) ? "#2563eb" : "#e5e7eb"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "center",
                  background: form.toiletTypes.includes(type.id) ? "#eff6ff" : "#fff",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{type.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{type.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Extras Available */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Puzzle color="#2563eb" size={20} />
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Extras Available</h2>
          </div>
          
          <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 14 }}>
            Tag the available extras. Hover for hints!
          </p>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {EXTRAS.map((extra) => (
              <div
                key={extra.id}
                onClick={() => toggleMulti("extras", extra.id)}
                style={{
                  padding: "16px",
                  border: `2px solid ${form.extras.includes(extra.id) ? "#2563eb" : "#e5e7eb"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "center",
                  background: form.extras.includes(extra.id) ? "#eff6ff" : "#fff",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{extra.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{extra.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Rating & Review */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Star color="#2563eb" size={20} />
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Rating & Review</h2>
          </div>
          
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>Star Rating*</label>
            <StarRating rating={form.rating} setRating={(rating) => setForm(prev => ({ ...prev, rating }))} />
            <p style={{ color: "#6b7280", fontSize: 14, margin: "8px 0 0 0" }}>
              From 1 (disaster area) to 5 (luxury suite).
            </p>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
              Short Review (Optional)
            </label>
            <textarea
              name="review"
              value={form.review}
              onChange={handleChange}
              placeholder="e.g., Surprisingly clean! But the music was terrible."
              rows={4}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "2px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 16,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
              onFocus={(e) => e.target.style.borderColor = "#2563eb"}
              onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
            />
            <p style={{ color: "#6b7280", fontSize: 14, margin: "4px 0 0 0" }}>
              Just a few words about your experience.
            </p>
          </div>
        </section>

        {/* Quick Tags */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Tag color="#2563eb" size={20} />
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Quick Tags – How was it?</h2>
          </div>
          
          <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 14 }}>
            Optionally pick a few quick tags to describe your experience
          </p>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              Positive Vibes ✨
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tagsByCategory.positive.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleMulti("quickTags", tag.id)}
                  style={{
                    padding: "8px 16px",
                    border: `2px solid ${form.quickTags.includes(tag.id) ? "#10b981" : "#e5e7eb"}`,
                    borderRadius: 20,
                    background: form.quickTags.includes(tag.id) ? "#dcfce7" : "#fff",
                    cursor: "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{tag.emoji}</span>
                  <span>{tag.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              Just the Facts 🤷
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tagsByCategory.neutral.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleMulti("quickTags", tag.id)}
                  style={{
                    padding: "8px 16px",
                    border: `2px solid ${form.quickTags.includes(tag.id) ? "#6b7280" : "#e5e7eb"}`,
                    borderRadius: 20,
                    background: form.quickTags.includes(tag.id) ? "#f3f4f6" : "#fff",
                    cursor: "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{tag.emoji}</span>
                  <span>{tag.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              Uh Oh... 💩
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tagsByCategory.negative.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleMulti("quickTags", tag.id)}
                  style={{
                    padding: "8px 16px",
                    border: `2px solid ${form.quickTags.includes(tag.id) ? "#dc2626" : "#e5e7eb"}`,
                    borderRadius: 20,
                    background: form.quickTags.includes(tag.id) ? "#fee2e2" : "#fff",
                    cursor: "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{tag.emoji}</span>
                  <span>{tag.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Photo Upload */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Camera color="#2563eb" size={20} />
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Photo Upload</h2>
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
              Photo (Optional)
            </label>
            
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                border: `2px dashed ${dragOver ? "#2563eb" : "#d1d5db"}`,
                borderRadius: 8,
                padding: 40,
                textAlign: "center",
                background: dragOver ? "#eff6ff" : "#f9fafb",
                transition: "all 0.2s",
                position: "relative",
              }}
            >
              {photoPreview ? (
                <div>
                  <img
                    src={photoPreview}
                    alt="Preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 200,
                      borderRadius: 8,
                      marginBottom: 16,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setForm(prev => ({ ...prev, photo: null }));
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Remove Photo
                  </button>
                </div>
              ) : (
                <div>
                  <Camera size={48} color="#9ca3af" style={{ marginBottom: 16 }} />
                  <div style={{ marginBottom: 16 }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhoto}
                      style={{ display: "none" }}
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      style={{
                        padding: "12px 24px",
                        background: "#6366f1",
                        color: "white",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 16,
                        fontWeight: 500,
                      }}
                    >
                      Choose File
                    </label>
                    <span style={{ marginLeft: 16, color: "#6b7280" }}>No file chosen</span>
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 14 }}>
                    <div>Drag & drop or click to upload.</div>
                    <div style={{ marginTop: 4 }}>Show the good, the bad, and the moldy.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", paddingTop: 16 }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              background: "#f3f4f6",
              color: "#374151",
              fontWeight: 600,
              fontSize: 16,
              border: "none",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#e5e7eb"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#f3f4f6"}
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
              fontSize: 16,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#1d4ed8"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#2563eb"}
          >
            <Save size={16} />
            <Toilet size={16} />
            Flush & Save
          </button>
        </div>
      </form>
    </div>
  );
}