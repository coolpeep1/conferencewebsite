import Link from "next/link";
import { getRequiredAdmin } from "@/lib/auth";
import TableView, { type FormSummary, type FieldDef, type ResponseRow } from "./table-view";
import AllFormsTableView, { type AggregateRow, type AggregateFormColumn } from "./all-forms-table";
import AttendeeTableView, { type AttendeeRow } from "./attendee-table";

type SearchParams = Promise<{ form?: string; view?: string }>;

export default async function AdminTableViewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { form: selectedFormId, view } = await searchParams;
  const { supabase, user } = await getRequiredAdmin();

  // All forms owned by this admin — drives the picker.
  const { data: formsRaw } = await supabase
    .from("custom_forms")
    .select("id, title, description, fields")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  const forms: FormSummary[] = (formsRaw ?? []).map((f: any) => ({
    id: f.id,
    title: f.title,
    description: f.description ?? "",
    fields: (f.fields ?? []) as FieldDef[],
  }));

  const isAggregateView = view === "all";
  const isAttendeeView = view === "attendees";
  let rows: ResponseRow[] = [];
  let selectedForm: FormSummary | null = null;
  let aggregateRows: AggregateRow[] = [];
  const aggregateColumns: AggregateFormColumn[] = forms.map((f) => ({
    id: f.id,
    title: f.title,
    fields: f.fields,
  }));
  let attendees: AttendeeRow[] = [];

  if (isAttendeeView) {
    // Pull every attendee in the system with their org. Sorted by name.
    // Attendees with no org show up with an empty org label.
    const { data: attendeesRaw } = await supabase
      .from("app_users")
      .select(
        "id, full_name, email, organization_id, organizations!app_users_organization_id_fkey(org_name)"
      )
      .eq("role", "attendee")
      .order("full_name");

    attendees = (attendeesRaw ?? []).map((a: any) => ({
      id: a.id,
      fullName: a.full_name ?? "Unknown",
      email: a.email ?? "",
      organizationName: (a.organizations?.org_name as string | undefined) ?? "",
    }));
  } else if (isAggregateView) {
    if (forms.length > 0) {
      const { data: assignments } = await supabase
        .from("form_assignments")
        .select(
          "id, assigned_at, recipient_user_id, app_users(full_name, email, organization_id, organizations!app_users_organization_id_fkey(id, org_name)), custom_forms(id, title, fields), form_responses(answers, submitted_at)"
        )
        .in("form_id", forms.map((f) => f.id))
        .order("assigned_at", { ascending: false });

      // Group by organization (or by email for attendees with no org). One row
      // per group, with all attendees of that org listed underneath.
      const rowsByOrgKey = new Map<string, AggregateRow>();

      for (const assignment of assignments ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recipient = assignment.app_users as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const form = assignment.custom_forms as any;
        const fr = assignment.form_responses;
        const response = Array.isArray(fr) ? fr[0] : fr ?? null;
        const email = recipient?.email ?? "";
        if (!email || !form?.id) continue;

        const org = (recipient?.organizations as { id?: string; org_name?: string } | null) ?? null;
        const organizationId = org?.id ?? null;
        const organizationName = org?.org_name ?? "";
        // Prefer org-based grouping when we have an org; fall back to email for
        // orphan attendees (admins or users with no org link).
        const key = organizationId
          ? `org:${organizationId}`
          : `email:${email.toLowerCase()}`;

        let row = rowsByOrgKey.get(key);
        if (!row) {
          row = {
            organizationId,
            organizationName: organizationName || recipient?.full_name || email,
            attendees: [],
            forms: {},
          };
          rowsByOrgKey.set(key, row);
        }

        // One AggregateAttendee per distinct app_user (recipientUserId). An
        // attendee may have multiple assignments across forms; we add them
        // once and accumulate per-form cells.
        let attendee = row.attendees.find((a) => a.recipientUserId === recipient.id);
        if (!attendee) {
          attendee = {
            recipientUserId: recipient.id,
            email,
            fullName: recipient?.full_name ?? "Unknown",
            forms: {},
          };
          row.attendees.push(attendee);
        }

        const cell = {
          formId: form.id,
          formTitle: form.title,
          submittedAt: response?.submitted_at ?? null,
          answers: (response?.answers ?? {}) as Record<string, unknown>,
        };
        attendee.forms[form.id] = cell;
        row.forms[form.id] = cell;
      }

      aggregateRows = Array.from(rowsByOrgKey.values()).sort((a, b) => {
        const nameCmp = a.organizationName.localeCompare(b.organizationName);
        if (nameCmp !== 0) return nameCmp;
        const aEmail = a.attendees[0]?.email ?? "";
        const bEmail = b.attendees[0]?.email ?? "";
        return aEmail.localeCompare(bEmail);
      });
    }
  } else if (selectedFormId) {
    selectedForm = forms.find((f) => f.id === selectedFormId) ?? null;

    if (selectedForm) {
      const { data: assignments } = await supabase
        .from("form_assignments")
        .select(
          "id, assigned_at, recipient_user_id, app_users(full_name, email), form_responses(answers, submitted_at)"
        )
        .eq("form_id", selectedFormId)
        .order("assigned_at", { ascending: false });

      rows = (assignments ?? [])
        .map((a) => {
          // PostgREST returns a one-to-one join (UNIQUE constraint) as an object,
          // not an array. The generated TS types assume an array, so we cast
          // here and handle both shapes so existing responses render in the grid.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const assignment: any = a;
          const fr = assignment.form_responses;
          const r = Array.isArray(fr) ? fr[0] : fr ?? null;
          return {
            assignmentId: assignment.id,
            recipientName: assignment.app_users?.full_name ?? "Unknown",
            recipientEmail: assignment.app_users?.email ?? "",
            assignedAt: assignment.assigned_at,
            submittedAt: r?.submitted_at ?? null,
            answers: (r?.answers ?? {}) as Record<string, unknown>,
          };
        })
        .filter((row): row is ResponseRow => row !== null);
    }
  }

  // The "By form" rail is only used by the per-form and aggregate views; the
  // attendee view renders its own grid full-width below.

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-1.5 w-12 rounded-full bg-brand-saffron" />
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-brand-blue">
            Table View
          </h1>
          <p className="mt-2 text-sm text-brand-blue/70">
            {isAttendeeView
              ? "Every registered attendee in one sortable, filterable grid."
              : isAggregateView
                ? "See every form grouped by email in one table."
                : selectedForm
                  ? `Inspect responses for ${selectedForm.title}.`
                  : "Inspect every response across your forms."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/responses"
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              !isAggregateView && !isAttendeeView
                ? "border-brand-saffron bg-brand-blue text-brand-white"
                : "border-brand-cement bg-brand-white text-brand-blue hover:bg-brand-cement"
            }`}
          >
            By form
          </Link>
          <Link
            href="/admin/responses?view=all"
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              isAggregateView
                ? "border-brand-saffron bg-brand-blue text-brand-white"
                : "border-brand-cement bg-brand-white text-brand-blue hover:bg-brand-cement"
            }`}
          >
            By email
          </Link>
          <Link
            href="/admin/responses?view=attendees"
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              isAttendeeView
                ? "border-brand-saffron bg-brand-blue text-brand-white"
                : "border-brand-cement bg-brand-white text-brand-blue hover:bg-brand-cement"
            }`}
          >
            By attendee
          </Link>
        </div>
      </header>

      {isAttendeeView ? (
        <AttendeeTableView attendees={attendees} />
      ) : isAggregateView ? (
        <AllFormsTableView forms={aggregateColumns} rows={aggregateRows} />
      ) : (
        <TableView
          forms={forms}
          selectedForm={selectedForm}
          rows={rows}
          showHeader={false}
        />
      )}
    </section>
  );
}