/**
 * Tests for the returning-user home as a whole.
 *
 * A personal welcome, the story to carry on with, how far the family has come,
 * what they achieved and what comes next -- every value from the data model,
 * every card a way somewhere.
 */

import React from 'react';
import { Dimensions, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { render, fireEvent, type RenderResult } from '@testing-library/react-native';
import { HomeScene } from '@/components/home/home-scene';
import { HOME_THEMES } from '@/constants/home-scene';
import { HOME_CARD_TYPE } from '@/constants/home-journey';
import { HERO_SKY, heroContentTop } from '@/constants/home-sky';
import { ringCentre } from '@/constants/screen-time-ring';
import type { ChildHomeData, WelcomeCopy } from '@/types/child-home';

interface RenderedNode {
  type: unknown;
  props: Record<string, unknown>;
}

function textContents(view: RenderResult): string[] {
  return view
    .UNSAFE_queryAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function pressTestId(view: RenderResult, testID: string): void {
  const matches = byTestId(view, testID);

  fireEvent.press(matches[matches.length - 1]);
}

const DATA: ChildHomeData = {
  firstName: 'Freya',
  currentStory: { id: 'moonlight', title: 'The Moonlight Garden', currentPage: 8, totalPages: 14 },
  storiesCompleted: 12,
  readingMinutes: 84,
  weeklyReadingMinutes: 22,
  readingStreakDays: 4,
  screenTimeSafety: 100,
  newestAchievement: { id: 'story-adventurer', title: 'Story Explorer', description: 'Read 10 stories', icon: 'book' },
  nextAchievement: { title: 'Moon Explorer', current: 3, required: 5, unit: 'stories' },
};

const WELCOME: WelcomeCopy = {
  state: 'normal',
  titleKey: 'home.welcome.normal.title',
  subtitleKey: 'home.welcome.normal.subtitle',
  params: { name: 'Freya', count: 4, achievement: 'Story Explorer' },
};

function renderScene(props: Partial<React.ComponentProps<typeof HomeScene>> = {}) {
  const handlers = {
    onContinue: jest.fn(),
    onOpenAchievements: jest.fn(),
    onContinueLearning: jest.fn(),
    onOpenGrownUps: jest.fn(),
  };

  const view = render(<HomeScene data={DATA} welcome={WELCOME} timeOfDay="night" {...handlers} {...props} />);

  return { view, ...handlers, ...view };
}

describe('HomeScene', () => {
  describe('the welcome', () => {
    it('should greet the child by the message the data model chose', () => {
      const { view } = renderScene();

      const underTest = textContents(view);

      expect(underTest.some((text) => text.startsWith('home.welcome.normal.title (name:Freya'))).toBe(true);
      expect(underTest.some((text) => text.startsWith('home.welcome.normal.subtitle'))).toBe(true);
    });

    it('should show whichever welcome state it is handed', () => {
      const { view } = renderScene({
        welcome: { ...WELCOME, state: 'longAbsence', titleKey: 'home.welcome.longAbsence.title', subtitleKey: 'home.welcome.longAbsence.subtitle' },
      });

      const underTest = textContents(view);

      expect(underTest.some((text) => text.startsWith('home.welcome.longAbsence.title'))).toBe(true);
    });
  });

  describe('the sequence', () => {
    /**
     * Three panels, not four and a link: the story to carry on with, the badge
     * being worked towards, and the way into the library. The stats card that
     * sat second was a parent's reading of the week in the middle of a child's
     * screen, and the way onward was a text pill under everything.
     */
    it('should read continue, achievements, then the way onward', () => {
      const { view } = renderScene();

      const ids = ['continue-card', 'achievement-card', 'continue-learning-card'].map(
        (id) => byTestId(view, id).length > 0
      );

      expect(ids).toEqual([true, true, true]);
      expect(byTestId(view, 'journey-card')).toHaveLength(0);
      expect(byTestId(view, 'find-story-pill')).toHaveLength(0);
    });

    /** The one number kept from the stats card, as encouragement above them. */
    it('should show the streak under the greeting, above the cards', () => {
      const { view } = renderScene();

      expect(byTestId(view, 'streak-chip').length).toBeGreaterThan(0);
      expect(textContents(view)).toContain('home.streak.days (count:4)');
    });

    it('should name the story to carry on with and where the family is in it', () => {
      const { view } = renderScene();

      const underTest = textContents(view);

      expect(underTest).toContain('The Moonlight Garden');
      expect(underTest).toContain('home.pagePosition (page:8, total:14)');
    });

    it('should show the next badge to reach', () => {
      const { view } = renderScene();

      const underTest = textContents(view);

      expect(underTest).toContain('Moon Explorer');
    });
  });

  describe('the ways in', () => {
    it('should carry on the story from the first card', () => {
      const { view, onContinue } = renderScene();

      pressTestId(view, 'continue-card');

      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('should open the achievements from the badge card', () => {
      const { view, onOpenAchievements } = renderScene();

      pressTestId(view, 'achievement-card');

      expect(onOpenAchievements).toHaveBeenCalledTimes(1);
    });

    it('should offer a way on into the library', () => {
      const { view, onContinueLearning } = renderScene();

      pressTestId(view, 'continue-learning-card');

      expect(onContinueLearning).toHaveBeenCalledTimes(1);
    });
  });

  describe('a family with nothing yet', () => {
    const EMPTY: ChildHomeData = {
      firstName: '',
      storiesCompleted: 0,
      readingMinutes: 0,
      weeklyReadingMinutes: 0,
      readingStreakDays: 0,
    };

    it('should invite a first story rather than show an empty continue card', () => {
      const { view } = renderScene({ data: EMPTY });

      expect(byTestId(view, 'continue-panel-empty').length).toBeGreaterThan(0);
      expect(byTestId(view, 'continue-panel').length).toBe(0);
    });

    it('should still celebrate rather than show an empty badge card', () => {
      const { view } = renderScene({ data: EMPTY });

      expect(byTestId(view, 'achievement-all-done').length).toBeGreaterThan(0);
    });
  });

  describe('the grown-up corner', () => {
    it('should be present but subordinate', () => {
      const { view } = renderScene();

      expect(textContents(view)).toContain('home.grownUps');
    });

    it('should hand off rather than navigate itself, so the gate can run', () => {
      const { view, onOpenGrownUps, onContinueLearning } = renderScene();

      pressTestId(view, 'grown-ups-pill');

      expect(onOpenGrownUps).toHaveBeenCalledTimes(1);
      expect(onContinueLearning).not.toHaveBeenCalled();
    });
  });
});

describe('HomeScene time of day', () => {
  describe.each([
    ['night', HOME_THEMES.night],
    ['day', HOME_THEMES.day],
  ] as const)('at %s', (timeOfDay, theme) => {
    it('should dress the welcome in that theme', () => {
      const { view } = renderScene({ timeOfDay });

      const underTest = byTestId(view, 'home-welcome-title')[0];

      expect(StyleSheet.flatten(underTest?.props.style).color).toBe(theme.title);
    });

    it('should show the horizon and the star field', () => {
      const { view } = renderScene({ timeOfDay });

      expect(byTestId(view, 'home-horizon').length).toBeGreaterThan(0);
      expect(byTestId(view, 'star-field').length).toBeGreaterThan(0);
    });
  });

  it.each([
    ['day', 'home.sun'],
    ['night', 'home.moon'],
  ] as const)('should hang the %s face over the scene', (timeOfDay, label) => {
    const { view } = renderScene({ timeOfDay });

    const underTest = byTestId(view, 'sky-face')[0];

    expect(underTest.props.accessibilityLabel).toBe(label);
  });
});

describe('HomeScene screen time', () => {
  it('should stay out of the way when screen time is not being tracked', () => {
    const { view } = renderScene({ screenTime: null });

    expect(byTestId(view, 'screen-time-ring').length).toBe(0);
  });

  it('should show a quiet ring while there is time left', () => {
    const { view } = renderScene({ screenTime: { usageSeconds: 600, limitSeconds: 3600 } });

    expect(byTestId(view, 'screen-time-ring').length).toBeGreaterThan(0);
    expect(byTestId(view, 'screen-time-ring-fill').length).toBe(0);
  });

  it('should fill the ring once the allowance is spent', () => {
    const { view } = renderScene({ screenTime: { usageSeconds: 3600, limitSeconds: 3600 } });

    expect(byTestId(view, 'screen-time-ring-fill').length).toBeGreaterThan(0);
  });

  it('should report where the ring is, so the glance can open out of it', () => {
    const onOpenScreenTime = jest.fn();
    const { view } = renderScene({ screenTime: { usageSeconds: 600, limitSeconds: 3600 }, onOpenScreenTime });

    pressTestId(view, 'screen-time-ring');

    const { width, height } = Dimensions.get('window');
    expect(onOpenScreenTime).toHaveBeenCalledWith(ringCentre(width, height, 34));
  });
});

describe('HomeScene the plan offer', () => {
  it('should open the plans when tapped', () => {
    const onOpenPlans = jest.fn();
    const { view } = renderScene({ onOpenPlans });

    pressTestId(view, 'unlock-plan-button');

    expect(onOpenPlans).toHaveBeenCalledTimes(1);
  });

  it('should stay away entirely for a family who already subscribes', () => {
    const { view } = renderScene();

    expect(byTestId(view, 'unlock-plan-button').length).toBe(0);
  });
});

describe('HomeScene sky', () => {
  it('should set the welcome inside a living sky with the one face in it', () => {
    const { view } = renderScene();

    const viewCount = (testID: string) => byTestId(view, testID).filter((node) => node.type === View).length;

    expect(viewCount('home-hero-sky')).toBe(1);
    expect(byTestId(view, 'sky-face').length).toBeGreaterThan(0);
  });

  it('should start the welcome below the sun, not under it', () => {
    const { view } = renderScene();

    const sky = byTestId(view, 'home-hero-sky')[0];
    const content = view.UNSAFE_root.findAll((node: RenderedNode) => node.props.contentContainerStyle !== undefined)[0];
    const paddingTop = StyleSheet.flatten(content.props.contentContainerStyle as StyleProp<ViewStyle>).paddingTop as number;
    const sunSize = StyleSheet.flatten(byTestId(view, 'sky-face')[0].props.style).width;

    expect(paddingTop).toBe(heroContentTop(44, sunSize));
    expect(StyleSheet.flatten(sky.props.style).height).toBeGreaterThan(paddingTop);
  });
});

/**
 * A tablet has the width to spare that a phone does not, which is what a
 * landscape screen short on height needs: the achievement and
 * continue-learning cards pair up side by side instead of stacking, freeing
 * the vertical room the plan button and the screen-time ring were being cut
 * off by.
 */
describe('HomeScene on a tablet', () => {
  let originalWidth: number;
  let originalHeight: number;

  beforeEach(() => {
    originalWidth = document.documentElement.clientWidth;
    originalHeight = document.documentElement.clientHeight;
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1194, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 834, configurable: true });
    window.dispatchEvent(new Event('resize'));
  });

  afterEach(() => {
    Object.defineProperty(document.documentElement, 'clientWidth', { value: originalWidth, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: originalHeight, configurable: true });
    window.dispatchEvent(new Event('resize'));
  });

  it('pairs the achievement and continue-learning cards side by side, the same size', () => {
    const { view } = renderScene();

    const achievement = byTestId(view, 'achievement-card')[0];
    const learning = byTestId(view, 'continue-learning-card')[0];

    expect(achievement.props.width).toBe(learning.props.width);
    // Narrower than the full content column -- actually paired, not just
    // sitting beside each other at full width.
    expect(achievement.props.width).toBeLessThan(400);
    // Compact mode drops the standalone CTA row -- the whole tile is the
    // press target instead, which is how it fits at half the width.
    expect(byTestId(view, 'achievement-cta').length).toBe(0);
  });

  it('keeps every fact on the paired achievement card, laid out to fit', () => {
    const { view } = renderScene();

    const underTest = textContents(view);
    expect(underTest).toContain('home.milestone.eyebrow');
    expect(byTestId(view, 'milestone-stars').length).toBeGreaterThan(0);
  });

  it('still opens the achievements and the library when their paired tiles are tapped', () => {
    const { view, onOpenAchievements, onContinueLearning } = renderScene();

    pressTestId(view, 'achievement-card');
    pressTestId(view, 'continue-learning-card');

    expect(onOpenAchievements).toHaveBeenCalledTimes(1);
    expect(onContinueLearning).toHaveBeenCalledTimes(1);
  });

  it('still shows the streak and the week`s reading below the cards', () => {
    const { view } = renderScene();

    expect(byTestId(view, 'streak-chip').length).toBeGreaterThan(0);
    expect(byTestId(view, 'weekly-reading-chip').length).toBeGreaterThan(0);
  });

  it('keeps the ordinary welcome text size in landscape -- portrait is the one with height to spend', () => {
    const { view } = renderScene();

    const title = StyleSheet.flatten(byTestId(view, 'home-welcome-title')[0].props.style);
    expect(title.fontSize).toBe(HOME_CARD_TYPE.welcome);
  });
});

/**
 * A tablet in portrait has height the landscape layout doesn't: rather than
 * leave it as empty sky above the cards, the welcome grows into it and the
 * gap it would otherwise leave above the cards is closed instead.
 */
describe('HomeScene on a tablet in portrait', () => {
  let originalWidth: number;
  let originalHeight: number;

  beforeEach(() => {
    originalWidth = document.documentElement.clientWidth;
    originalHeight = document.documentElement.clientHeight;
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 834, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 1194, configurable: true });
    window.dispatchEvent(new Event('resize'));
  });

  afterEach(() => {
    Object.defineProperty(document.documentElement, 'clientWidth', { value: originalWidth, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: originalHeight, configurable: true });
    window.dispatchEvent(new Event('resize'));
  });

  it('grows the welcome title and subtitle past their ordinary size', () => {
    const { view } = renderScene();

    const title = StyleSheet.flatten(byTestId(view, 'home-welcome-title')[0].props.style);
    const subtitle = StyleSheet.flatten(byTestId(view, 'home-welcome-subtitle')[0].props.style);

    expect(title.fontSize).toBeGreaterThan(HOME_CARD_TYPE.welcome);
    expect(subtitle.fontSize).toBeGreaterThan(HOME_CARD_TYPE.welcomeSubtitle);
  });

  it('closes the gap the bigger subtitle would otherwise leave above the cards', () => {
    const { view } = renderScene();

    const subtitle = StyleSheet.flatten(byTestId(view, 'home-welcome-subtitle')[0].props.style);

    expect(subtitle.marginBottom).toBe(0);
  });

  it('grows the sun to match', () => {
    const { view } = renderScene();

    const sunSize = StyleSheet.flatten(byTestId(view, 'sky-face')[0].props.style).width as number;

    expect(sunSize).toBeGreaterThan(Math.round(834 * HERO_SKY.sunSizeRatio));
  });

  it('still pairs the achievement and continue-learning cards side by side', () => {
    const { view } = renderScene();

    const achievement = byTestId(view, 'achievement-card')[0];
    const learning = byTestId(view, 'continue-learning-card')[0];

    expect(achievement.props.width).toBe(learning.props.width);
    expect(byTestId(view, 'achievement-cta').length).toBe(0);
  });
});

