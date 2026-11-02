import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { extract, read } from "./index.js";

// Point READPST_TEST_PST at any real .pst to run the happy path, e.g.
// https://github.com/epfromer/pst-extractor/raw/master/src/__tests__/testdata/enron.pst
const samplePst = process.env.READPST_TEST_PST;

test("extracts .eml files from a pst", { skip: !samplePst && "READPST_TEST_PST not set" }, async () => {
  const outDir = await mkdtemp(join(tmpdir(), "readpst-test-"));
  try {
    const files = await extract(samplePst, { outDir });
    assert.ok(files.length > 0);
    assert.ok(files.every((file) => file.endsWith(".eml")));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("rejects a file that is not a pst", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "readpst-test-"));
  try {
    const badPst = join(outDir, "bad.pst");
    await writeFile(badPst, "not a pst");
    await assert.rejects(extract(badPst, { outDir: join(outDir, "out") }), /readpst failed: Error opening File/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("explains a missing binary", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "readpst-test-"));
  try {
    await assert.rejects(extract("x.pst", { outDir, readpstPath: "no-such-readpst" }), /not found\. Install libpst/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

const tempDirs = async () => (await readdir(tmpdir())).filter((name) => /^readpst-(?!test-)/.test(name));

test("reads items as buffers and streams, then removes the temp dir", { skip: !samplePst && "READPST_TEST_PST not set" }, async () => {
  const before = await tempDirs();
  let count = 0;
  for await (const item of read(samplePst)) {
    assert.match(item.path, /\.eml$/);
    const buffer = await item.buffer();
    assert.match(buffer.toString(), /^[\w-]+: /);
    const chunks = [];
    for await (const chunk of item.stream()) chunks.push(chunk);
    assert.deepEqual(Buffer.concat(chunks), buffer);
    count++;
  }
  assert.ok(count > 0);
  assert.deepEqual(await tempDirs(), before);
});

test("removes the temp dir when the loop breaks early", { skip: !samplePst && "READPST_TEST_PST not set" }, async () => {
  const before = await tempDirs();
  for await (const item of read(samplePst)) {
    assert.ok(item);
    break;
  }
  assert.deepEqual(await tempDirs(), before);
});
