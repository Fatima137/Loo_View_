import React, { useState } from "react";

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

const StarRating = ({ rating, setRating }: { rating: number; setRating: (n: number) => void }) => (
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

export default function ReviewForm({
  onSubmit,
}: {
  onSubmit: (data: {
    toiletTypes: string[];
    extras: string[];
    rating: number;
    review: string;
  }) => void;
}) {
  const [toiletTypes, setToiletTypes] = useState<string[]>([]);
  const [extras, setExtras] = useState<string[]>([]);
  const [rating, setRating] = useState(3);
  const [review, setReview] = useState("");

  const toggle = (arr: string[], id: string, setArr: (a: string[]) => void) => {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ toiletTypes, extras, rating, review });
      }}
      style={{
        maxWidth: 500,
        margin: "0 auto",
        padding: 24,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 8px #0001",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div>
        <h2 style={{ fontWeight: 600, fontSize: 20, marginBottom: 8 }}>Types of Thrones</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {TOILET_TYPES.map((type) => (
            <button
              type="button"
              key={type.id}
              onClick={() => toggle(toiletTypes, type.id, setToiletTypes)}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: toiletTypes.includes(type.id) ? "2px solid #2563eb" : "1px solid #d1d5db",
                background: toiletTypes.includes(type.id) ? "#dbeafe" : "#f9fafb",
                color: "#111",
                fontWeight: 500,
                cursor: "pointer",
                outline: "none",
              }}
              aria-pressed={toiletTypes.includes(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ fontWeight: 600, fontSize: 20, marginBottom: 8 }}>Extras Available</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {EXTRAS.map((extra) => (
            <button
              type="button"
              key={extra.id}
              onClick={() => toggle(extras, extra.id, setExtras)}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: extras.includes(extra.id) ? "2px solid #059669" : "1px solid #d1d5db",
                background: extras.includes(extra.id) ? "#d1fae5" : "#f9fafb",
                color: "#111",
                fontWeight: 500,
                cursor: "pointer",
                outline: "none",
              }}
              aria-pressed={extras.includes(extra.id)}
            >
              {extra.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ fontWeight: 600, fontSize: 20, marginBottom: 8 }}>Rating</h2>
        <StarRating rating={rating} setRating={setRating} />
      </div>

      <div>
        <h2 style={{ fontWeight: 600, fontSize: 20, marginBottom: 8 }}>Your Review</h2>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            padding: 12,
            fontSize: 16,
            resize: "vertical",
          }}
          placeholder="Share your experience..."
        />
      </div>

      <button
        type="submit"
        style={{
          padding: "12px 0",
          borderRadius: 8,
          background: "#2563eb",
          color: "#fff",
          fontWeight: 600,
          fontSize: 18,
          border: "none",
          cursor: "pointer",
        }}
      >
        Submit Review
      </button>
    </form>
  );
}