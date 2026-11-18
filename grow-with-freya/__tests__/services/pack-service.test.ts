import { PackFileMissing, PackNotFound, bundledPackIds, loadPack } from '@/services/pack-service';

describe('loadPack', () => {
  it('finds the wombat picnic bundled in the app', async () => {
    const underTest = await loadPack('wombat-picnic');

    expect(underTest.manifest.id).toBe('wombat-picnic');
    expect(underTest.manifest.engine).toBe('place');
    expect(bundledPackIds()).toEqual(['wombat-picnic']);
  });

  it('refuses a pack the app does not have, by name', async () => {
    await expect(loadPack('nothing-of-the-sort')).rejects.toThrow(PackNotFound);
    await expect(loadPack('')).rejects.toThrow('No pack is bundled or cached as ');
  });

  it('gives each crop its own art, with the layers, starts and zone frames the manifest lists', async () => {
    const underTest = await loadPack('wombat-picnic');

    expect(underTest.art('phone').width).toBeLessThan(underTest.art('phone').height);
    expect(underTest.art('tablet').width).toBeGreaterThan(underTest.art('tablet').height);
    expect(underTest.art('phone').layers.map((layer) => layer.id)).toEqual(underTest.art('tablet').layers.map((layer) => layer.id));
    expect(Object.keys(underTest.art('phone').starts)).toEqual(Object.keys(underTest.art('tablet').starts));
  });

  it('resolves every layer, the cover and every sound to something Metro bundled', async () => {
    const underTest = await loadPack('wombat-picnic');

    (['phone', 'tablet'] as const).forEach((crop) => {
      underTest.art(crop).layers.forEach((layer) => expect(underTest.image(layer.file)).toBeTruthy());
    });
    expect(underTest.image(underTest.manifest.cover)).toBeTruthy();
    Object.values(underTest.manifest.sounds).forEach((sound) => expect(underTest.sound(sound.file)).toBeTruthy());
  });

  it('names a file the pack has not got rather than handing back nothing', async () => {
    const underTest = await loadPack('wombat-picnic');

    expect(() => underTest.image('art/phone/nothing.webp')).toThrow(PackFileMissing);
    expect(() => underTest.sound('sounds/silence.m4a')).toThrow('Pack wombat-picnic has no file sounds/silence.m4a');
  });

  it('finds a mission by id, and nothing for free play or an unknown id', async () => {
    const underTest = await loadPack('wombat-picnic');

    expect(underTest.mission('picnic')?.id).toBe('picnic');
    expect(underTest.mission(null)).toBeNull();
    expect(underTest.mission('nothing-of-the-sort')).toBeNull();
  });
});
