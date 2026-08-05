import { getRequiredAdmin } from "@/lib/auth";
import RegistrationUpdateForm from "../_components/registration-update-form";
import RegistrationCard from "../_components/registration-card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { supabase } = await getRequiredAdmin();

  const { data: registrations, error } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  const totalForms = registrations?.length ?? 0;
  const totalAttendees =
    registrations?.reduce((sum, registration) => sum + (registration.num_attendees || 0), 0) ?? 0;
  const pendingForms =
    registrations?.filter((registration) => registration.status === "pending").length ?? 0;

  return (
    <section>
      <div className="page-header">
        <span className="accent" />
        <h1>Submitted Registration Forms Center</h1>
        <p className="mt-2 text-sm text-brand-blue/70">
          Review attendee submissions and publish updates they can see.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Metric label="Total Forms" value={String(totalForms)} />
        <Metric label="Pending Review" value={String(pendingForms)} />
        <Metric label="Total Attendees" value={String(totalAttendees)} />
      </div>

      {error && (
        <p className="mt-6 rounded-md border border-brand-saffron bg-brand-cement p-3 text-sm text-brand-blue">
          Could not load registrations: {error.message}
        </p>
      )}

      <div className="mt-8 space-y-4">
        {registrations?.map((registration) => (
          <RegistrationCard key={registration.id} registration={registration} />
        ))}
      </div>

      {registrations?.length === 0 && (
        <div className="mt-8 rounded-lg border-2 border-dashed border-brand-saffron bg-brand-cement p-8 text-center">
          <h2 className="font-display text-lg font-bold text-brand-blue">No submitted forms yet</h2>
          <p className="mt-2 text-sm text-brand-blue/70">
            Attendee registrations will appear here after they submit forms.
          </p>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-brand-cement bg-brand-cement p-4">
      <p className="text-sm text-brand-blue/70">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-brand-blue">{value}</p>
    </div>
  );
}
