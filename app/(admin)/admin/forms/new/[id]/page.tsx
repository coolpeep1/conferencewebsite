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
    .select("id, assigned_at, recipient_user_id, app_users(full_name, email), form_responses(answers, submitted_at)")
    .eq("form_id", id)
    .order("assigned_at", { ascending: false });

  const submittedCount =
    assignments?.filter((a: any) => a.form_responses?.length).length ?? 0;

  return (
    <section className="max-w-4xl">
      <h1 className="text-3xl font-semibold">{form.title}</h1>
      {form.description && <p className="mt-2 text-sm text-slate-600">{form.description}</p>}
      <p className="mt-3 text-sm text-slate-600">
        {submittedCount} of {assignments?.length ?? 0} recipients have responded
      </p>

      <div className="mt-8 space-y-4">
        {assignments?.map((assignment: any) => {
          const response = assignment.form_responses?.[0];
          const recipient = assignment.app_users;

          return (
            <article
              key={assignment.id}
              className="rounded-lg border-2 border-slate-900 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {recipient?.full_name ?? "Unknown recipient"}
                  </h2>
                  <p className="text-sm text-slate-600">{recipient?.email}</p>
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                    response
                      ? "bg-emerald-50 text-emerald-900 ring-emerald-300"
                      : "bg-yellow-50 text-yellow-900 ring-yellow-300"
                  }`}
                >
                  {response ? "Submitted" : "Pending"}
                </span>
              </div>

              {response && (
                <dl className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
                  {fields.map((field, i) => (
                    <div key={i}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                        {field.label}
                      </dt>
                      <dd className="mt-1 break-words text-slate-900">
                        {formatAnswer(response.answers?.[field.label])}
                      </dd>
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-500">
                      Submitted {new Date(response.submitted_at).toLocaleString()}
                    </p>
                  </div>
                </dl>
              )}
            </article>
          );
        })}

        {!assignments?.length && (
          <p className="text-sm text-slate-600">This form hasn&apos;t been sent to anyone yet.</p>
        )}
      </div>
    </section>
  );
}