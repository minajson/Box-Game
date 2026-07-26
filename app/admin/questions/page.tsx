import type { Metadata } from "next";

import AdminGate from "@/components/admin/AdminGate";
import QuestionsAdmin from "@/components/admin/QuestionsAdmin";

/**
 * /admin/questions — the whole question-management area.
 *
 * This is the ONLY admin route. Views are addressed by query string:
 *
 *   /admin/questions                  the list
 *   /admin/questions?v=new            add a question
 *   /admin/questions?v=edit&uid=…     edit one
 *   /admin/questions?v=import         import / export
 *
 * `/admin/questions/[id]/edit` deliberately does not exist: the app is a static
 * export, so a dynamic segment would need every question id at build time, and
 * the questions live in the visitor's localStorage. See lib/useAdminRoute.ts.
 *
 * Nothing here is ever rendered on the game screens — components/AdminPanel.tsx
 * only links out to this route, so editing controls cannot appear on a projector.
 */

export const metadata: Metadata = {
  title: "Manage questions · Crack the Box",
  robots: { index: false, follow: false },
};

export default function QuestionsAdminPage() {
  return (
    <AdminGate>
      <QuestionsAdmin />
    </AdminGate>
  );
}
