"use client";

export function LogoutButton() {
  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const payload = (await response.json()) as { redirectTo?: string };
    localStorage.removeItem("survey-lab-high-contrast");
    if (payload.redirectTo) {
      window.location.href = payload.redirectTo;
      return;
    }
    window.location.href = "/auth/login";
  }

  return (
    <button type="button" onClick={logout} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">
      End Session
    </button>
  );
}
