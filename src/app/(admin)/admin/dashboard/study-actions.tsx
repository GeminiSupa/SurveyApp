"use client";

import { useState } from "react";
import { Trash2, Loader2, Copy } from "lucide-react";
import { useRouter } from "next/navigation";

export function StudyActions({ studyId }: { studyId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!studyId || studyId === "undefined") {
      alert("Cannot delete: Study ID is missing. Please hard refresh the page (Cmd+Shift+R) and try again.");
      return;
    }

    if (!confirm("Are you sure you want to delete this study? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/studies/${studyId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Delete failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDuplicate() {
    if (!studyId || studyId === "undefined") {
      alert("Cannot duplicate: Study ID is missing.");
      return;
    }

    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/admin/studies/${studyId}/duplicate`, {
        method: "POST",
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Duplicate failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setIsDuplicating(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleDuplicate}
        disabled={isDuplicating || isDeleting}
        className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-all disabled:opacity-50"
        title="Duplicate Study"
      >
        {isDuplicating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
      <button
        onClick={handleDelete}
        disabled={isDeleting || isDuplicating}
        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/30 hover:text-rose-400 transition-all disabled:opacity-50"
        title="Delete Study"
      >
        {isDeleting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Trash2 className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}
