import Link from "next/link";
import { getRequiredAttendee } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AttendeeFormsPage() {
  const { supabase, user } = await getRequiredAttendee();
  const { data: forms, error } = await supabase
    .from("organizations")
    .select(
      "id, org_name, status, num_attendees, created_at, updated_at, notes"
    )
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header">
          <span className="accent" />
          <h1>Submitted Forms</h1>
          <p className="mt-2 text-sm text-brand-blue/70">
            Open a form to see full details and any admin updates.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded-md border border-brand-saffron bg-brand-cement p-3 text-sm text-brand-blue">
          Could not load forms: {error.message}
        </p>
      )}

      <div className="mt-8 grid gap-4">
        {forms?.map((form) => (
          <Link
            key={form.id}
            href={`/attendee/forms/${form.id}`}
            className="block rounded-lg border border-brand-cement bg-brand-white p-5 transition hover:border-brand-saffron hover:bg-brand-cement"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-brand-blue">
                  {form.org_name}
                </h2>
                <p className="mt-1 text-sm text-brand-blue/70">
                  Submitted {new Date(form.created_at).toLocaleDateString()} ·{" "}
                  {form.num_attendees} attendee
                  {form.num_attendees === 1 ? "" : "s"}
                </p>
                <p className="mt-2 text-sm text-brand-blue">
                  {form.notes ? `Update: ${form.notes}` : "No admin update yet"}
                </p>
              </div>
              <span className={`chip chip-${form.status}`}>{form.status}</span>
            </div>
          </Link>
        ))}
      </div>

      {forms?.length === 0 && (
        <div className="mt-8 rounded-lg border-2 border-dashed border-brand-saffron bg-brand-cement p-8 text-center">
          <h2 className="font-display text-lg font-bold text-brand-blue">
            No forms submitted yet
          </h2>
          <p className="mt-2 text-sm text-brand-blue/70">
            Your submitted registration forms will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
