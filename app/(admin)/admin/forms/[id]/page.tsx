import { notFound } from "next/navigation";
import { getRequiredAdmin } from "@/lib/auth";
import SendFormPanel from "./send-form-panel";

type Field = {
  label: string;
  type: "text" | "textarea" | "email" | "number" | "select" | "radio" | "checkbox";
  required: boolean;
  options?: string[];
};

export default async function AdminFormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await getRequiredAdmin();

  const { data: form } = await supabase
    .from("custom_forms")
    .select("id, title, description, fields, created_at, created_by")
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (!form) notFound();

  const { data: attendees } = await supabase
    .from("app_users")
    .select("id, full_name, email")
    .eq("role", "attendee")
    .order("full_name");

  const { data: assignments } = await supabase
    .from("form_assignments")
    .select("recipient_user_id, assigned_at")
    .eq("form_id", id);

  const assignedIds = new Set(
    (assignments ?? [])
      .map((assignment: any) => assignment.recipient_user_id)
      .filter(Boolean)
  );

  const fields = (form.fields ?? []) as Field[];

  return (
    <section className="max-w-4xl space-y-6">
      <div className="page-header">
        <span className="accent" />
        <h1>{form.title}</h1>
        {form.description && (
          <p className="mt-2 text-sm text-brand-blue/70">{form.description}</p>
        )}
      </div>

      <div className="rounded-lg border border-brand-cement bg-brand-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-blue/70">
          Fields
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {fields.map((field, index) => (
            <div key={`${field.label}-${index}`} className="rounded-md border border-brand-cement p-3">
              <p className="font-medium text-brand-blue">{field.label}</p>
              <p className="mt-1 text-xs text-brand-blue/60">
                {field.type} {field.required ? "required" : "optional"}
              </p>
              {field.options?.length ? (
                <p className="mt-1 text-xs text-brand-blue/60">
                  Options: {field.options.join(", ")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <SendFormPanel
        formId={form.id}
        formTitle={form.title}
        attendees={
          (attendees ?? []).map((attendee: any) => ({
            id: attendee.id,
            full_name: attendee.full_name,
            email: attendee.email,
            alreadySent: assignedIds.has(attendee.id),
          })) as Array<{
            id: string;
            full_name: string;
            email: string;
            alreadySent: boolean;
          }>
        }
      />
    </section>
  );
}
