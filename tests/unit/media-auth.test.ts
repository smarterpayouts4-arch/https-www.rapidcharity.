import assert from "node:assert/strict";
import test from "node:test";
import { originAllowed } from "../../lib/auth/origin";
import { passwordsMatch, readSessionToken, signSession, type AdminSession } from "../../lib/auth/session";
import { parseVideoEmbed, resolveReportLinks } from "../../lib/content/media";

test("YouTube and Vimeo URLs become embed sources", () => {
  assert.equal(
    parseVideoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.src,
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
  assert.equal(parseVideoEmbed("https://youtu.be/dQw4w9WgXcQ")?.kind, "youtube");
  assert.equal(parseVideoEmbed("https://vimeo.com/123456789")?.src, "https://player.vimeo.com/video/123456789");
  assert.equal(parseVideoEmbed("https://example.com/watch?v=nope"), null);
  assert.equal(parseVideoEmbed(""), null);
});

test("report links fall back when the deck is not in the repo", () => {
  const missing = resolveReportLinks({
    pptxPath: "/assets/documents/report-2025.pptx",
    publicSrc: "https://example.com/report-2025.pptx",
    officeEmbedSrc: "https://view.officeapps.live.com/op/embed.aspx?src=old",
    localFileExists: false,
    configuredUrl: "",
  });
  assert.equal(missing.available, true);
  assert.equal(missing.embedSrc, null);
  assert.equal(missing.downloadHref, "https://example.com/report-2025.pptx");

  const configured = resolveReportLinks({
    pptxPath: "/assets/documents/report-2025.pptx",
    publicSrc: "",
    officeEmbedSrc: "",
    localFileExists: false,
    configuredUrl: "https://cdn.example.org/report.pptx",
  });
  assert.match(configured.embedSrc ?? "", /officeapps\.live\.com/);
  assert.match(configured.embedSrc ?? "", /cdn\.example\.org/);

  const absent = resolveReportLinks({
    pptxPath: "/assets/documents/report-2025.pptx",
    publicSrc: "",
    officeEmbedSrc: "",
    localFileExists: false,
    configuredUrl: "",
  });
  assert.equal(absent.available, false);
});

test("admin session cookie round-trips and rejects tampering", () => {
  process.env.ADMIN_SESSION_SECRET = "unit-test-session-secret";
  const session: AdminSession = { email: "editor@rapidcharity.org", exp: Date.now() + 60_000, mode: "firebase" };
  const token = signSession(session);
  assert.equal(readSessionToken(token)?.email, session.email);
  assert.equal(readSessionToken(`${token}x`), null);
  assert.equal(readSessionToken(token, session.exp + 1), null);
  assert.equal(passwordsMatch("correct horse", "correct horse"), true);
  assert.equal(passwordsMatch("correct horse", "wrong"), false);
});

test("origin check blocks cross-site mutations", () => {
  const ok = new Request("https://rapidcharity.org/api/admin/publish", {
    method: "POST",
    headers: { origin: "https://rapidcharity.org", host: "rapidcharity.org" },
  });
  const bad = new Request("https://rapidcharity.org/api/admin/publish", {
    method: "POST",
    headers: { origin: "https://evil.example", host: "rapidcharity.org" },
  });
  const missing = new Request("https://rapidcharity.org/api/admin/publish", {
    method: "POST",
    headers: { host: "rapidcharity.org" },
  });
  assert.equal(originAllowed(ok), true);
  assert.equal(originAllowed(bad), false);
  assert.equal(originAllowed(missing), false);
});
