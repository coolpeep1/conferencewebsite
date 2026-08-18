import Link from "next/link";
import { getRequiredAdmin } from "@/lib/auth";
import RegistrationCard from "../_components/registration-card";

export const dynamic = "force-dynamic";

const STATUSES = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "waitlisted", label: "Waitlisted" },
] as const;

type Status = (typeof STATUSES)[number]["key"];

function isStatus(value: string | string[] | undefined): value is Status {
  return typeof value === "string" && STATUSES.some((s) => s.key === value);
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { supabase } = await getRequiredAdmin();
  const { status: rawStatus } = await searchParams;
  const status: Status = isStatus(rawStatus) ? rawStatus : "pending";

  // Load all non-deleted orgs so the metric counts reflect the whole active set,
  // not just the current tab. The visible cards are filtered by `status`.
  const { data: allRows, error } = await supabase
    .from("organizations")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const registrations = (allRows ?? []).filter((row) => row.status === status);

  const totalForms = allRows?.length ?? 0;
  const totalAttendees =
    allRows?.reduce((sum, registration) => sum + (registration.num_attendees || 0), 0) ?? 0;
  const pendingForms =
    allRows?.filter((registration) => registration.status === "pending").length ?? 0;

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="page-header">
          <span className="accent" />
          <h1>Submitted Registration Forms Center</h1>
          <p className="mt-2 text-sm text-brand-blue/70">
            Review attendee submissions and publish updates they can see.
          </p>
        </div>
        <Link
          href="/admin/trash"
          className="rounded-md border border-brand-cement bg-brand-white px-3 py-2 text-sm font-medium text-brand-blue transition-colors hover:bg-brand-cement"
        >
          View trash
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Metric label="Total Forms" value={String(totalForms)} />
        <Metric label="Pending Review" value={String(pendingForms)} />
        <Metric label="Total Attendees" value={String(totalAttendees)} />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-1 rounded-md bg-brand-cement p-1 text-sm">
        {STATUSES.map((item) => {
          const active = status === item.key;
          return (
            <Link
              key={item.key}
              href={`/admin/dashboard?status=${item.key}`}
              className={`rounded px-3 py-2 text-center font-medium transition-colors ${
                active
                  ? "bg-brand-white text-brand-blue border border-brand-cement"
                  : "text-brand-blue/70 hover:bg-brand-white/50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {error && (
        <p className="mt-6 rounded-md border border-brand-saffron bg-brand-cement p-3 text-sm text-brand-blue">
          Could not load registrations: {error.message}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {registrations.map((registration) => (
          <RegistrationCard key={registration.id} registration={registration} />
        ))}
      </div>

      {registrations.length === 0 && (
        <div className="mt-6 rounded-lg border-2 border-dashed border-brand-saffron bg-brand-cement p-8 text-center">
          <h2 className="font-display text-lg font-bold text-brand-blue">
            No {status} registrations
          </h2>
          <p className="mt-2 text-sm text-brand-blue/70">
            {status === "pending"
              ? "Attendee registrations will appear here after they submit forms."
              : `No registrations have been marked as ${status} yet.`}
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
