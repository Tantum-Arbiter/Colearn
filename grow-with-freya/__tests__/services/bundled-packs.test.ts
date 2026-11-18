import fs from 'fs';
import path from 'path';
import { BUNDLED_PACKS } from '@/data/bundled-packs';
import { PACK_BUDGET_BYTES, validatePack, type PackFiles } from '@/services/pack-validation';
import { SUPPORTED_LANGUAGES } from '@/services/i18n';

const PACKS_DIR = path.join(process.cwd(), 'assets', 'packs');

function filesOf(packId: string): PackFiles {
  const dir = path.join(PACKS_DIR, packId);
  const sizeOf = (file: string): number => {
    const full = path.join(dir, file);
    return fs.existsSync(full) ? fs.statSync(full).size : 0;
  };
  const walk = (folder: string): string[] =>
    fs.readdirSync(folder).flatMap((name) => {
      const full = path.join(folder, name);
      return fs.statSync(full).isDirectory() ? walk(full) : [full];
    });
  const media = walk(dir).filter((file) => /\.(webp|m4a)$/.test(file));

  return {
    has: (file) => fs.existsSync(path.join(dir, file)),
    sizeOf,
    total: () => media.reduce((sum, file) => sum + fs.statSync(file).size, 0),
  };
}

const locales: Record<string, unknown> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((language) => [language.code, require(`@/locales/${language.code}/index.ts`).default])
);

describe.each(Object.keys(BUNDLED_PACKS))('the bundled pack %s', (packId) => {
  const pack = BUNDLED_PACKS[packId];

  it('validates: every file present, every key in all 14 locales, every band, within budget', () => {
    expect(validatePack(pack.manifest, filesOf(packId), locales)).toEqual([]);
  });

  it('is the manifest on disk, so the app and the validator read the same thing', () => {
    const onDisk = JSON.parse(fs.readFileSync(path.join(PACKS_DIR, packId, 'pack.json'), 'utf8'));

    expect(pack.manifest).toEqual(onDisk);
  });

  it('bundles exactly the files its manifest names', () => {
    const named = new Set<string>([pack.manifest.cover]);
    Object.values(pack.manifest.art).forEach((art) => art.layers.forEach((layer) => named.add(layer.file)));
    Object.values(pack.manifest.sounds).forEach((sound) => named.add(sound.file));

    expect(new Set(Object.keys(pack.files))).toEqual(named);
  });

  it('keeps its art and sound well inside the budget', () => {
    expect(filesOf(packId).total()).toBeLessThan(PACK_BUDGET_BYTES);
  });

  it('carries a checksum', () => {
    expect(pack.manifest.checksum).toMatch(/^[0-9a-f]{16}$/);
  });
});
