import { join } from "path";

export const CONTENT_DIR = join(process.cwd(), "content");
export const PUBLISHED_PATH = join(CONTENT_DIR, "site.json");
export const DRAFT_PATH = join(CONTENT_DIR, "site.draft.json");
export const BLOG_PUBLISHED_PATH = join(CONTENT_DIR, "blog.json");
export const BLOG_DRAFT_PATH = join(CONTENT_DIR, "blog.draft.json");
export const EVENTS_PUBLISHED_PATH = join(CONTENT_DIR, "events.json");
export const EVENTS_DRAFT_PATH = join(CONTENT_DIR, "events.draft.json");
export const VIDEO_UPLOAD_DIR = join(process.cwd(), "public", "assets", "videos");
