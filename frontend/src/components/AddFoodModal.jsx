import { useState, useEffect, useCallback } from "react";
import { searchFoods } from "../api/client";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debouncedValue;
}

function buildItem(food, grams) {
  const g = Number(grams) || 0;
  const p = food.per100g ?? {};
  const ratio = g / 100;
  return {
    fdcId: food.fdcId,
    description: food.description,
    brandOwner: food.brandOwner ?? null,
    referenceGrams: food.referenceGrams ?? 100,
    grams: g,
    calories: Math.round((p.calories ?? 0) * ratio * 10) / 10,
    protein: Math.round((p.protein ?? 0) * ratio * 10) / 10,
    carbs: Math.round((p.carbs ?? 0) * ratio * 10) / 10,
    fat: Math.round((p.fat ?? 0) * ratio * 10) / 10,
  };
}

export default function AddFoodModal({ isOpen, onClose, mealType, onAdd, selectedDate }) {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setFoods([]);
      return;
    }
    setLoading(true);
    setError(null);
    searchFoods(debouncedQuery, 25)
      .then(setFoods)
      .catch((err) => {
        setError(err.message || "Search failed");
        setFoods([]);
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const handleSelect = (food) => {
    setSelected(food);
    setGrams("100");
  };

  const handleBack = () => {
    setSelected(null);
    setGrams("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected || !grams || Number(grams) <= 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const item = buildItem(selected, grams);
      const dateStr =
        typeof selectedDate === "string"
          ? selectedDate
          : selectedDate?.toISOString?.()?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
      await onAdd({ mealType, items: [item], loggedAt: dateStr });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to add food");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal add-food-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add food to {mealType}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {!selected ? (
          <>
            <div className="modal-body">
              <input
                type="text"
                className="modal-search-input"
                placeholder="Search foods (e.g. chicken, apple)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {loading && <p className="modal-loading">Searching...</p>}
              {error && <p className="modal-error">{error}</p>}
              <div className="food-search-results">
                {foods.map((f) => (
                  <button
                    key={f.fdcId}
                    type="button"
                    className="food-search-item"
                    onClick={() => handleSelect(f)}
                  >
                    <span className="food-search-name">{f.description}</span>
                    {f.brandOwner && (
                      <span className="food-search-brand">{f.brandOwner}</span>
                    )}
                    <span className="food-search-cal">
                      {(f.per100g?.calories ?? 0).toFixed(0)} kcal / 100g
                    </span>
                  </button>
                ))}
                {!loading && debouncedQuery.length >= 2 && foods.length === 0 && !error && (
                  <p className="modal-empty">No foods found. Try a different search.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="modal-body">
            <button type="button" className="modal-back" onClick={handleBack}>
              ← Back to search
            </button>
            <p className="modal-selected-food">{selected.description}</p>
            {selected.brandOwner && (
              <p className="modal-selected-brand">{selected.brandOwner}</p>
            )}
            <label className="modal-label">
              Amount (grams)
              <input
                type="number"
                min="1"
                step="1"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className="modal-grams-input"
                required
              />
            </label>
            {grams && Number(grams) > 0 && (
              <p className="modal-preview">
                ≈ {buildItem(selected, grams).calories} kcal, {buildItem(selected, grams).protein}g
                protein
              </p>
            )}
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="modal-btn modal-btn-primary"
                disabled={!grams || Number(grams) <= 0 || submitting}
              >
                {submitting ? "Adding..." : "Add"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
