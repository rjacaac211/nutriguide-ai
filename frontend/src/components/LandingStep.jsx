export default function LandingStep({ onStart }) {
  return (
    <div className="landing-step">
      <header className="landing-header">
        <h1>NutriGuide AI</h1>
        <p>Personalized nutrition recommendations</p>
      </header>
      <div className="landing-content">
        <p className="landing-subtitle">
          Create your profile to get personalized meal plans, calorie goals, and AI-powered nutrition advice.
        </p>
        <button type="button" className="landing-create-btn" onClick={onStart}>
          Create Account
        </button>
      </div>
    </div>
  );
}
