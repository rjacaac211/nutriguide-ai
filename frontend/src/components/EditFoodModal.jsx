import { useState } from "react";
import { updateFoodLogItem, deleteFoodLogItem } from "../api/client";

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
  const [grams, setGrams] = useState(String(item?.grams ?? 0));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !log || !item) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    const g = Number(grams);
    if (g <= 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateFoodLogItem(userId, log.id, itemIndex, { grams: g });
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

  const ratio = (Number(grams) || 0) / (item.grams || 1);
  const previewCal = Math.round((item.calories ?? 0) * ratio);

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
            <p className="modal-preview">≈ {previewCal} kcal</p>
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
                disabled={!grams || Number(grams) <= 0 || submitting}
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
