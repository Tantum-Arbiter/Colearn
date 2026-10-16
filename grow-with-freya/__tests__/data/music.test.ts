import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import * as music from '@/data/music';
import type { MusicTrack } from '@/types/music';

const ROOT = join(__dirname, '..', '..');
const AUDIO_DIR = join(ROOT, 'assets', 'audio');
const REGISTRIES = ['data/music.ts', 'services/background-music.ts'];

function audioFilesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return audioFilesUnder(path);
    return name.endsWith('.md') ? [] : [relative(AUDIO_DIR, path)];
  });
}

function audioRequiredBy(file: string): string[] {
  const source = readFileSync(join(ROOT, file), 'utf8');
  return [...source.matchAll(/require\('(?:\.\.\/)+assets\/audio\/([^']+)'\)/g)].map((match) => match[1]);
}

function isTrack(value: unknown): value is MusicTrack {
  return typeof value === 'object' && value !== null && 'audioSource' in value && 'id' in value;
}

const trackLists = Object.entries(music).filter(
  (entry): entry is [string, MusicTrack[]] => Array.isArray(entry[1]) && entry[1].every(isTrack),
);

describe('Bundled audio', () => {
  const listed = new Set(music.ALL_MUSIC_TRACKS.map((track) => track.id));

  it.each(trackLists)('%s holds no audio the app never lists', (_name, tracks) => {
    const hidden = tracks.filter((track) => track.audioSource != null && !listed.has(track.id));
    expect(hidden.map((track) => track.id)).toEqual([]);
  });

  it('registers only files that exist', () => {
    const missing = REGISTRIES.flatMap(audioRequiredBy).filter((file) => !existsSync(join(AUDIO_DIR, file)));
    expect(missing).toEqual([]);
  });

  it('ships no file that nothing plays', () => {
    const required = new Set(REGISTRIES.flatMap(audioRequiredBy));
    expect(audioFilesUnder(AUDIO_DIR).filter((file) => !required.has(file))).toEqual([]);
  });
});
