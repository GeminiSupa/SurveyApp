"use client";

import { useEffect, useState } from "react";

export function HighContrastToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("survey-lab-high-contrast");
    if (stored === "1") {
      document.documentElement.dataset.contrast = "high";
      setEnabled(true);
    }
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    document.documentElement.dataset.contrast = next ? "high" : "normal";
    localStorage.setItem("survey-lab-high-contrast", next ? "1" : "0");
  }

  return (
    <button type="button" onClick={toggle} className="rounded-lg border border-white/20 px-3 py-2 text-xs">
      {enabled ? "Standard Contrast" : "High Contrast"}
    </button>
  );
}
