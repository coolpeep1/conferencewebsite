import { notFound } from "next/navigation";
import { getRequiredAdmin } from "@/lib/auth";
import FormBuilder from "../../new/form-builder";
import type { Field, FormStatus } from "../../field-types";

export default async function EditAdminFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await getRequiredAdmin();

  const { data: form } = await supabase
    .from("custom_forms")
    .select(
      "id, title, description, fields, status, created_by, form_assignments(form_responses(id))"
    )
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (!form) notFound();

  const fields = (form.fields ?? []) as Field[];
  // Count responses across all assignments for this form.
  const assignments = Array.isArray(form.form_assignments)
    ? form.form_assignments
    : [];
  const responseCount = assignments.reduce(
    (n, a) =>
      n + (Array.isArray(a.form_responses) ? a.form_responses.length : 0),
    0
  );

  return (
    <section className="max-w-2xl space-y-6">
      <div className="page-header">
        <span className="accent" />
        <h1>Edit &ldquo;{form.title}&rdquo;</h1>
        <p className="mt-2 text-sm text-brand-blue/70">
          Update the form. Changes are saved when you click the button below.
        </p>
      </div>

      {responseCount > 0 && (
        <div className="rounded-md border border-brand-saffron bg-brand-cement p-3 text-sm text-brand-blue">
          <strong>{responseCount}</strong> response{responseCount === 1 ? "" : "s"}{" "}
          {responseCount === 1 ? "has" : "have"} already been recorded for this
          form. Saving will create a new editable copy of the form; the original
          (with its responses) will be preserved.
        </div>
      )}

      <div className="rounded-lg border border-brand-cement bg-brand-white p-5">
        <FormBuilder
          initialForm={{
            id: form.id,
            title: form.title,
            description: form.description ?? "",
            fields,
            status: (form.status === "published" ? "published" : "draft") as FormStatus,
          }}
        />
      </div>
    </section>
  );
}
