import { useState } from "react";
import { getQuestionsForProfile } from "../config/onboardingQuestions";
import QuestionSlide from "./QuestionSlide";

const HINT = "This helps us personalize your daily recommendations.";

export default function OnboardingWizard({ profile, onUpdate, onComplete, onBack }) {
  const questions = getQuestionsForProfile(profile);
  const [stepIndex, setStepIndex] = useState(0);
  const currentQuestion = questions[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === questions.length - 1;
  const progress = ((stepIndex + 1) / questions.length) * 100;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (isFirst) {
      onBack();
    } else {
      setStepIndex((i) => i - 1);
    }
  };

  const handleChange = (val) => {
    onUpdate(currentQuestion.field, val);
  };

  const handleChoiceChange = (field, val) => {
    onUpdate(field, val);
  };

  const canProceed = () => {
    const val = profile[currentQuestion?.field];
    if (!currentQuestion) return false;
    switch (currentQuestion.type) {
      case "single":
        return val != null && val !== "";
      case "multi":
        return Array.isArray(val);
      case "date":
        return val != null && val !== "";
      case "number+unit":
        return typeof val === "number" && val > 0;
      case "slider":
        return typeof val === "number";
      default:
        return false;
    }
  };

  return (
    <div className="onboarding-wizard">
      <div className="onboarding-header">
        <button type="button" className="onboarding-back" onClick={handleBack} aria-label="Back">
          &lt;
        </button>
        <div className="onboarding-progress-bar">
          <div className="onboarding-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="onboarding-content">
        <QuestionSlide
          question={currentQuestion}
          value={profile[currentQuestion?.field]}
          onChange={(val) => handleChoiceChange(currentQuestion.field, val)}
          hint={HINT}
        />
      </div>

      <div className="onboarding-footer">
        <button
          type="button"
          className="onboarding-next-btn"
          onClick={handleNext}
          disabled={!canProceed()}
        >
          {isLast ? "NEXT" : "NEXT"}
        </button>
      </div>
    </div>
  );
}
