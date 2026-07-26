import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";
import StatusSelect from "./status-select";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const { data: registrations, error } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  const totalAttendees =
    registrations?.reduce((sum, r) => sum + (r.num_attendees || 0), 0) ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Registrations</h1>
          <p className="mt-1 text-sm text-gray-600">
            {registrations?.length ?? 0} organizations registered · {totalAttendees} total attendees
          </p>
        </div>
        <LogoutButton />
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-600">Could not load registrations: {error.message}</p>
      )}

      <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>Organization</Th>
              <Th>Contact</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Attendees</Th>
              <Th>Dietary Notes</Th>
              <Th>Status</Th>
              <Th>Registered</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {registrations?.map((r) => (
              <tr key={r.id}>
                <Td className="font-medium">{r.org_name}</Td>
                <Td>{r.contact_name}</Td>
                <Td>{r.contact_email}</Td>
                <Td>{r.contact_phone || "—"}</Td>
                <Td>{r.num_attendees}</Td>
                <Td className="max-w-xs truncate">{r.dietary_notes || "—"}</Td>
                <Td>
                  <StatusSelect id={r.id} currentStatus={r.status} />
                </Td>
                <Td>{new Date(r.created_at).toLocaleDateString()}</Td>
              </tr>
            ))}
          </tbody>
        </table>

        {registrations?.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">No registrations yet.</p>
        )}
      </div>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-gray-800 ${className}`}>{children}</td>;
}
