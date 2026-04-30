import { AuthForm } from "./auth-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-white/20 italic">Loading...</div>}>
      <AuthForm />
    </Suspense>
  );
}
