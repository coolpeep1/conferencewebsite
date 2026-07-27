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
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Submitted Registration Forms Center</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review attendee submissions and publish updates they can see.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Metric label="Total Forms" value={String(totalForms)} />
        <Metric label="Pending Review" value={String(pendingForms)} />
        <Metric label="Total Attendees" value={String(totalAttendees)} />
      </div>

      {error && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Could not load registrations: {error.message}
        </p>
      )}

      <div className="mt-8 space-y-4">
        {registrations?.map((registration) => (
          <RegistrationCard key={registration.id} registration={registration} />
        ))}
      </div>

      {registrations?.length === 0 && (
        <div className="mt-8 rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No submitted forms yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Attendee registrations will appear here after they submit forms.
          </p>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border-2 border-slate-900 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
