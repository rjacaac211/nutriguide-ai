import { useState, useEffect } from "react";
import { searchFoods, getFoodDetails } from "../api/client";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debouncedValue;
}

function buildItem(food, amount, unit) {
  const amt = Number(amount) || 0;
  if (amt <= 0) return null;

  let grams;
  let portionDescription = null;
  let portionAmount = null;

  if (unit === "g") {
    grams = amt;
  } else if (typeof unit === "number" && Array.isArray(food.portions) && food.portions[unit]) {
    const portion = food.portions[unit];
    grams = amt * portion.gramWeight;
    portionDescription = portion.portionDescription;
    portionAmount = amt;
  } else {
    grams = amt;
  }

  const p = food.per100g ?? {};
  const ratio = grams / 100;
  const item = {
    fdcId: food.fdcId,
    description: food.description,
    brandOwner: food.brandOwner ?? null,
    referenceGrams: food.referenceGrams ?? 100,
    grams,
    calories: Math.round((p.calories ?? 0) * ratio * 10) / 10,
    protein: Math.round((p.protein ?? 0) * ratio * 10) / 10,
    carbs: Math.round((p.carbs ?? 0) * ratio * 10) / 10,
    fat: Math.round((p.fat ?? 0) * ratio * 10) / 10,
  };
  if (portionDescription != null && portionAmount != null) {
    item.portionDescription = portionDescription;
    item.portionAmount = portionAmount;
  }
  return item;
}

export default function AddFoodModal({ isOpen, onClose, mealType, onAdd, selectedDate }) {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [foodDetails, setFoodDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("g");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelected(null);
      setFoodDetails(null);
      setAmount("");
      setSelectedUnit("g");
      setError(null);
    }
  }, [isOpen]);

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

  const handleSelect = async (food) => {
    setSelected(food);
    setFoodDetails(null);
    setAmount("");
    setSelectedUnit("g");
    setDetailsLoading(true);
    setError(null);
    try {
      const details = await getFoodDetails(food.fdcId);
      setFoodDetails(details ?? { ...food, portions: [] });
      setAmount(details?.portions?.length ? "1" : "100");
    } catch (err) {
      setError(err.message || "Failed to load food details");
      setFoodDetails({ ...food, portions: [] });
      setAmount("100");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleBack = () => {
    setSelected(null);
    setFoodDetails(null);
    setAmount("");
    setSelectedUnit("g");
  };

  const displayFood = foodDetails ?? selected;
  const portions = foodDetails?.portions ?? [];
  const unitOptions = [
    { value: "g", label: "Grams" },
    ...portions.map((p, i) => ({
      value: i,
      label: p.portionDescription,
    })),
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayFood || !amount || Number(amount) <= 0) return;
    const item = buildItem(displayFood, amount, selectedUnit);
    if (!item) return;
    setSubmitting(true);
    setError(null);
    try {
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
            <p className="modal-selected-food">{displayFood?.description}</p>
            {displayFood?.brandOwner && (
              <p className="modal-selected-brand">{displayFood.brandOwner}</p>
            )}
            {detailsLoading ? (
              <p className="modal-loading">Loading portions...</p>
            ) : (
              <>
                <label className="modal-label">
                  Unit
                  <select
                    value={selectedUnit === "g" ? "g" : String(selectedUnit)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedUnit(v === "g" ? "g" : parseInt(v, 10));
                      setAmount(v === "g" ? "100" : "1");
                    }}
                    className="modal-unit-select"
                  >
                    {unitOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="modal-label">
                  Amount
                  <input
                    type="number"
                    min="0.1"
                    step={selectedUnit === "g" ? "1" : "0.1"}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="modal-grams-input"
                    required
                  />
                </label>
                {amount && Number(amount) > 0 && displayFood && (() => {
                  const item = buildItem(displayFood, amount, selectedUnit);
                  if (!item) return null;
                  return (
                    <p className="modal-preview">
                      ≈ {item.calories} kcal, {item.protein}g protein, {item.carbs}g carbs, {item.fat}g fat
                      {item.grams ? ` (${Math.round(item.grams)}g)` : ""}
                    </p>
                  );
                })()}
              </>
            )}
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="modal-btn modal-btn-primary"
                disabled={detailsLoading || !amount || Number(amount) <= 0 || submitting}
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
