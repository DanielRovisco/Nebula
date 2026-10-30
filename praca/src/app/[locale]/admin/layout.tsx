import { AdminTabs } from "@/components/admin/admin-tabs";
import { requireAdmin } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // non-admins are redirected; every admin action re-checks the role server-side
  return (
    <>
      <AdminTabs />
      <div className="mx-auto max-w-[1300px] px-4 py-8 sm:px-6">{children}</div>
    </>
  );
}
