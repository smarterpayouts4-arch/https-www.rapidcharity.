import { cookies } from "next/headers";
import { ADMIN_COOKIE, readSessionToken, type AdminSession } from "./session";

export async function readAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(ADMIN_COOKIE)?.value);
}
