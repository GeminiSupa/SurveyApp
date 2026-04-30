"use client";

import { useEffect } from "react";

export function SessionKeeper() {
  useEffect(() => {
    const timer = setInterval(() => {
      void fetch("/api/auth/refresh", { method: "POST" });
    }, 1000 * 60 * 20);
    return () => clearInterval(timer);
  }, []);

  return null;
}
