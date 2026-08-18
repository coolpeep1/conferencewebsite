import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequiredAdmin } from "@/lib/auth";
import SendFormPanel from "./send-form-panel";
import FormPreview from "./form-preview";
import type { Field, FormStatus } from "../field-types";

export default async function AdminFormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await getRequiredAdmin();

  const { data: form } = await supabase
    .from("custom_forms")
    .select(
      "id, title, description, fields, status, published_at, created_at, created_by, form_assignments(form_responses(id))"
    )
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (!form) notFound();

  const { data: attendees } = await supabase
    .from("app_users")
    .select(
      "id, full_name, email, organization_id, organizations!app_users_organization_id_fkey(org_name)"
    )
    .eq("role", "attendee")
    .order("full_name");

  // An attendee is "already sent" when EITHER:
  //   - they're a direct recipient (recipient_user_id = attendee.id), OR
  //   - their org has an assignment for this form (organization_id = attendee.organization_id)
  // The org-assigned path is the common one after the org-grouping migration.
  const { data: assignments } = await supabase
    .from("form_assignments")
    .select("recipient_user_id, organization_id")
    .eq("form_id", id);

  const assignedUserIds = new Set<string>();
  const assignedOrgIds = new Set<string>();
  for (const a of (assignments ?? []) as Array<{
    recipient_user_id: string | null;
    organization_id: string | null;
  }>) {
    if (a.recipient_user_id) assignedUserIds.add(a.recipient_user_id);
    if (a.organization_id) assignedOrgIds.add(a.organization_id);
  }

  const fields = (form.fields ?? []) as Field[];
  // Count responses across all assignments for this form.
  // `form_assignments` is the join table between `custom_forms` and
  // `form_responses` — there's no direct FK from forms to responses.
  const formAssignments = Array.isArray(form.form_assignments)
    ? form.form_assignments
    : [];
  const responseCount = formAssignments.reduce(
    (n, a) =>
      n + (Array.isArray(a.form_responses) ? a.form_responses.length : 0),
    0
  );
  const status: FormStatus = form.status === "published" ? "published" : "draft";

  return (
    <section className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="page-header">
          <span className="accent" />
          <h1>{form.title}</h1>
          {form.description && (
            <p className="mt-2 text-sm text-brand-blue/70">{form.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-brand-blue/70">
            <span
              className={`chip ${
                status === "published" ? "chip-confirmed" : "chip-pending"
              }`}
            >
              {status}
            </span>
            {form.published_at && (
              <span>
                Published {new Date(form.published_at).toLocaleString()}
              </span>
            )}
            <span>
              {responseCount} response{responseCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/forms/${form.id}/edit`}
            className="rounded-md border border-brand-cement bg-brand-white px-3 py-2 text-sm font-medium text-brand-blue hover:bg-brand-cement"
          >
            Edit form
          </Link>
          <a
            href={`/api/admin/forms/${form.id}/export`}
            className="rounded-md border border-brand-saffron bg-brand-saffron px-3 py-2 text-sm font-semibold text-brand-white hover:bg-[#d97500]"
          >
            Export responses
          </a>
        </div>
      </div>

      {responseCount > 0 && (
        <div className="rounded-md border border-brand-saffron bg-brand-cement p-3 text-sm text-brand-blue">
          <strong>{responseCount}</strong> response{responseCount === 1 ? "" : "s"}{" "}
          {responseCount === 1 ? "has" : "have"} been recorded for this form.
          Editing will create a new copy of the form; the original (with its
          responses) will be preserved.
        </div>
      )}

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

      <div className="rounded-lg border border-brand-cement bg-brand-white p-5">
        <h2 className="font-display text-lg font-bold text-brand-blue">
          Attendee view
        </h2>
        <p className="mt-1 text-sm text-brand-blue/70">
          This is exactly what assigned attendees will see when they open the
          form.
        </p>
        <FormPreview fields={fields} />
      </div>

      <SendFormPanel
        formId={form.id}
        formTitle={form.title}
        attendees={(attendees ?? []).map((attendee: any) => {
          const org = attendee.organizations as { org_name?: string } | null;
          const direct = assignedUserIds.has(attendee.id);
          const viaOrg =
            !!attendee.organization_id && assignedOrgIds.has(attendee.organization_id);
          return {
            id: attendee.id,
            full_name: attendee.full_name,
            email: attendee.email,
            organization_id: attendee.organization_id ?? null,
            organization_name: org?.org_name ?? null,
            alreadySent: direct || viaOrg,
          };
        })}
      />
    </section>
  );
}
