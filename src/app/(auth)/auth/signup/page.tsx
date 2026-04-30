"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signUpAction } from "../actions";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMsg("");
    
    const formData = new FormData(event.currentTarget);
    const password = formData.get("password")?.toString();
    const confirmPassword = formData.get("confirmPassword")?.toString();

    if (password !== confirmPassword) {
      setMsg("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await signUpAction(formData);
      if (result.error) {
        setMsg(result.error);
      } else {
        router.push("/admin/dashboard");
      }
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Sign Up</h1>
      <p className="text-sm text-[var(--muted)]">Create your account to get started.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          required
          placeholder="Full Name"
          className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm"
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number (Optional)"
          className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm"
        />
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
          placeholder="Choose a password"
          className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm"
        />
        <input
          type="password"
          name="confirmPassword"
          required
          placeholder="Confirm password"
          className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-[var(--brand-strong)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Creating account..." : "Sign Up"}
        </button>
      </form>
      
      {msg ? <p className="text-xs text-[var(--error,red)]">{msg}</p> : null}
      <p className="text-xs text-[var(--muted)]">
        Already have an account? <Link href="/auth/login" className="underline">Log In</Link>
      </p>
    </div>
  );
}
