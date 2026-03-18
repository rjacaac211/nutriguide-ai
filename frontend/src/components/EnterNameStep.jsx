import { useState } from "react";

export default function EnterNameStep({ onNext, error }) {
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onNext(name.trim());
  };

  return (
    <div className="enter-name-step">
      <h2 className="enter-name-title">Enter your name</h2>
      <form onSubmit={handleSubmit} className="enter-name-form">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="enter-name-input"
          autoFocus
        />
        {error && <p className="enter-name-error">{error}</p>}
        <button type="submit" className="enter-name-btn" disabled={!name.trim()}>
          NEXT
        </button>
      </form>
    </div>
  );
}
