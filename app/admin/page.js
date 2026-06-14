import { notFound } from "next/navigation";

import { requireAdminIdentity } from "@/lib/auth/is-admin";
import { listApiKeys, countApiKeys } from "@/lib/keys/admin-keys-queries";
import { AdminStatsHeader } from "@/components/admin/admin-stats-header";
import { AdminKeysFilterForm } from "@/components/admin/admin-keys-filter-form";
import { AdminKeysTable } from "@/components/admin/admin-keys-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminCreateKeyForm } from "@/components/admin/admin-create-key-form";

// Reads the session per request — never prerender.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const STATUSES = ["all", "pending", "active"];

/**
 * Admin console. Gated by `requireAdminIdentity()`; non-admins (and signed-out
 * users) get `notFound()` — NOT a redirect, so the route's existence is never
 * confirmed to a probing non-admin.
 */
export default async function AdminPage({ searchParams }) {
  const identity = await requireAdminIdentity();
  if (!identity) notFound();

  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = STATUSES.includes(sp.status) ? sp.status : "all";
  const page = Math.max(1, Number.parseInt(sp.page, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let rows = [];
  let filteredTotal = 0;
  let active = 0;
  let pending = 0;
  let dbError = false;
  try {
    [rows, filteredTotal, active, pending] = await Promise.all([
      listApiKeys({ q, status, limit: PAGE_SIZE, offset }),
      countApiKeys({ q, status }),
      countApiKeys({ status: "active" }),
      countApiKeys({ status: "pending" }),
    ]);
  } catch {
    // DB unreachable (e.g. local without POSTGRES_URL) — show an empty state
    // rather than crashing, mirroring the dashboard's tolerance.
    dbError = true;
  }

  return (
    <main>
      <h1>Admin</h1>
      <p className="muted">Signed in as @{identity.githubUsername}.</p>

      {dbError ? (
        <div className="panel">
          <p className="muted">Key registry is unavailable (no database connection).</p>
        </div>
      ) : (
        <>
          <AdminStatsHeader total={active + pending} active={active} pending={pending} />
          <AdminKeysFilterForm q={q} status={status} />
          <AdminKeysTable rows={rows} />
          <AdminPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={filteredTotal}
            q={q}
            status={status}
          />
        </>
      )}

      <AdminCreateKeyForm />
    </main>
  );
}
