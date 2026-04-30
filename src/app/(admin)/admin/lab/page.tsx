import { LabBuilder } from "./lab-builder";
import { Suspense } from "react";

export default function AdminLabPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white/40 italic">Loading builder...</div>}>
      <LabBuilder />
    </Suspense>
  );
}
