import { notFound } from "next/navigation";
import { getRequiredAdmin } from "@/lib/auth";

type Field = {
  label: string;
  type: "text" | "textarea" | "email" | "number" | "select" | "radio" | "checkbox";
  required: boolean;
  options?: string[];
};

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "—";
  }
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return "—";
}

export default async function AdminFormResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await getRequiredAdmin();

  const { data: form } = await supabase
    .from("custom_forms")
    .select("id, title, description, fields, created_by")
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (!form) {
    notFound();
  }

  const fields = (form.fields ?? []) as Field[];

  const { data: assignments } = await supabase
    .from("form_assignments")
    .select(
      "id, assigned_at, recipient_user_id, app_users(full_name, email), form_responses(answers, submitted_at)"
    )
    .eq("form_id", id)
    .order("assigned_at", { ascending: false });

  const submittedCount =
    assignments?.filter((a: any) => a.form_responses?.length).length ?? 0;

  return (
    <section className="max-w-4xl">
      <div className="page-header">
        <span className="accent" />
        <h1>{form.title}</h1>
        {form.description && (
          <p className="mt-2 text-sm text-brand-blue/70">{form.description}</p>
        )}
      </div>
      <p className="mt-3 text-sm text-brand-blue/70">
        {submittedCount} of {assignments?.length ?? 0} recipients have responded
      </p>

      <div className="mt-8 space-y-4">
        {assignments?.map((assignment: any) => {
          const response = assignment.form_responses?.[0];
          const recipient = assignment.app_users;

          return (
            <article
              key={assignment.id}
              className="rounded-lg border border-brand-cement bg-brand-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-brand-blue">
                    {recipient?.full_name ?? "Unknown recipient"}
                  </h2>
                  <p className="text-sm text-brand-blue/70">{recipient?.email}</p>
                </div>
                <span
                  className={`chip ${
                    response ? "chip-submitted" : "chip-pending"
                  }`}
                >
                  {response ? "Submitted" : "Pending"}
                </span>
              </div>

              {response && (
                <dl className="mt-4 grid gap-3 border-t border-brand-cement pt-4 sm:grid-cols-2">
                  {fields.map((field, i) => (
                    <div key={i}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                        {field.label}
                      </dt>
                      <dd className="mt-1 break-words text-brand-blue">
                        {formatAnswer(response.answers?.[field.label])}
                      </dd>
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <p className="text-xs text-brand-blue/60">
                      Submitted {new Date(response.submitted_at).toLocaleString()}
                    </p>
                  </div>
                </dl>
              )}
            </article>
          );
        })}

        {!assignments?.length && (
          <p className="mt-8 text-sm text-brand-blue/70">
            This form hasn&apos;t been sent to anyone yet.
          </p>
        )}
      </div>
    </section>
  );
}
