import Link from "next/link";
import { getRequiredAttendee } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AssignedFormsPage() {
  const { supabase, user } = await getRequiredAttendee();
  const { data: assignments } = await supabase
    .from("form_assignments")
    .select(
      "id, assigned_at, custom_forms(id, title, description), form_responses(id)"
    )
    .eq("recipient_user_id", user.id)
    .order("assigned_at", { ascending: false });

  return (
    <section>
      <div className="page-header">
        <span className="accent" />
        <h1>Assigned Forms</h1>
        <p className="mt-2 text-sm text-brand-blue/70">
          Forms sent to you by conference administrators.
        </p>
      </div>
      <div className="mt-8 grid gap-4">
        {assignments?.map((assignment: any) => {
          const fr = assignment.form_responses;
          const submitted = Array.isArray(fr) ? fr.length > 0 : !!fr;
          return (
            <Link
              key={assignment.id}
              href={`/attendee/assigned-forms/${assignment.id}`}
              className="block rounded-lg border border-brand-cement bg-brand-white p-5 transition hover:border-brand-saffron hover:bg-brand-cement"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-brand-blue">
                    {assignment.custom_forms.title}
                  </h2>
                  <p className="mt-1 text-sm text-brand-blue/70">
                    {assignment.custom_forms.description}
                  </p>
                </div>
                <span
                  className={`chip ${
                    submitted ? "chip-submitted" : "chip-pending"
                  }`}
                >
                  {submitted ? "Submitted" : "Needs response"}
                </span>
              </div>
            </Link>
          );
        })}
        {!assignments?.length && (
          <p className="mt-8 text-sm text-brand-blue/70">
            No forms have been assigned to you.
          </p>
        )}
      </div>
    </section>
  );
}
