import { getRequiredAdmin } from "@/lib/auth";
import ProfileEditor from "./profile-editor";

export default async function ProfilePage() {
  const { supabase, user } = await getRequiredAdmin();
  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("organization_role, bio, contact_email")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <section>
      <div className="page-header">
        <span className="accent" />
        <h1>My Profile</h1>
        <p className="mt-2 text-sm text-brand-blue/70">
          This information is shown to attendees assigned one of your forms.
        </p>
      </div>
      <ProfileEditor
        name={user.full_name}
        email={user.email}
        profile={profile}
      />
    </section>
  );
}
