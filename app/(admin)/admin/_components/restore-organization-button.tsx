"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RestoreOrganizationButton({
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

  async function handleRestore() {
    setBusy(true);
    setError("");

    const r = await fetch(`/api/admin/organizations/${orgId}`, {
      method: "PATCH",
    });

    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setError(data.error || "Could not restore organization.");
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
        className="rounded-md border border-brand-blue bg-brand-blue px-3 py-1.5 text-sm font-semibold text-brand-white hover:bg-[#0f1a3a]"
      >
        Restore
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-brand-blue bg-brand-cement p-3">
      <p className="text-sm font-semibold text-brand-blue">
        Restore &ldquo;{orgName}&rdquo;?
      </p>
      <p className="mt-1 text-xs text-brand-blue/70">
        The organization will be moved back to the active registrations list.
      </p>
      {error && <p className="mt-2 text-sm text-brand-saffron">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleRestore}
          disabled={busy}
          className="rounded-md border border-brand-blue bg-brand-blue px-3 py-1.5 text-sm font-semibold text-brand-white hover:bg-[#0f1a3a] disabled:opacity-50"
        >
          {busy ? "Restoring..." : "Yes, restore"}
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
