import { randomBytes } from 'node:crypto';
import { closeSync, fsyncSync, mkdirSync, openSync, realpathSync, renameSync, unlinkSync, writeSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export function writeFileAtomic(path: string, data: string): void {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmp = join(dir, `.${basename(path)}.${randomBytes(6).toString('hex')}.tmp`);
  const fd = openSync(tmp, 'wx', 0o600);
  try {
    writeSync(fd, data);
    fsyncSync(fd);
  } catch (error) {
    closeSync(fd);
    unlinkSync(tmp);
    throw error;
  }
  closeSync(fd);
  renameSync(tmp, path);
}

export function isInside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

export function resolveInside(root: string, target: string): string {
  const realRoot = realpathSync(root);
  const lexical = resolve(realRoot, target);
  if (!isInside(realRoot, lexical)) {
    throw new Error(`Path escapes ${realRoot}: ${target}`);
  }
  let existing = lexical;
  const missing: string[] = [];
  for (;;) {
    try {
      existing = realpathSync(existing);
      break;
    } catch {
      const parent = dirname(existing);
      if (parent === existing) {
        throw new Error(`Cannot resolve ${target}`);
      }
      missing.unshift(basename(existing));
      existing = parent;
    }
  }
  const real = join(existing, ...missing);
  if (!isInside(realRoot, real)) {
    throw new Error(`Path escapes ${realRoot} through a symlink: ${target}`);
  }
  return real;
}
