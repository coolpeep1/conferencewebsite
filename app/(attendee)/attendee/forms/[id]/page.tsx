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
        <p className="rounded-md border border-brand-saffron bg-brand-cement p-3 text-sm text-brand-blue">
          Could not load form: {error.message}
        </p>
      </section>
    );
  }

  if (!form) notFound();

  return (
    <section className="max-w-3xl">
      <Link
        href="/attendee/forms"
        className="text-sm font-medium text-brand-blue/70 hover:text-brand-blue"
      >
        {"<-"} Back to submitted forms
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="page-header">
          <span className="accent" />
          <h1>{form.org_name}</h1>
          <p className="mt-2 text-sm text-brand-blue/70">
            Submitted {new Date(form.created_at).toLocaleString()}
          </p>
        </div>
        <span className={`chip chip-${form.status}`}>{form.status}</span>
      </div>

      <div className="mt-6 rounded-lg border border-brand-cement bg-brand-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-blue/70">
          Form details
        </h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <Detail label="Contact" value={form.contact_name} />
          <Detail label="Email" value={form.contact_email} />
          <Detail label="Attendees" value={String(form.num_attendees)} />
          <Detail label="Last updated" value={new Date(form.updated_at).toLocaleString()} />
        </dl>
      </div>

      <div className="mt-4 rounded-lg border border-brand-cement bg-brand-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-blue/70">
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
      <dt className="text-xs font-semibold uppercase tracking-wide text-brand-blue/70">
        {label}
      </dt>
      <dd className="mt-1 text-brand-blue">{value}</dd>
    </div>
  );
}
