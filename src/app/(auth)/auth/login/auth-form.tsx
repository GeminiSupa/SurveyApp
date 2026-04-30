"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signInAction } from "../actions";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin/dashboard";
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setMsg("");
    startTransition(async () => {
      const result = await signInAction(formData);
      if (result.error) {
        setMsg(result.error);
      } else {
        router.push(nextPath);
      }
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin Sign In</h1>
      <p className="text-sm text-[var(--muted)]">Built for UX researchers, design teams, and psychology labs.</p>
      
      <form action={handleSubmit} className="space-y-4">
        <input
          type="email"
          name="email"
          required
          placeholder="you@lab.edu"
          className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm"
        />
        <input
          type="password"
          name="password"
          required
          placeholder="Password"
          className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-[var(--brand-strong)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Signing in..." : "Sign In"}
        </button>
      </form>
      
      {msg ? <p className="text-xs text-[var(--error,red)]">{msg}</p> : null}
      <p className="text-xs text-[var(--muted)]">
        New? <Link href="/auth/signup" className="underline font-medium">Sign Up</Link>
      </p>
    </div>
  );
}
