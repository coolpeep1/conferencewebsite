import SidebarShell from "@/app/_components/sidebar-shell";
import { getDisplayName, getRequiredAdmin } from "@/lib/auth";

const adminNav = [
  { href: "/admin/dashboard", label: "Registration Center" },
  {
    label: "My Forms",
    items: [
      { href: "/admin/forms", label: "All Forms" },
      { href: "/admin/forms/new", label: "Create Your Own Form" },
      { href: "/admin/responses", label: "Table View" },
    ],
  },
  { href: "/admin/attendees/new", label: "Create Attendee" },
  { href: "/admin/trash", label: "Trash" },
  { href: "/admin/profile", label: "My Profile" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getRequiredAdmin();

  return (
    <SidebarShell
      greetingName={getDisplayName(user)}
      navItems={adminNav}
      roleLabel="Admin Portal"
      showNotifications
    >
      {children}
    </SidebarShell>
  );
}
