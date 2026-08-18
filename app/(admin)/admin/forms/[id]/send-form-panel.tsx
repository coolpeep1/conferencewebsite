"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Attendee = {
  id: string;
  full_name: string;
  email: string;
  organization_id: string | null;
  organization_name: string | null;
  alreadySent: boolean;
};

type OrgGroup = {
  organizationId: string | null;
  organizationName: string;
  attendees: Attendee[];
  // True when every attendee of the org already has an assignment.
  alreadySent: boolean;
};

type Mode = "by-attendee" | "by-organization";

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

  // Group attendees by organization. Attendees without an organization go
  // into a synthetic "(no org)" group so the by-org view can still show
  // them.
  const orgs = useMemo<OrgGroup[]>(() => {
    const map = new Map<string, OrgGroup>();
    const noOrgKey = "__no_org__";
    for (const attendee of attendees) {
      const key = attendee.organization_id ?? noOrgKey;
      let group = map.get(key);
      if (!group) {
        group = {
          organizationId: attendee.organization_id,
          organizationName:
            attendee.organization_name ??
            (attendee.organization_id ? "(unknown org)" : "(no organization)"),
          attendees: [],
          alreadySent: false,
        };
        map.set(key, group);
      }
      group.attendees.push(attendee);
    }
    for (const group of map.values()) {
      group.alreadySent = group.attendees.every((a) => a.alreadySent);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.organizationName.localeCompare(b.organizationName)
    );
  }, [attendees]);

  // `alreadySent` comes from the server (re-queried after router.refresh()),
  // so no client-side "I just sent this" override state is needed. The
  // "Already sent" badge flips to true on its own.
  const [mode, setMode] = useState<Mode>("by-organization");
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // The initial "which attendees are pre-checked" set is derived from the
  // first render's attendees; subsequent selection is driven by user clicks.
  // No effect needed because the server refresh updates `alreadySent`, and
  // the user's in-flight selection is preserved across re-renders.

  async function sendToOrg(org: OrgGroup) {
    if (org.organizationId === null) {
      setMessage("This attendee is not linked to an organization.");
      return;
    }
    setSaving(true);
    setMessage("");

    const response = await fetch(`/api/admin/forms/${formId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationIds: [org.organizationId] }),
    });

    setSaving(false);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error || "Could not send form.");
      return;
    }

    setMessage(
      `Form sent to ${org.organizationName} (${data.sent} org${
        data.sent === 1 ? "" : "s"
      }, ${data.alreadySent} already sent).`
    );
    router.refresh();
  }

  async function sendToSelectedAttendees() {
    const toSend = selectedAttendeeIds.filter(
      (id) => !attendees.find((a) => a.id === id)?.alreadySent
    );
    if (toSend.length === 0) {
      setMessage("Select at least one attendee who hasn't been sent the form.");
      return;
    }
    setSaving(true);
    setMessage("");

    const response = await fetch(`/api/admin/forms/${formId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendeeIds: toSend }),
    });

    setSaving(false);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error || "Could not send form.");
      return;
    }

    setMessage(
      `Form sent to ${toSend.length} attendee${
        toSend.length === 1 ? "" : "s"
      } (${data.sent} new org${data.sent === 1 ? "" : "s"}, ${data.alreadySent} already sent).`
    );
    router.refresh();
  }

  const totalSent = orgs.filter((o) => o.alreadySent).length;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (mode === "by-organization") {
          // Bulk send: not used; the per-org buttons handle their own POSTs.
        } else {
          sendToSelectedAttendees();
        }
      }}
      className="rounded-lg border border-brand-cement bg-brand-white p-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-brand-blue">
            Send &ldquo;{formTitle}&rdquo;
          </h2>
          <p className="mt-1 text-sm text-brand-blue/70">
            Pick one or more organizations to send this form to all of their
            attendees.
          </p>
        </div>
        <p className="text-xs text-brand-blue/60">
          {totalSent} of {orgs.length} org{totalSent === 1 ? "" : "s"} sent
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1 rounded-md bg-brand-cement p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("by-organization")}
          className={`rounded px-3 py-2 font-medium ${
            mode === "by-organization"
              ? "bg-brand-white text-brand-blue border border-brand-cement"
              : "text-brand-blue/70"
          }`}
        >
          By organization
        </button>
        <button
          type="button"
          onClick={() => setMode("by-attendee")}
          className={`rounded px-3 py-2 font-medium ${
            mode === "by-attendee"
              ? "bg-brand-white text-brand-blue border border-brand-cement"
              : "text-brand-blue/70"
          }`}
        >
          By attendee
        </button>
      </div>

      {mode === "by-organization" ? (
        <div className="mt-4 max-h-80 space-y-2 overflow-auto rounded-md border border-brand-cement p-3">
          {orgs.length === 0 ? (
            <p className="text-sm text-brand-blue/60">No attendees yet.</p>
          ) : (
            orgs.map((org) => {
              const sent = org.alreadySent;
              return (
                <div
                  key={String(org.organizationId)}
                  className={`flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm ${
                    sent ? "bg-brand-cement/50 text-brand-blue/60" : "text-brand-blue"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="block font-medium">{org.organizationName}</div>
                    <div className="block text-xs text-brand-blue/60">
                      {org.attendees.length} attendee
                      {org.attendees.length === 1 ? "" : "s"}
                      {org.attendees.length > 0
                        ? ` · ${org.attendees
                            .slice(0, 3)
                            .map((a) => a.full_name)
                            .join(", ")}${org.attendees.length > 3 ? "…" : ""}`
                        : ""}
                    </div>
                  </div>
                  {sent ? (
                    <span className="rounded-full border border-brand-saffron px-2 py-0.5 text-[11px] font-semibold text-brand-saffron">
                      Already sent
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={saving || org.organizationId === null}
                      onClick={() => sendToOrg(org)}
                      className="rounded-md border border-brand-saffron bg-brand-saffron px-3 py-1.5 text-xs font-semibold text-brand-white transition-colors hover:bg-[#d97500] disabled:opacity-50"
                    >
                      Send to org
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="mt-4 max-h-80 space-y-2 overflow-auto rounded-md border border-brand-cement p-3">
          {attendees.map((attendee) => {
            const disabled = attendee.alreadySent;
            const checked = disabled || selectedAttendeeIds.includes(attendee.id);
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
                    setSelectedAttendeeIds(
                      event.target.checked
                        ? [...selectedAttendeeIds, attendee.id]
                        : selectedAttendeeIds.filter((id) => id !== attendee.id)
                    )
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{attendee.full_name}</span>
                  <span className="block text-xs text-brand-blue/60">
                    {attendee.email}
                    {attendee.organization_name
                      ? ` · ${attendee.organization_name}`
                      : ""}
                  </span>
                </span>
                {disabled && (
                  <span className="rounded-full border border-brand-saffron px-2 py-0.5 text-[11px] font-semibold text-brand-saffron">
                    Already sent
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {message && <p className="mt-3 text-sm text-brand-blue/70">{message}</p>}

      {mode === "by-attendee" && (
        <button disabled={saving} className="mt-4 btn-primary">
          {saving ? "Sending..." : "Send form"}
        </button>
      )}
    </form>
  );
}
