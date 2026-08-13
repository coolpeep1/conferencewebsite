"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Attendee = {
  id: string;
  full_name: string;
  email: string;
  alreadySent: boolean;
};

export default function SendFormPanel({
  formId,
  formTitle,
  attendees,
}: {
  formId: string;
  formTitle: string;
  attendees: Attendee[];
}) {
  const router = useRouter();
  const initialSentIds = attendees
    .filter((attendee) => attendee.alreadySent)
    .map((attendee) => attendee.id);
  const [selected, setSelected] = useState<string[]>(initialSentIds);
  const [sentIds, setSentIds] = useState<string[]>(initialSentIds);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSentIds(initialSentIds);
    setSelected(initialSentIds);
  }, [formId, initialSentIds.join(",")]);

  const alreadySentCount = useMemo(
    () => sentIds.length,
    [sentIds]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch(`/api/admin/forms/${formId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendeeIds: selected }),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error || "Could not send form.");
      return;
    }

    setMessage("Form sent.");
    setSentIds((current) => Array.from(new Set([...current, ...selected])));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-brand-cement bg-brand-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-brand-blue">
            Send “{formTitle}”
          </h2>
          <p className="mt-1 text-sm text-brand-blue/70">
            Select attendees and send this form to their assigned forms list.
          </p>
        </div>
        <p className="text-xs text-brand-blue/60">
          {alreadySentCount} attendee{alreadySentCount === 1 ? "" : "s"} already sent
        </p>
      </div>

      <div className="mt-4 max-h-80 space-y-2 overflow-auto rounded-md border border-brand-cement p-3">
        {attendees.map((attendee) => {
          const disabled = sentIds.includes(attendee.id);
          const checked = disabled || selected.includes(attendee.id);
          return (
            <label
              key={attendee.id}
              className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm ${
                disabled ? "bg-brand-cement/50 text-brand-blue/60" : "text-brand-blue"
              }`}
            >
              <input
                type="checkbox"
                disabled={disabled}
                checked={checked}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? [...selected, attendee.id]
                      : selected.filter((value) => value !== attendee.id)
                  )
                }
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{attendee.full_name}</span>
                <span className="block text-xs text-brand-blue/60">{attendee.email}</span>
              </span>
              {attendee.alreadySent && (
                <span className="rounded-full border border-brand-saffron px-2 py-0.5 text-[11px] font-semibold text-brand-saffron">
                  Already sent
                </span>
              )}
            </label>
          );
        })}
      </div>

      {message && <p className="mt-3 text-sm text-brand-blue/70">{message}</p>}

      <button disabled={saving} className="mt-4 btn-primary">
        {saving ? "Sending..." : "Send form"}
      </button>
    </form>
  );
}
