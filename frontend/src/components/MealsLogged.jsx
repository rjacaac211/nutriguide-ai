import { useState } from "react";
import AddFoodModal from "./AddFoodModal";
import EditFoodModal from "./EditFoodModal";
import { createFoodLog, updateFoodLog } from "../api/client";

const MEALS = [
  { id: "breakfast", label: "Breakfast", range: "406 - 569 kcal" },
  { id: "lunch", label: "Lunch", range: "488 - 650 kcal" },
  { id: "dinner", label: "Dinner", range: "634 - 829 kcal" },
  { id: "snack", label: "Snack", range: "" },
];

export default function MealsLogged({ userId, selectedDate, logs, onRefresh }) {
  const [addModalMeal, setAddModalMeal] = useState(null);
  const [editState, setEditState] = useState(null);

  const handleAddClick = (mealType) => {
    setAddModalMeal(mealType);
  };

  const handleAddFood = async ({ mealType, items, loggedAt }) => {
    const dateStr = typeof loggedAt === "string" ? loggedAt : loggedAt?.toISOString?.()?.slice(0, 10);
    const existing = logs?.find((l) => l.mealType === mealType);
    if (existing) {
      const mergedItems = [...(existing.items ?? []), ...items];
      await updateFoodLog(userId, existing.id, { items: mergedItems });
    } else {
      await createFoodLog(userId, { mealType, items, loggedAt: dateStr });
    }
    onRefresh?.();
  };

  const handleEditItem = (log, itemIndex, item) => {
    setEditState({ log, itemIndex, item });
  };

  const handleEditClose = () => {
    setEditState(null);
  };

  const handleEditSaved = () => {
    setEditState(null);
    onRefresh?.();
  };

  const handleDeleteItem = () => {
    setEditState(null);
    onRefresh?.();
  };

  const logsByMeal = {};
  for (const m of MEALS) {
    logsByMeal[m.id] = logs?.find((l) => l.mealType === m.id) ?? null;
  }

  return (
    <div className="meals-logged">
      <h3 className="meals-title">MEALS LOGGED</h3>
      <div className="meals-list">
        {MEALS.map((meal) => {
          const log = logsByMeal[meal.id];
          const items = log?.items ?? [];
          const totalCal = log?.totalCal ?? 0;

          return (
            <div key={meal.id} className="meal-card">
              <div className="meal-info">
                <span className="meal-name">{meal.label}</span>
                {meal.range && (
                  <span className="meal-range">Recommended: {meal.range}</span>
                )}
                {items.length > 0 && (
                  <div className="meal-items">
                    {items.map((it, idx) => (
                      <div key={idx} className="meal-item-row">
                        <span className="meal-item-name">
                          {it.description}
                          {it.grams ? ` (${it.grams}g)` : ""}
                        </span>
                        <span className="meal-item-cal">{Math.round(it.calories ?? 0)} kcal</span>
                        <button
                          type="button"
                          className="meal-item-edit"
                          onClick={() => handleEditItem(log, idx, it)}
                          aria-label="Edit"
                        >
                          Edit
                        </button>
                      </div>
                    ))}
                    <div className="meal-item-total">
                      Total: {Math.round(totalCal)} kcal
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="meal-add-btn"
                aria-label={`Add ${meal.label}`}
                onClick={() => handleAddClick(meal.id)}
              >
                +
              </button>
            </div>
          );
        })}
      </div>

      <AddFoodModal
        isOpen={!!addModalMeal}
        onClose={() => setAddModalMeal(null)}
        mealType={addModalMeal ?? "snack"}
        onAdd={handleAddFood}
        selectedDate={selectedDate}
      />

      {editState && (
        <EditFoodModal
          isOpen={!!editState}
          onClose={handleEditClose}
          log={editState.log}
          itemIndex={editState.itemIndex}
          item={editState.item}
          userId={userId}
          onSaved={handleEditSaved}
          onDeleted={handleDeleteItem}
        />
      )}
    </div>
  );
}
