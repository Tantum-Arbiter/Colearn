import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { resolveInside, writeFileAtomic } from '../lib/fsx.ts';
import { redactSecrets, safeDisplay, sanitizeForTerminal } from '../lib/text.ts';

describe('resolveInside', () => {
  let root: string;
  let outside: string;
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'ai-root-')));
    outside = realpathSync(mkdtempSync(join(tmpdir(), 'ai-outside-')));
    mkdirSync(join(root, 'state'));
    symlinkSync(outside, join(root, 'escape'));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  });

  it('resolves existing and not-yet-created paths inside the root', () => {
    assert.equal(resolveInside(root, 'state'), join(root, 'state'));
    assert.equal(resolveInside(root, 'state/new/file.json'), join(root, 'state', 'new', 'file.json'));
  });

  it('rejects traversal and symlink escapes', () => {
    assert.throws(() => resolveInside(root, '../x'), /escapes/);
    assert.throws(() => resolveInside(root, '/etc/passwd'), /escapes/);
    assert.throws(() => resolveInside(root, 'escape'), /symlink/);
    assert.throws(() => resolveInside(root, 'escape/new.json'), /symlink/);
  });

  it('writes atomically', () => {
    const path = join(root, 'state', 'x.json');
    writeFileAtomic(path, 'one');
    writeFileAtomic(path, 'two');
    assert.equal(readFileSync(path, 'utf8'), 'two');
  });
});

describe('text safety', () => {
  it('strips ANSI, control and bidi characters', () => {
    assert.equal(sanitizeForTerminal('\u001b[2J\u001b]0;title\u0007ok\u0000\u202e'), 'ok');
  });

  it('redacts common secret shapes', () => {
    const text = [
      `sk-ant-api03-${'A'.repeat(24)}`,
      `Authorization: Bearer ${'abcdefghijklmnop'.repeat(2)}`,
      `eyJ${'x'.repeat(12)}.eyJ${'y'.repeat(12)}.${'abcdefghijklmnop'}`,
      `ghp_${'abcdefghijklmnop'.repeat(2)}`,
      `AKIA${'ABCDEFGHIJKLMNOP'}`,
    ].join('\n');
    const out = redactSecrets(text);
    assert.equal(out.match(/\[REDACTED\]/g)?.length, 5);
    assert.ok(!out.includes('abcdefghijklmnop'));
  });

  it('truncates long display text', () => {
    assert.equal(safeDisplay('a'.repeat(50), 10), `${'a'.repeat(10)}…`);
  });
});
