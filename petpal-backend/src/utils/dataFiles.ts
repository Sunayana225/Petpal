import * as fs from 'fs';
import * as path from 'path';

/**
 * Helpers for reading and writing the JSON data files that ship in
 * `petpal-backend/data`.
 *
 * `data/` sits two levels above both `src/` (ts-node/jest) and `dist/`
 * (production), so a single `__dirname`-relative path works in every mode.
 * Callers sometimes launch Node from a different working directory, so reads
 * also fall back to a couple of `cwd` candidates rather than failing silently.
 */

/** The canonical path to a data file — used for writing new files. */
export function dataFilePath(fileName: string): string {
  return path.join(__dirname, '../../data', fileName);
}

/** Locate an existing data file, or `null` if it does not exist yet. */
export function findDataFile(fileName: string): string | null {
  const candidates = [
    dataFilePath(fileName),
    path.join(process.cwd(), 'data', fileName),
    path.join(process.cwd(), 'petpal-backend/data', fileName),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

/** Read and parse a JSON file, returning `fallback` on any error. */
export function readJsonFile<T>(filePath: string | null, fallback: T): T {
  if (!filePath) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

/**
 * Write JSON atomically: serialise to a temp sibling, then rename over the
 * target so a crash mid-write can never leave a half-written file behind.
 */
export function writeJsonFile(filePath: string, data: unknown): void {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });

  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}
