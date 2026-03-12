import { useState, useEffect } from "react";

const DURATION_MS = 2500;
const INTERVAL_MS = 50;

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const step = (INTERVAL_MS / DURATION_MS) * 100;
    const id = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + step);
        if (next >= 100) {
          clearInterval(id);
          onComplete();
        }
        return next;
      });
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [onComplete]);

  return (
    <div className="loading-screen">
      <div className="loading-percent">{Math.round(progress)}%</div>
      <p className="loading-message">Calculating your nutritional needs.</p>
    </div>
  );
}
