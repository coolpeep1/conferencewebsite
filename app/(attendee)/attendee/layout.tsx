import SidebarShell from "@/app/_components/sidebar-shell";
import { getDisplayName, getRequiredAttendee } from "@/lib/auth";

const attendeeNav = [
  { href: "/attendee/forms", label: "Submitted Forms" },
  { href: "/attendee/assigned-forms", label: "Assigned Forms" },
];

export default async function AttendeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getRequiredAttendee();

  return (
    <SidebarShell
      greetingName={getDisplayName(user)}
      navItems={attendeeNav}
      roleLabel="Attendee Portal"
    >
      {children}
    </SidebarShell>
  );
}
