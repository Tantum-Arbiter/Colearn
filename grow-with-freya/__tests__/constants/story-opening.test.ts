/**
 * Tests for the book-opening choreography.
 *
 * Opening a story is a small ritual, not a cut: the floating book settles,
 * the cover lifts, there is a breath with the first page showing, the book
 * grows to fill the screen, and the live reader dissolves in on top. On a
 * phone the screen also has to turn, which happens behind a veil with the
 * book re-entering afterwards rather than jumping.
 */

import { STORY_OPENING, storyOpeningTimeline, type OpeningStepName } from '@/constants/story-opening';

function names(needsRotation: boolean): OpeningStepName[] {
  return storyOpeningTimeline(needsRotation).steps.map((step) => step.name);
}

describe('storyOpeningTimeline', () => {
  it('should open a tablet book by settling, lifting the cover, breathing, growing and dissolving', () => {
    const underTest = names(false);

    expect(underTest).toEqual(['settle', 'coverLift', 'hold', 'grow', 'dissolve']);
  });

  it('should turn a phone behind a veil and bring the book back before lifting the cover', () => {
    const underTest = names(true);

    expect(underTest).toEqual(['settle', 'veilIn', 'turn', 'reenter', 'coverLift', 'hold', 'grow', 'dissolve']);
  });

  it.each([false, true])('should never cut: every step takes time (needsRotation=%s)', (needsRotation) => {
    const underTest = storyOpeningTimeline(needsRotation).steps.every((step) => step.duration > 0);

    expect(underTest).toBe(true);
  });

  it.each([false, true])('should run its steps back to back with no gaps (needsRotation=%s)', (needsRotation) => {
    const { steps } = storyOpeningTimeline(needsRotation);

    const underTest = steps.every((step, index) =>
      index === 0 ? step.at === 0 : step.at === steps[index - 1].at + steps[index - 1].duration
    );

    expect(underTest).toBe(true);
  });

  it('should mount the live reader while the first page is showing, before the book grows', () => {
    const { steps, readerMountsAt } = storyOpeningTimeline(false);
    const hold = steps.find((step) => step.name === 'hold')!;
    const grow = steps.find((step) => step.name === 'grow')!;

    expect(readerMountsAt).toBe(hold.at);
    expect(readerMountsAt).toBeLessThan(grow.at);
  });

  it('should give the cover long enough to read as a book opening, not a flicker', () => {
    const underTest = STORY_OPENING.coverLiftMs;

    expect(underTest).toBeGreaterThanOrEqual(450);
  });

  it('should keep a tablet opening under two seconds', () => {
    const underTest = storyOpeningTimeline(false).total;

    expect(underTest).toBeLessThan(2000);
  });

  it('should keep a phone opening, turn included, under three seconds', () => {
    const underTest = storyOpeningTimeline(true).total;

    expect(underTest).toBeLessThan(3000);
  });

  it('should end on the dissolve so the reader is the last thing to change', () => {
    const { steps } = storyOpeningTimeline(true);

    const underTest = steps[steps.length - 1].name;

    expect(underTest).toBe('dissolve');
  });

  it('should bring the book back a touch small and low so it can rise into its seat', () => {
    expect(STORY_OPENING.reenterScale).toBeLessThan(1);
    expect(STORY_OPENING.reenterLift).toBeGreaterThan(0);
  });
});