/** The streak and the week's reading sit under the cards on a phone too --
 *  only the achievement/continue-learning pairing is tablet-only. */
describe('HomeScene stats row', () => {
  let originalWidth: number;
  let originalHeight: number;

  beforeEach(() => {
    originalWidth = document.documentElement.clientWidth;
    originalHeight = document.documentElement.clientHeight;
    // A phone's short side, well under the >= 768 tablet threshold.
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 402, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 874, configurable: true });
    window.dispatchEvent(new Event('resize'));
  });

  afterEach(() => {
    Object.defineProperty(document.documentElement, 'clientWidth', { value: originalWidth, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: originalHeight, configurable: true });
    window.dispatchEvent(new Event('resize'));
  });

  it('should show the streak beside how much was read this week', () => {
    const { view } = renderScene();

    expect(byTestId(view, 'streak-chip').length).toBeGreaterThan(0);
    expect(byTestId(view, 'weekly-reading-chip').length).toBeGreaterThan(0);
  });

  it('should not pair the cards on a phone-width screen', () => {
    const { view } = renderScene();

    const achievement = byTestId(view, 'achievement-card')[0];
    const { width } = Dimensions.get('window');

    // Full content column width, not half of it -- still stacked.
    expect(achievement.props.width).toBeGreaterThan(width / 2);
    // Not compact -- the standalone CTA row is still there.
    expect(byTestId(view, 'achievement-cta').length).toBeGreaterThan(0);
  });
});
