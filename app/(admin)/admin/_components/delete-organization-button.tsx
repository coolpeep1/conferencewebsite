"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteOrganizationButton({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setBusy(true);
    setError("");

    const r = await fetch(`/api/admin/organizations/${orgId}`, {
      method: "POST",
    });

    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setError(data.error || "Could not delete organization.");
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
        Delete &ldquo;{orgName}&rdquo;?
      </p>
      <p className="mt-1 text-xs text-brand-blue/70">
        The organization will be moved to the trash and can be restored within
        5 days. After that, the data is permanently removed.
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
