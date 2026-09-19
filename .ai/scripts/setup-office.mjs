import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { writeFileAtomic } from './lib/fsx.ts';

const aiDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pin = '3537e140c2094761beae748592aeb92ece8edfdd';
const source = process.argv[2] ? resolve(process.argv[2]) : join(aiDir, 'vendor/pixel-agents');
const exec = (cmd, args, cwd = aiDir) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });
mkdirSync(join(aiDir, 'vendor'), { recursive: true, mode: 0o700 });
if (!existsSync(source)) {
  exec('git', ['clone', 'https://github.com/pixel-agents-hq/pixel-agents.git', source]);
  exec('git', ['checkout', '--detach', pin], source);
}
const actual = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim();
if (actual !== pin) throw new Error(`Pixel Agents must be pinned at ${pin}`);
if (execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: source, encoding: 'utf8' }).trim()) throw new Error('Pixel Agents source has local changes');
exec('npm', ['ci', '--ignore-scripts'], source);
exec('npm', ['run', 'build:webview'], source);
const out = join(aiDir, 'office-dist');
mkdirSync(out, { recursive: true, mode: 0o700 });
cpSync(join(source, 'dist/webview'), join(out, 'pixel'), { recursive: true });
cpSync(join(source, 'LICENSE'), join(out, 'PIXEL-AGENTS-LICENSE'));
await build({ entryPoints: [join(source, 'server/src/assetReload.ts')], outfile: join(aiDir, 'vendor/asset-loader.cjs'),
  bundle: true, platform: 'node', format: 'cjs' });
const { buildAssetCache } = createRequire(import.meta.url)(join(aiDir, 'vendor/asset-loader.cjs'));
const cache = await buildAssetCache(join(source, 'webview-ui/public'), []);
if (!cache.characters || !cache.defaultLayout || !cache.furniture) throw new Error('Upstream assets incomplete');
// Upstream reserves ten empty rows above this layout. Remove only leading void
// rows (leaving one for wall art) so the whole office fits an embedded viewport.
const layout = structuredClone(cache.defaultLayout);
let leading = 0;
while (leading < layout.rows && layout.tiles.slice(leading * layout.cols, (leading + 1) * layout.cols).every(t => t === 255)) leading++;
const trim = Math.max(0, leading - 1);
layout.rows -= trim;
layout.tiles = layout.tiles.slice(trim * layout.cols);
layout.tileColors = layout.tileColors.slice(trim * layout.cols);
layout.furniture = layout.furniture.map(f => ({ ...f, row: f.row - trim }));
const messages = [
  { type: 'characterSpritesLoaded', characters: cache.characters.characters },
  ...(cache.pets ? [{ type: 'petSpritesLoaded', pets: cache.pets.pets, petNames: cache.pets.manifests.map(p => p.name) }] : []),
  { type: 'floorTilesLoaded', sprites: cache.floorTiles },
  { type: 'wallTilesLoaded', sets: cache.wallTiles },
  { type: 'carpetTilesLoaded', sets: cache.carpetTiles },
  { type: 'furnitureAssetsLoaded', catalog: cache.furniture.catalog, sprites: Object.fromEntries(cache.furniture.sprites) },
];
writeFileAtomic(join(out, 'assets.json'), JSON.stringify({ messages, layout, pin }));
// Suppress controls that have no meaning in an observation-only integration.
// The server independently rejects every mutating protocol message.
const htmlPath = join(out, 'pixel/index.html');
writeFileAtomic(htmlPath, readFileSync(htmlPath, 'utf8').replace('</head>', '<style>button{display:none!important}</style></head>'));
console.log(`Pixel office built at ${out}`);
