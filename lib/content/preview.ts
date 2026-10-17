import { readAdminSession } from "@/lib/auth/cookies";
import { previewFromSearchParams } from "./loadSiteContent";

/** Draft preview is available only to a signed-in editor. */
export async function resolvePreview(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): Promise<boolean> {
  if (!previewFromSearchParams(searchParams)) return false;
  return Boolean(await readAdminSession());
}
