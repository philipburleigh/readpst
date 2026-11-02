export type ItemType = "email" | "appointment" | "journal" | "contact";

export interface ExtractOptions {
  /** Directory to write into. Created if missing; mirrors the PST's folder tree. */
  outDir: string;
  /** Item types to export. Defaults to ["email"]. */
  types?: ItemType[];
  /** Path to the readpst binary. Defaults to "readpst" on PATH. */
  readpstPath?: string;
}

/** Converts a .pst/.ost into one .eml per item and resolves to the absolute paths of the written files. */
export function extract(pstPath: string, options: ExtractOptions): Promise<string[]>;

export interface PstItem {
  /** Path relative to the PST root, e.g. "Inbox/1.eml". */
  path: string;
  buffer(): Promise<Buffer>;
  stream(): import("node:fs").ReadStream;
}

/**
 * Extracts into a temp dir and yields each item; the dir is removed when the loop ends, breaks or throws.
 * Read an item's buffer or stream before moving to the next one.
 */
export function read(pstPath: string, options?: Omit<ExtractOptions, "outDir">): AsyncGenerator<PstItem, void, undefined>;
