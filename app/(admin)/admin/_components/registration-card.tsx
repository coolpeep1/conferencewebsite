"use client";

import { useState } from "react";
import RegistrationUpdateForm from "./registration-update-form";
import DeleteOrganizationButton from "./delete-organization-button";

export default function RegistrationCard({ registration }: { registration: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-lg border border-brand-cement bg-brand-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 hover:bg-brand-cement transition-colors flex items-center justify-between"
      >
        <div className="flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-brand-blue">{registration.org_name}</h2>
              <p className="mt-1 text-sm text-brand-blue/70">
                Submitted {new Date(registration.created_at).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={registration.status} />
          </div>
        </div>
        <div className="ml-4">
          {expanded ? (
            <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7 7 7-7" />
            </svg>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-brand-cement px-5 py-5 bg-brand-cement">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Detail label="Contact" value={registration.contact_name} />
                <Detail label="Email" value={registration.contact_email} />
                <Detail label="Attendees" value={String(registration.num_attendees)} />
                <Detail label="Form ID" value={registration.id} />
              </dl>
              <div className="mt-6">
                <DeleteOrganizationButton
                  orgId={registration.id}
                  orgName={registration.org_name}
                />
              </div>
            </div>

            <div className="rounded-md border border-brand-cement bg-brand-white p-4">
              <h3 className="text-sm font-semibold text-brand-blue">Updates On This Form</h3>
              <p className="mt-1 text-xs text-brand-blue/70">
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
      <dt className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
        {label}
      </dt>
      <dd className="mt-1 break-words text-brand-blue">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`chip chip-${status}`}>
      {status}
    </span>
  );
}
