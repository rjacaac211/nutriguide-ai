const MEALS = [
  { id: "breakfast", label: "Breakfast", range: "406 - 569 kcal" },
  { id: "lunch", label: "Lunch", range: "488 - 650 kcal" },
  { id: "dinner", label: "Dinner", range: "634 - 829 kcal" },
  { id: "snack", label: "Snack", range: "" },
];

export default function MealsLogged() {
  return (
    <div className="meals-logged">
      <h3 className="meals-title">MEALS LOGGED</h3>
      <div className="meals-list">
        {MEALS.map((meal) => (
          <div key={meal.id} className="meal-card">
            <div className="meal-info">
              <span className="meal-name">{meal.label}</span>
              {meal.range && (
                <span className="meal-range">Recommended: {meal.range}</span>
              )}
            </div>
            <button type="button" className="meal-add-btn" aria-label={`Add ${meal.label}`}>
              +
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
