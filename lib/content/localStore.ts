import { open, mkdir, rename, rm } from "fs/promises";
import { dirname } from "path";

async function writeSynced(filePath: string, contents: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const handle = await open(filePath, "w");
  try {
    await handle.writeFile(contents, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/** Replace a file by writing a temp sibling and renaming it into place. */
export async function atomicWriteFile(filePath: string, contents: string): Promise<void> {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeSynced(tmp, contents);
    await rename(tmp, filePath);
  } catch (error) {
    await rm(tmp, { force: true });
    throw error;
  }
}

/**
 * Publish by preparing both files fully, then renaming them into place.
 * Live files stay untouched until both temp copies have been synced.
 */
export async function publishFiles(
  draftPath: string,
  publishedPath: string,
  contents: string,
): Promise<void> {
  await mkdir(dirname(publishedPath), { recursive: true });
  await mkdir(dirname(draftPath), { recursive: true });
  const stamp = `${process.pid}.${Date.now()}`;
  const publishedTmp = `${publishedPath}.${stamp}.tmp`;
  const draftTmp = `${draftPath}.${stamp}.tmp`;
  try {
    await writeSynced(publishedTmp, contents);
    await writeSynced(draftTmp, contents);
    await rename(publishedTmp, publishedPath);
    await rename(draftTmp, draftPath);
  } catch (error) {
    await rm(publishedTmp, { force: true });
    await rm(draftTmp, { force: true });
    throw error;
  }
}
