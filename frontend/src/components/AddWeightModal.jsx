import { useState, useEffect } from "react";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AddWeightModal({ isOpen, onClose, onAdd, initialLog, initialDate, mode = "add" }) {
  const isEdit = mode === "edit";
  const [date, setDate] = useState(initialDate ?? todayStr());
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (initialLog) {
        setWeightKg(String(initialLog.weightKg ?? ""));
        setNotes(initialLog.notes ?? "");
        setDate((initialLog.date ?? "").slice(0, 10) || todayStr());
      } else {
        setDate((initialDate ?? todayStr()).slice(0, 10));
        setWeightKg("");
        setNotes("");
      }
      setError(null);
    }
  }, [isOpen, initialLog, initialDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const w = parseFloat(weightKg);
    if (isNaN(w) || w <= 0) {
      setError("Weight must be a positive number");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit) {
        await onAdd({ weightKg: w, notes: notes.trim() || undefined });
      } else {
        await onAdd({ weightKg: w, date, notes: notes.trim() || undefined });
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal add-weight-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? "Edit weight" : "Add weight"}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {!isEdit && (
            <label className="modal-label">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={todayStr()}
                className="modal-grams-input"
                required
              />
            </label>
          )}
          <label className="modal-label">
            Weight (kg)
            <input
              type="number"
              min="1"
              max="500"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="modal-grams-input"
              placeholder="e.g. 70"
              required
            />
          </label>
          <label className="modal-label">
            Notes (optional)
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="modal-grams-input"
              placeholder="e.g. morning weigh-in"
            />
          </label>
          {error && <p className="modal-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn modal-btn-primary"
              disabled={!weightKg || parseFloat(weightKg) <= 0 || submitting}
            >
              {submitting ? "Saving..." : isEdit ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
