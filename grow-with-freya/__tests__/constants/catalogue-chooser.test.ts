import {
  CATALOGUE_CHOOSER,
  chooserBandFade,
  chooserHeadingFade,
  chooserLift,
  chooserStop,
} from '@/constants/catalogue-chooser';
import { SPACE_2, SPACE_3 } from '@/components/child-ui/tokens';

describe('chooserStop', () => {
  it.each`
    screen                                         | rest   | rowBottom | wordsBottom | themeBarTop | stop
    ${'the phone in the picture'}                  | ${218} | ${118}    | ${162}      | ${42}       | ${128}
    ${'a small phone'}                             | ${176} | ${76}     | ${120}      | ${42}       | ${86}
    ${'a tablet held upright'}                     | ${302} | ${104}    | ${158}      | ${46}       | ${120}
    ${'story mode, with no tagline'}               | ${218} | ${118}    | ${118}      | ${42}       | ${126}
    ${'large text, with a taller heading row'}     | ${218} | ${118}    | ${162}      | ${50}       | ${126}
  `('stops on $screen at $stop', ({ rest, rowBottom, wordsBottom, themeBarTop, stop }) => {
    const underTest = chooserStop({ rest, rowBottom, wordsBottom, themeBarTop });

    expect(underTest).toEqual({ rest, stop, travel: rest - stop });
  });

  it('stops the capsule just clear of the lowest letters above it', () => {
    const underTest = chooserStop({ rest: 218, rowBottom: 118, wordsBottom: 162, themeBarTop: 42 });

    expect(underTest.stop + 42).toBe(162 + CATALOGUE_CHOOSER.clearance);
  });

  it('never lifts the Filter button into the title row', () => {
    const underTest = chooserStop({ rest: 218, rowBottom: 118, wordsBottom: 118, themeBarTop: 42 });

    expect(underTest.stop).toBe(118 + CATALOGUE_CHOOSER.clearance);
  });

  it('never sends the chooser down the page: a stop below where it rests is where it rests', () => {
    const underTest = chooserStop({ rest: 218, rowBottom: 118, wordsBottom: 290, themeBarTop: 42 });

    expect(underTest).toEqual({ rest: 218, stop: 218, travel: 0 });
  });

  it.each`
    input
    ${{ rowBottom: NaN }}
    ${{ wordsBottom: NaN }}
    ${{ themeBarTop: NaN }}
    ${{ wordsBottom: Infinity }}
  `('holds the chooser where it rests while a measure is not a number: $input', ({ input }) => {
    const underTest = chooserStop({ rest: 218, rowBottom: 118, wordsBottom: 162, themeBarTop: 42, ...input });

    expect(underTest).toEqual({ rest: 218, stop: 218, travel: 0 });
  });

  it.each([
    ['lift', chooserLift],
    ['band', chooserBandFade],
    ['heading', chooserHeadingFade],
  ])('hands the %s an input range that only ever rises, even with nowhere to travel', (_name, range) => {
    const underTest = range(chooserStop({ rest: 218, rowBottom: 118, wordsBottom: 290, themeBarTop: 42 }));

    expect(underTest.inputRange[1]).toBeGreaterThanOrEqual(underTest.inputRange[0]);
  });

  it('keeps a small, even gap on both', () => {
    expect(CATALOGUE_CHOOSER.clearance).toBe(SPACE_2);
  });
});

describe('chooserLift', () => {
  const stop = chooserStop({ rest: 218, rowBottom: 118, wordsBottom: 162, themeBarTop: 42 });

  it('rides up with the page from where it rests until it reaches its stop', () => {
    expect(chooserLift(stop)).toEqual({ inputRange: [0, 90], outputRange: [218, 128] });
  });
});

describe('chooserBandFade', () => {
  const stop = chooserStop({ rest: 218, rowBottom: 118, wordsBottom: 162, themeBarTop: 42 });

  it('brings the sky in behind the chooser over the first stretch the shelves travel under it', () => {
    expect(chooserBandFade(stop)).toEqual({
      inputRange: [90, 90 + CATALOGUE_CHOOSER.fade],
      outputRange: [0, 1],
    });
  });

  it('clears over the gap that rests between the chooser and the first shelf', () => {
    expect(CATALOGUE_CHOOSER.fade).toBe(SPACE_3);
  });
});

describe('chooserHeadingFade', () => {
  const stop = chooserStop({ rest: 218, rowBottom: 118, wordsBottom: 162, themeBarTop: 42 });

  it('fades the heading out over the last stretch before the chooser stops, and is gone once it has', () => {
    expect(chooserHeadingFade(stop)).toEqual({
      inputRange: [90 - CATALOGUE_CHOOSER.headingFade, 90],
      outputRange: [1, 0],
    });
  });

  it('takes about the height of the heading row to fade', () => {
    expect(CATALOGUE_CHOOSER.headingFade).toBeGreaterThanOrEqual(24);
    expect(CATALOGUE_CHOOSER.headingFade).toBeLessThanOrEqual(40);
  });
});
