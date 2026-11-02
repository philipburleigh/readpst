import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const TYPE_CODES = { email: "e", appointment: "a", journal: "j", contact: "c" };

export async function extract(pstPath, { outDir, types = ["email"], readpstPath = "readpst" }) {
  const dir = resolve(outDir);
  await mkdir(dir, { recursive: true });

  const typeCodes = types.map((type) => {
    if (!TYPE_CODES[type]) throw new Error(`Unknown item type "${type}"`);
    return TYPE_CODES[type];
  });

  try {
    await run(readpstPath, ["-e", "-8", "-q", "-t", typeCodes.join(","), "-o", dir, resolve(pstPath)]);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `"${readpstPath}" not found. Install libpst: brew install libpst or apt install pst-utils`
      );
    }
    throw new Error(`readpst failed: ${(error.stderr || error.stdout)?.trim() || error.message}`, { cause: error });
  }

  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name));
}

export async function* read(pstPath, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), "readpst-"));
  try {
    for (const file of await extract(pstPath, { ...options, outDir: dir })) {
      yield { path: relative(dir, file), buffer: () => readFile(file), stream: () => createReadStream(file) };
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
