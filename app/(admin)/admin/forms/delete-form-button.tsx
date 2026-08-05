"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteFormButton({
  formId,
  formTitle,
  responseCount,
}: {
  formId: string;
  formTitle: string;
  responseCount: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setBusy(true);
    setError("");

    const r = await fetch(`/api/admin/forms/${formId}`, {
      method: "DELETE",
    });

    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setError(data.error || "Could not delete form.");
      setBusy(false);
      return;
    }

    setConfirming(false);
    setBusy(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-brand-saffron px-3 py-1.5 text-sm font-semibold text-brand-saffron hover:bg-brand-saffron hover:text-brand-white"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-brand-saffron bg-brand-cement p-3">
      <p className="text-sm font-semibold text-brand-blue">
        Delete &ldquo;{formTitle}&rdquo;?
      </p>
      <p className="mt-1 text-xs text-brand-blue/70">
        {responseCount > 0
          ? `This will permanently remove the form and ${responseCount} response${responseCount === 1 ? "" : "s"}.`
          : "This will permanently remove the form. No responses have been recorded yet."}
      </p>
      {error && <p className="mt-2 text-sm text-brand-saffron">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="rounded-md border border-brand-saffron bg-brand-saffron px-3 py-1.5 text-sm font-semibold text-brand-white hover:bg-[#d97500] disabled:opacity-50"
        >
          {busy ? "Deleting..." : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError("");
          }}
          disabled={busy}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
