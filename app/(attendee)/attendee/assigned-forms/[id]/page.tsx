import { notFound } from "next/navigation";
import { getRequiredAttendee } from "@/lib/auth";
import ResponseForm from "./response-form";

export default async function AssignedFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await getRequiredAttendee();
  const { data: assignment } = await supabase
    .from("form_assignments")
    .select(
      "id, custom_forms(id, title, description, fields, created_by), form_responses(submitted_at)"
    )
    .eq("id", id)
    .eq("recipient_user_id", user.id)
    .maybeSingle() as any;

  if (!assignment) notFound();
  const form = assignment.custom_forms;
  // PostgREST returns a one-to-one join (UNIQUE constraint) as an object,
  // not an array. Handle both shapes.
  const fr = assignment.form_responses;
  const submittedAt = Array.isArray(fr)
    ? fr[0]?.submitted_at ?? null
    : fr?.submitted_at ?? null;

  const { data: author } = await supabase
    .from("app_users")
    .select("full_name, email")
    .eq("id", form.created_by)
    .single();

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("organization_role, bio, contact_email")
    .eq("user_id", form.created_by)
    .maybeSingle();

  return (
    <section className="max-w-2xl">
      <div className="page-header">
        <span className="accent" />
        <h1>{form.title}</h1>
        <p className="mt-2 text-sm text-brand-blue/70">{form.description}</p>
      </div>
      <aside className="mt-5 rounded border border-brand-cement bg-brand-cement p-4">
        <p className="font-semibold text-brand-blue">
          Sent by {author?.full_name ?? "Conference administrator"}
        </p>
        <p className="text-sm text-brand-blue/70">
          {profile?.organization_role || "Administrator"}
        </p>
        {profile?.bio && (
          <p className="mt-2 text-sm text-brand-blue">{profile.bio}</p>
        )}
        <p className="mt-2 text-sm text-brand-blue">
          {profile?.contact_email || author?.email}
        </p>
      </aside>
      <ResponseForm
        assignmentId={assignment.id}
        fields={form.fields}
        submittedAt={submittedAt}
      />
    </section>
  );
}
