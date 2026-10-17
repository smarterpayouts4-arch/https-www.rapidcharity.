/**
 * Server loader: the application form's active cycle and availability, read
 * from the published admin content (Firestore or local JSON) on every request.
 */
import { loadSiteContent } from "@/lib/content";
import { resolveFormState, type FormState } from "./formState";

export { resolveFormState, type FormState };

export async function loadFormState(now = new Date()): Promise<FormState> {
  try {
    const content = await loadSiteContent({ preview: false });
    return resolveFormState(content.applicationForm, content.intakes, now);
  } catch {
    return resolveFormState(undefined, undefined, now);
  }
}
