import { narrationLayout } from '@/components/stories/narration-layout';

describe.each([[844, 390], [1194, 834]])('landscape narration at %s by %s', (width, height) => {
  it('keeps narration on the right with room for navigation', () => {
    const underTest = narrationLayout(width, height, 0);
    expect(underTest).not.toBeNull();
    expect(width - underTest!.right - underTest!.width).toBeGreaterThan(width / 2);
    expect(underTest!.top).toBeGreaterThan(40);
    expect(underTest!.bottom).toBeGreaterThan(60);
  });
});

it('preserves the existing portrait tablet layout', () => {
  expect(narrationLayout(834, 1194, 0)).toBeNull();
});
