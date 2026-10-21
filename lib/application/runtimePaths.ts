import path from "path";

/** Local submissions root. Override with `RAPID_SUBMISSIONS_DIR` for isolated unit tests only. */
export function submissionsRoot(): string {
  const override = process.env.RAPID_SUBMISSIONS_DIR?.trim();
  if (override) return path.resolve(override);
  return path.join(process.cwd(), "data", "submissions");
}

/** Local upload bytes root. Override with `RAPID_UPLOADS_DIR` for isolated unit tests only. */
export function uploadsRoot(): string {
  const override = process.env.RAPID_UPLOADS_DIR?.trim();
  if (override) return path.resolve(override);
  return path.join(process.cwd(), "data", "uploads");
}
