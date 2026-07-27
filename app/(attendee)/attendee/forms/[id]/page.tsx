import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequiredAttendee } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AttendeeFormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await getRequiredAttendee();

  const { data: form, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (error) {
    return (
      <section>
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Could not load form: {error.message}
        </p>
      </section>
    );
  }

  if (!form) {
    notFound();
  }

  return (
    <section className="max-w-3xl">
      <Link
        href="/attendee/forms"
        className="text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        ← Back to submitted forms
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{form.org_name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Submitted {new Date(form.created_at).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={form.status} />
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Form details
        </h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <Detail label="Contact" value={form.contact_name} />
          <Detail label="Email" value={form.contact_email} />
          <Detail label="Phone" value={form.contact_phone || "Not provided"} />
          <Detail label="Attendees" value={String(form.num_attendees)} />
          <Detail label="Dietary Notes" value={form.dietary_notes || "None"} />
          <Detail label="Last updated" value={new Date(form.updated_at).toLocaleString()} />
        </dl>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Admin updates
        </h2>
        <dl className="mt-4 grid gap-4 text-sm">
          <Detail label="Status" value={form.status} />
          <Detail label="Update note" value={form.notes || "No update yet"} />
        </dl>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    pending: "bg-amber-50 text-amber-800 ring-amber-200",
    confirmed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    waitlisted: "bg-blue-50 text-blue-800 ring-blue-200",
    declined: "bg-red-50 text-red-800 ring-red-200",
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
