import { getRequiredAdmin } from "@/lib/auth";
import FormBuilder from "./form-builder";

export default async function NewAdminFormPage() {
  const { supabase } = await getRequiredAdmin();
  const { data: attendees } = await supabase.from("app_users").select("id, full_name, email").eq("role", "attendee").order("full_name");
  const { data: organizations } = await supabase.from("organizations").select("id, org_name, contact_name, created_by").order("org_name");
  return (
    <section className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Create Your Own Form</h1>
      <p className="mt-1 text-sm text-slate-600">
        Create a conference registration form for an organization.
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><FormBuilder attendees={attendees ?? []} organizations={organizations ?? []} /></div>
    </section>
  );
}
