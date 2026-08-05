import { getRequiredAdmin } from "@/lib/auth";
import FormBuilder from "./form-builder";

export default async function NewAdminFormPage() {
  const { supabase } = await getRequiredAdmin();
  const { data: attendees } = await supabase
    .from("app_users")
    .select("id, full_name, email")
    .eq("role", "attendee")
    .order("full_name");
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, org_name, contact_name, created_by")
    .order("org_name");
  return (
    <section className="max-w-2xl">
      <div className="page-header">
        <span className="accent" />
        <h1>Create Your Own Form</h1>
        <p className="mt-2 text-sm text-brand-blue/70">
          Create a conference registration form for an organization.
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-brand-cement bg-brand-white p-5">
        <FormBuilder
          attendees={attendees ?? []}
          organizations={organizations ?? []}
        />
      </div>
    </section>
  );
}
