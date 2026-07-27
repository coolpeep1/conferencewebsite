import Link from "next/link";
import { getRequiredAttendee } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AttendeeFormsPage() {
  const { supabase, user } = await getRequiredAttendee();
  const { data: forms, error } = await supabase
    .from("organizations")
    .select("id, org_name, status, num_attendees, created_at, updated_at, notes")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Submitted Forms</h1>
          <p className="mt-2 text-sm text-slate-600">
            Open a form to see full details and any admin updates.
          </p>
        </div>
        <Link
          href="/attendee/forms/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          Create New Form
        </Link>
      </div>

      {error && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Could not load forms: {error.message}
        </p>
      )}

      <div className="mt-8 grid gap-4">
        {forms?.map((form) => (
          <Link
            key={form.id}
            href={`/attendee/forms/${form.id}`}
            className="block rounded-lg border-2 border-slate-900 bg-white p-5 shadow-sm transition hover:border-slate-700 hover:shadow-md"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{form.org_name}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Submitted {new Date(form.created_at).toLocaleDateString()} ·{" "}
                  {form.num_attendees} attendee{form.num_attendees === 1 ? "" : "s"}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {form.notes ? `Update: ${form.notes}` : "No admin update yet"}
                </p>
              </div>
              <StatusBadge status={form.status} />
            </div>
          </Link>
        ))}
      </div>

      {forms?.length === 0 && (
        <div className="mt-8 rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="flex justify-center mb-4">
            <svg
              className="w-16 h-16 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">No forms submitted yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Create your first registration form when you are ready.
          </p>
          <Link
            href="/attendee/forms/new"
            className="mt-4 inline-block rounded-md bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            Create New Form
          </Link>
        </div>
      )}
    </section>
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
