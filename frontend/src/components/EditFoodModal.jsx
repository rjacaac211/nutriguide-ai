import { useState, useEffect } from "react";
import { updateFoodLogItem, deleteFoodLogItem, getFoodDetails } from "../api/client";

function buildPatchFromAmountAndUnit(food, amount, unit) {
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
  const patch = {
    grams,
    calories: Math.round((p.calories ?? 0) * ratio * 10) / 10,
    protein: Math.round((p.protein ?? 0) * ratio * 10) / 10,
    carbs: Math.round((p.carbs ?? 0) * ratio * 10) / 10,
    fat: Math.round((p.fat ?? 0) * ratio * 10) / 10,
  };
  if (portionDescription != null && portionAmount != null) {
    patch.portionDescription = portionDescription;
    patch.portionAmount = portionAmount;
  }
  return patch;
}

export default function EditFoodModal({
  isOpen,
  onClose,
  log,
  itemIndex,
  item,
  userId,
  onSaved,
  onDeleted,
}) {
  const [foodDetails, setFoodDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("g");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && item?.fdcId) {
      setDetailsLoading(true);
      getFoodDetails(item.fdcId)
        .then((details) => {
          const food = details ?? {
            ...item,
            portions: [],
            per100g: item.grams
              ? {
                  calories: ((item.calories ?? 0) * 100) / item.grams,
                  protein: ((item.protein ?? 0) * 100) / item.grams,
                  carbs: ((item.carbs ?? 0) * 100) / item.grams,
                  fat: ((item.fat ?? 0) * 100) / item.grams,
                }
              : {},
          };
          setFoodDetails(food);
          if (item.portionDescription != null && item.portionAmount != null && details?.portions?.length) {
            const idx = details.portions.findIndex(
              (p) =>
                String(p.portionDescription).toLowerCase() ===
                String(item.portionDescription).toLowerCase()
            );
            if (idx >= 0) {
              setSelectedUnit(idx);
              setAmount(String(item.portionAmount));
            } else {
              setSelectedUnit("g");
              setAmount(String(item.grams ?? 100));
            }
          } else {
            setSelectedUnit("g");
            setAmount(String(item.grams ?? 100));
          }
        })
        .catch(() => {
          const g = item.grams ?? 100;
          setFoodDetails({
            ...item,
            portions: [],
            per100g: g
              ? {
                  calories: ((item.calories ?? 0) * 100) / g,
                  protein: ((item.protein ?? 0) * 100) / g,
                  carbs: ((item.carbs ?? 0) * 100) / g,
                  fat: ((item.fat ?? 0) * 100) / g,
                }
              : {},
          });
          setSelectedUnit("g");
          setAmount(String(g));
        })
        .finally(() => setDetailsLoading(false));
    }
  }, [isOpen, item?.fdcId, item?.grams, item?.portionDescription, item?.portionAmount]);

  if (!isOpen || !log || !item) return null;

  const displayFood = foodDetails ?? item;
  const portions = foodDetails?.portions ?? [];
  const unitOptions = [
    { value: "g", label: "Grams" },
    ...portions.map((p, i) => ({
      value: i,
      label: p.portionDescription,
    })),
  ];

  const handleSave = async (e) => {
    e.preventDefault();
    const patch = buildPatchFromAmountAndUnit(displayFood, amount, selectedUnit);
    if (!patch || patch.grams <= 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateFoodLogItem(userId, log.id, itemIndex, patch);
      onSaved?.();
    } catch (err) {
      setError(err.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remove this food from your log?")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteFoodLogItem(userId, log.id, itemIndex);
      onDeleted?.();
    } catch (err) {
      setError(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const patch = buildPatchFromAmountAndUnit(displayFood, amount, selectedUnit);
  const previewCal = patch ? Math.round(patch.calories) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal edit-food-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit food</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSave} className="modal-body">
          <p className="modal-selected-food">{item.description}</p>
          {item.brandOwner && (
            <p className="modal-selected-brand">{item.brandOwner}</p>
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
                    setAmount(v === "g" ? String(item.grams ?? 100) : "1");
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
            </>
          )}
          {amount && Number(amount) > 0 && patch && (
            <p className="modal-preview">
              ≈ {previewCal} kcal
              {patch.grams ? ` (${Math.round(patch.grams)}g)` : ""}
            </p>
          )}
          {error && <p className="modal-error">{error}</p>}
          <div className="modal-actions modal-actions-between">
            <button
              type="button"
              className="modal-btn modal-btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Removing..." : "Remove"}
            </button>
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="modal-btn modal-btn-primary"
                disabled={detailsLoading || !amount || Number(amount) <= 0 || submitting}
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
