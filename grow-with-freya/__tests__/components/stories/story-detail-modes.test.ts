/**
 * Tests for the three ways into a story on the detail sheet.
 *
 * Reading together, playing along with the narration, and recording a grown-up's
 * own voice. The record button wears a microphone, never a play triangle, so a
 * child is never told they are about to play when they are about to record.
 */

import { MODE_OPTIONS } from '@/components/stories/story-card-sheet';
import en from '@/locales/en';

function optionFor(mode: string) {
  const option = MODE_OPTIONS.find((candidate) => candidate.mode === mode);
  expect(option).toBeTruthy();
  return option!;
}

describe('the story detail mode buttons', () => {
  it('should offer reading, playing along, and recording, in that order', () => {
    const underTest = MODE_OPTIONS.map((option) => option.mode);

    expect(underTest).toEqual(['read', 'narrate', 'record']);
  });

  it('should invite a child to play along with the narration', () => {
    const underTest = optionFor('narrate');

    expect(underTest.labelKey).toBe('storyDetail.playAlong');
    expect(en.storyDetail.playAlong).toBe('Play Along');
  });

  it('should call the recording button Record', () => {
    const underTest = optionFor('record');

    expect(underTest.labelKey).toBe('storyDetail.record');
    expect(en.storyDetail.record).toBe('Record');
  });

  it('should mark recording with a microphone rather than a play triangle', () => {
    const underTest = optionFor('record').icon;

    expect(underTest).toBe('mic-outline');
    expect(underTest).not.toMatch(/play/);
  });

  it('should give every button its own icon', () => {
    const underTest = new Set(MODE_OPTIONS.map((option) => option.icon));

    expect(underTest.size).toBe(MODE_OPTIONS.length);
  });
});

describe('the story detail copy', () => {
  it('should no longer carry a Supports heading, now the themes sit under the title', () => {
    const underTest = en.storyDetail as Record<string, string>;

    expect(underTest.supports).toBeUndefined();
  });

  it('should no longer carry a Listen label, now that button says Play Along', () => {
    const underTest = en.storyDetail as Record<string, string>;

    expect(underTest.listen).toBeUndefined();
  });
});
