import type { Metadata } from "next";
import { AdminClient } from "@/components/admin/AdminClient";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { readAdminSession } from "@/lib/auth/cookies";
import { firebaseAuthConfigured, LOCAL_DEV_PASSWORD, localAdminAllowed, localAdminPassword } from "@/lib/auth/session";
import {
  loadDraftBlogContent,
  loadDraftContent,
  loadDraftEventsContent,
} from "@/lib/content";
import { storageMode } from "@/lib/content/repository";
import type { BatchRecord } from "@/lib/application/batches";
import { listBatches, listSubmissions } from "@/lib/application/store";
import { loadFormState } from "@/lib/application/formSettings";
import type { StoredApplication } from "@/lib/application/types";

export const metadata: Metadata = {
  title: "Content Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await readAdminSession();
  if (!session) {
    const firebase = firebaseAuthConfigured();
    const mode = firebase ? "firebase" : localAdminAllowed() ? "local" : "unconfigured";
    return (
      <AdminLogin
        mode={mode}
        apiKey={process.env.NEXT_PUBLIC_FIREBASE_API_KEY}
        devPassword={localAdminPassword() === LOCAL_DEV_PASSWORD}
      />
    );
  }

  const [initial, initialBlog, initialEvents] = await Promise.all([
    loadDraftContent(),
    loadDraftBlogContent(),
    loadDraftEventsContent(),
  ]);
  const formState = await loadFormState();
  let applications: StoredApplication[] = [];
  let batches: BatchRecord[] = [];
  let applicationsError = "";
  try {
    applications = await listSubmissions();
    batches = await listBatches(applications, formState.cycleId);
  } catch (error) {
    applicationsError = error instanceof Error ? error.message : "Applications could not be loaded.";
    try {
      batches = await listBatches([], formState.cycleId);
    } catch {
      batches = [];
    }
  }

  return (
    <AdminClient
      initial={initial}
      initialBlog={initialBlog}
      initialEvents={initialEvents}
      applications={applications}
      batches={batches}
      applicationsError={applicationsError}
      activeCycle={formState.cycleId}
      email={session.email}
      storage={storageMode()}
    />
  );
}
