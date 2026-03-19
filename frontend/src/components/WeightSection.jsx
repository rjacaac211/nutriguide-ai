import { useState, useEffect, useCallback } from "react";
import {
  getWeightLogs,
  createWeightLog,
  updateWeightLog,
  deleteWeightLog,
} from "../api/client";
import AddWeightModal from "./AddWeightModal";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateStr) {
  const d = new Date((dateStr || "").split("T")[0]);
  if (isNaN(d.getTime())) return String(dateStr || "");
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function WeightSection({ userId, selectedDate, onRefresh }) {
  const [logs, setLogs] = useState([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editState, setEditState] = useState(null);

  const refresh = useCallback(async () => {
    if (!userId || !selectedDate) return;
    try {
      const weightLogs = await getWeightLogs(userId, selectedDate, selectedDate);
      setLogs(weightLogs);
      onRefresh?.();
    } catch (err) {
      console.error("Weight logs fetch error:", err);
      setLogs([]);
    }
  }, [userId, selectedDate, onRefresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logForSelectedDate = logs[0] ?? null;
  const currentWeight = logForSelectedDate?.weightKg ?? null;
  const hasLogForSelectedDate = logForSelectedDate != null;

  const handleAdd = async ({ weightKg, date, notes }) => {
    await createWeightLog(userId, { weightKg, date, notes });
    setAddModalOpen(false);
    refresh();
  };

  const handleEdit = (log) => {
    setEditState(log);
  };

  const handleEditSave = async ({ weightKg, notes }) => {
    if (!editState) return;
    await updateWeightLog(userId, editState.id, { weightKg, notes });
    setEditState(null);
    refresh();
  };

  const handleEditClose = () => {
    setEditState(null);
  };

  const handleDelete = async (logId) => {
    await deleteWeightLog(userId, logId);
    if (editState?.id === logId) setEditState(null);
    refresh();
  };

  return (
    <div className="weight-section">
      <h3 className="weight-title">Weight</h3>
      <div className="weight-current-card">
        <span className="weight-current-label">Current weight</span>
        <span className="weight-current-value">
          {currentWeight != null ? `${currentWeight} kg` : "—"}
        </span>
      </div>
      <div className="weight-list">
        {logForSelectedDate && (
          <div key={logForSelectedDate.id} className="weight-entry">
            <div className="weight-entry-info">
              <span className="weight-entry-date">{formatDateLabel(logForSelectedDate.date)}</span>
              <span className="weight-entry-value">{logForSelectedDate.weightKg} kg</span>
              {logForSelectedDate.notes && (
                <span className="weight-entry-notes">{logForSelectedDate.notes}</span>
              )}
            </div>
            <div className="weight-entry-actions">
              <button
                type="button"
                className="weight-entry-edit"
                onClick={() => handleEdit(logForSelectedDate)}
                aria-label="Edit"
              >
                Edit
              </button>
              <button
                type="button"
                className="weight-entry-delete"
                onClick={() => handleDelete(logForSelectedDate.id)}
                aria-label="Delete"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
      {!hasLogForSelectedDate && (
        <button
          type="button"
          className="weight-add-btn"
          onClick={() => setAddModalOpen(true)}
          aria-label="Add weight"
        >
          + Add weight
        </button>
      )}

      <AddWeightModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAdd}
        initialDate={selectedDate}
      />

      {editState && (
        <AddWeightModal
          isOpen={!!editState}
          onClose={handleEditClose}
          onAdd={handleEditSave}
          initialLog={editState}
          mode="edit"
        />
      )}
    </div>
  );
}
