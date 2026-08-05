"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["pending", "confirmed", "waitlisted", "declined"] as const;

export default function RegistrationUpdateForm({
  id,
  currentStatus,
  currentNotes,
}: {
  id: string;
  currentStatus: string;
  currentNotes: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/admin/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, notes }),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error || "Could not save update.");
      return;
    }

    setMessage("Update saved.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-blue/70">
          Status
        </span>
        <select
          value={status}
          disabled={saving}
          onChange={(event) => setStatus(event.target.value)}
          className="input"
        >
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-blue/70">
          Update for attendee
        </span>
        <textarea
          value={notes}
          disabled={saving}
          onChange={(event) => setNotes(event.target.value)}
          className="input"
          rows={3}
          placeholder="Add a note attendees can see with this form."
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary"
        >
          {saving ? "Saving..." : "Save Update"}
        </button>
        {message && <p className="text-sm text-brand-blue/70">{message}</p>}
      </div>
    </form>
  );
}
