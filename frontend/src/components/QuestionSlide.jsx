import { useState, useEffect } from "react";
import { QUESTION_TYPES } from "../config/onboardingQuestions";

// Unit conversion helpers
function lbsToKg(lbs) {
  return lbs / 2.205;
}
function kgToLbs(kg) {
  return kg * 2.205;
}
function ftInToCm(feet, inches) {
  return feet * 30.48 + inches * 2.54;
}
function cmToFtIn(cm) {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

export default function QuestionSlide({ question, value, onChange, hint }) {
  const [localValue, setLocalValue] = useState(value ?? (question.type === QUESTION_TYPES.MULTI ? [] : ""));
  const [unit, setUnit] = useState(question.units?.[0]?.value ?? "kg");
  const [ftIn, setFtIn] = useState(() => {
    if (question.field === "height_cm" && typeof value === "number") {
      return cmToFtIn(value);
    }
    return { feet: 5, inches: 6 };
  });

  useEffect(() => {
    setLocalValue(value ?? (question.type === QUESTION_TYPES.MULTI ? [] : ""));
    if (question.field === "height_cm" && typeof value === "number") {
      setFtIn(cmToFtIn(value));
    }
  }, [question.id, value, question.type, question.field]);

  useEffect(() => {
    if (value != null) return;
    if (question.type === QUESTION_TYPES.NUMBER_UNIT && question.field === "height_cm") {
      const cm = unit === "cm" ? 170 : ftInToCm(ftIn.feet, ftIn.inches);
      onChange(cm);
    } else if (question.type === QUESTION_TYPES.NUMBER_UNIT && (question.field === "weight_kg" || question.field === "goal_weight_kg")) {
      onChange(70);
    } else if (question.type === QUESTION_TYPES.SLIDER) {
      onChange(question.min);
    }
  }, [question.id]);

  const handleSingleSelect = (choiceValue) => {
    setLocalValue(choiceValue);
    onChange(choiceValue);
  };

  const handleMultiToggle = (choiceValue) => {
    const arr = Array.isArray(localValue) ? [...localValue] : [];
    const idx = arr.indexOf(choiceValue);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(choiceValue);
    setLocalValue(arr);
    onChange(arr);
  };

  const handleDateChange = (e) => {
    const v = e.target.value;
    setLocalValue(v);
    onChange(v || null);
  };

  const handleNumberChange = (e) => {
    const raw = e.target.value;
    const num = parseFloat(raw) || 0;
    setLocalValue(raw);

    if (question.field === "height_cm") {
      const cm = unit === "cm" ? num : ftInToCm(ftIn.feet, ftIn.inches);
      onChange(unit === "cm" ? num : cm);
    } else if (question.field === "weight_kg" || question.field === "goal_weight_kg") {
      const kg = unit === "kg" ? num : lbsToKg(num);
      onChange(unit === "kg" ? num : kg);
    } else {
      onChange(num);
    }
  };

  const handleUnitChange = (u) => {
    setUnit(u);
    if (question.field === "height_cm") {
      if (u === "cm") {
        const cm = typeof value === "number" ? value : 170;
        setLocalValue(String(cm));
        onChange(cm);
      } else {
        const cm = typeof value === "number" ? value : 170;
        const { feet, inches } = cmToFtIn(cm);
        setFtIn({ feet, inches });
        setLocalValue(`${feet}'${inches}"`);
        onChange(cm);
      }
    } else if (question.field === "weight_kg" || question.field === "goal_weight_kg") {
      const kg = typeof value === "number" ? value : 70;
      if (u === "kg") {
        setLocalValue(String(kg));
        onChange(kg);
      } else {
        setLocalValue(String(Math.round(kgToLbs(kg))));
        onChange(kg);
      }
    }
  };

  const handleFtInChange = (part, val) => {
    const next = { ...ftIn, [part]: parseInt(val, 10) || 0 };
    setFtIn(next);
    const cm = ftInToCm(next.feet, next.inches);
    onChange(cm);
  };

  const handleSliderChange = (e) => {
    const v = parseFloat(e.target.value);
    setLocalValue(v);
    onChange(v);
  };

  const renderInput = () => {
    switch (question.type) {
      case QUESTION_TYPES.SINGLE:
        return (
          <div className="question-choices">
            {question.choices.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`question-choice ${localValue === c.value ? "selected" : ""}`}
                onClick={() => handleSingleSelect(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        );

      case QUESTION_TYPES.MULTI:
        return (
          <div className="question-choices">
            {question.choices.map((c) => {
              const checked = Array.isArray(localValue) && localValue.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  className={`question-choice ${checked ? "selected" : ""}`}
                  onClick={() => handleMultiToggle(c.value)}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        );

      case QUESTION_TYPES.DATE:
        const dateVal = (() => {
          const v = localValue || "";
          if (!v) return "";
          if (typeof v === "string" && v.includes("T")) return v.slice(0, 10);
          return v;
        })();
        return (
          <div className="question-date">
            <input
              type="date"
              value={dateVal}
              onChange={handleDateChange}
              className="question-date-input"
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        );

      case QUESTION_TYPES.NUMBER_UNIT:
        if (question.field === "height_cm" && unit === "ft_in") {
          return (
            <div className="question-number-unit">
              <div className="question-ft-in">
                <input
                  type="number"
                  min="3"
                  max="8"
                  value={ftIn.feet}
                  onChange={(e) => handleFtInChange("feet", e.target.value)}
                />
                <span>ft</span>
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={ftIn.inches}
                  onChange={(e) => handleFtInChange("inches", e.target.value)}
                />
                <span>in</span>
              </div>
              <div className="question-unit-tabs">
                {question.units.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    className={unit === u.value ? "active" : ""}
                    onClick={() => handleUnitChange(u.value)}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        const numVal = question.field === "height_cm" && unit === "cm"
          ? (typeof value === "number" ? value : 170)
          : question.field === "weight_kg" || question.field === "goal_weight_kg"
            ? unit === "kg"
              ? (typeof value === "number" ? value : 70)
              : (typeof value === "number" ? Math.round(kgToLbs(value)) : 154)
            : localValue;
        return (
          <div className="question-number-unit">
            <input
              type="number"
              min={question.min}
              max={question.max}
              step={question.field.includes("weight") ? 0.1 : 1}
              value={typeof numVal === "number" ? numVal : localValue}
              onChange={(e) => {
                const v = e.target.value;
                setLocalValue(v);
                const n = parseFloat(v);
                if (question.field === "height_cm") onChange(unit === "cm" ? n : ftInToCm(ftIn.feet, ftIn.inches));
                else if (question.field.includes("weight")) onChange(unit === "kg" ? n : lbsToKg(n));
                else onChange(n);
              }}
              className="question-number-input"
            />
            <div className="question-unit-tabs">
              {question.units?.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  className={unit === u.value ? "active" : ""}
                  onClick={() => handleUnitChange(u.value)}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        );

      case QUESTION_TYPES.SLIDER:
        const sliderVal = typeof localValue === "number" ? localValue : question.min;
        return (
          <div className="question-slider-wrap">
            <div className="question-slider-value">{sliderVal} {question.unit}</div>
            <input
              type="range"
              min={question.min}
              max={question.max}
              step={question.step}
              value={sliderVal}
              onChange={handleSliderChange}
              className="question-slider"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="question-slide">
      <h2 className="question-title">{question.question}</h2>
      {renderInput()}
      {hint && <p className="question-hint">{hint}</p>}
    </div>
  );
}
