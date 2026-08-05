import Link from "next/link";
import { getRequiredAdmin } from "@/lib/auth";
import DeleteFormButton from "./delete-form-button";

export const dynamic = "force-dynamic";

export default async function AdminFormsPage() {
  const { supabase, user } = await getRequiredAdmin();

  const { data: forms } = await supabase
    .from("custom_forms")
    .select(
      "id, title, description, created_at, form_assignments(id, form_responses(id))"
    )
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header">
          <span className="accent" />
          <h1>My Forms</h1>
          <p className="mt-2 text-sm text-brand-blue/70">
            Create and send custom forms to organizations.
          </p>
        </div>
        <Link href="/admin/forms/new" className="btn-primary">
          Create Your Own Form
        </Link>
      </div>

      <div className="mt-8 grid gap-4">
        {forms?.map((form: any) => {
          const assignments = form.form_assignments ?? [];
          const responseCount = assignments.reduce(
            (acc: number, a: any) => {
              const fr = a.form_responses;
              const hasResponse = Array.isArray(fr) ? fr.length > 0 : !!fr;
              return acc + (hasResponse ? 1 : 0);
            },
            0
          );
          return (
            <article
              key={form.id}
              className="rounded-lg border border-brand-cement bg-brand-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-display text-lg font-bold text-brand-blue">
                  {form.title}
                </h2>
                <DeleteFormButton
                  formId={form.id}
                  formTitle={form.title}
                  responseCount={responseCount}
                />
              </div>
              <p className="mt-1 text-sm text-brand-blue/70">
                {form.description || "No instructions"}
              </p>
              <p className="mt-3 text-xs text-brand-blue/60">
                Sent to {assignments.length} attendee
                {assignments.length === 1 ? "" : "s"} · {responseCount}{" "}
                response{responseCount === 1 ? "" : "s"} ·{" "}
                {new Date(form.created_at).toLocaleDateString()}
              </p>
            </article>
          );
        })}
        {!forms?.length && (
          <p className="mt-8 text-sm text-brand-blue/70">
            No custom forms created yet.
          </p>
        )}
      </div>
    </section>
  );
}
