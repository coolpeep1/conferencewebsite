import { getRequiredAdmin } from "@/lib/auth";
import TableView, { type FormSummary, type FieldDef, type ResponseRow } from "./table-view";

type SearchParams = Promise<{ form?: string }>;

export default async function AdminTableViewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { form: selectedFormId } = await searchParams;
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

  let rows: ResponseRow[] = [];
  let selectedForm: FormSummary | null = null;

  if (selectedFormId) {
    selectedForm = forms.find((f) => f.id === selectedFormId) ?? null;

    if (selectedForm) {
      const { data: assignments } = await supabase
        .from("form_assignments")
        .select(
          "id, assigned_at, recipient_user_id, app_users(full_name, email), form_responses(answers, submitted_at)"
        )
        .eq("form_id", selectedFormId)
        .order("assigned_at", { ascending: false });

      rows = (assignments ?? []).map((a: any) => {
        const r = Array.isArray(a.form_responses) ? a.form_responses[0] : null;
        return {
          assignmentId: a.id,
          recipientName: a.app_users?.full_name ?? "Unknown",
          recipientEmail: a.app_users?.email ?? "",
          assignedAt: a.assigned_at,
          submittedAt: r?.submitted_at ?? null,
          answers: (r?.answers ?? {}) as Record<string, unknown>,
        };
      });
    }
  }

  return (
    <TableView
      forms={forms}
      selectedForm={selectedForm}
      rows={rows}
    />
  );
}
