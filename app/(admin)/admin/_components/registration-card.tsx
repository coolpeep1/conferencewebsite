"use client";

import { useState } from "react";
import RegistrationUpdateForm from "./registration-update-form";

export default function RegistrationCard({ registration }: { registration: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-lg border-2 border-slate-900 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 hover:bg-slate-50 transition-colors flex items-center justify-between"
      >
        <div className="flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{registration.org_name}</h2>
              <p className="mt-1 text-sm text-slate-600">
                Submitted {new Date(registration.created_at).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={registration.status} />
          </div>
        </div>
        <div className="ml-4">
          {expanded ? (
            <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0L5 14m7-7v12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7 7 7-7" />
            </svg>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 px-5 py-5 bg-slate-50">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Detail label="Contact" value={registration.contact_name} />
                <Detail label="Email" value={registration.contact_email} />
                <Detail label="Phone" value={registration.contact_phone || "Not provided"} />
                <Detail label="Attendees" value={String(registration.num_attendees)} />
                <Detail label="Dietary Notes" value={registration.dietary_notes || "None"} />
                <Detail label="Form ID" value={registration.id} />
              </dl>
            </div>

            <div className="rounded-md border border-slate-900 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Updates On This Form</h3>
              <p className="mt-1 text-xs text-slate-600">
                Status and notes are visible to the attendee.
              </p>
              <div className="mt-4">
                <RegistrationUpdateForm
                  id={registration.id}
                  currentStatus={registration.status}
                  currentNotes={registration.notes}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
        {label}
      </dt>
      <dd className="mt-1 break-words text-slate-900">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-900 ring-yellow-300",
    confirmed: "bg-emerald-50 text-emerald-900 ring-emerald-300",
    waitlisted: "bg-blue-50 text-blue-900 ring-blue-300",
    declined: "bg-red-50 text-red-900 ring-red-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${
        classes[status] ?? classes.pending
      }`}
    >
      {status}
    </span>
  );
}
