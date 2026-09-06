/**
 * Tests for the returning-user home as a whole.
 *
 * A personal welcome, the story to carry on with, how far the family has come,
 * what they achieved and what comes next -- every value from the data model,
 * every card a way somewhere.
 */

import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { render, fireEvent, type RenderResult } from '@testing-library/react-native';
import { HomeScene } from '@/components/home/home-scene';
import { HOME_THEMES } from '@/constants/home-scene';
import { ringCentre } from '@/constants/screen-time-ring';
import type { ChildHomeData, WelcomeCopy } from '@/types/child-home';

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
    onOpenJourney: jest.fn(),
    onOpenAchievements: jest.fn(),
    onFindStory: jest.fn(),
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
    it('should read continue, journey, achievements, then a way to find more', () => {
      const { view } = renderScene();

      const ids = ['continue-card', 'journey-card', 'achievement-card', 'find-story-pill'].map(
        (id) => byTestId(view, id).length > 0
      );

      expect(ids).toEqual([true, true, true, true]);
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

    it('should open the journey from the stats card', () => {
      const { view, onOpenJourney } = renderScene();

      pressTestId(view, 'journey-card');

      expect(onOpenJourney).toHaveBeenCalledTimes(1);
    });

    it('should open the achievements from the badge card', () => {
      const { view, onOpenAchievements } = renderScene();

      pressTestId(view, 'achievement-card');

      expect(onOpenAchievements).toHaveBeenCalledTimes(1);
    });

    it('should offer a way to find a new story', () => {
      const { view, onFindStory } = renderScene();

      pressTestId(view, 'find-story-pill');

      expect(onFindStory).toHaveBeenCalledTimes(1);
    });
  });

  describe('a family with nothing yet', () => {
    const EMPTY: ChildHomeData = { firstName: '', storiesCompleted: 0, readingMinutes: 0, readingStreakDays: 0 };

    it('should invite a first story rather than show an empty continue card', () => {
      const { view } = renderScene({ data: EMPTY });

      expect(byTestId(view, 'continue-panel-empty').length).toBeGreaterThan(0);
      expect(byTestId(view, 'continue-panel').length).toBe(0);
    });

    it('should still celebrate rather than show an empty badge card', () => {
      const { view } = renderScene({ data: EMPTY });

      expect(byTestId(view, 'achievement-all-done').length).toBeGreaterThan(0);
    });

    it('should never show a zero-day streak', () => {
      const { view } = renderScene({ data: EMPTY });

      expect(byTestId(view, 'journey-tile-streak-start').length).toBeGreaterThan(0);
      expect(byTestId(view, 'journey-tile-streak').length).toBe(0);
    });
  });

  describe('the grown-up corner', () => {
    it('should be present but subordinate', () => {
      const { view } = renderScene();

      expect(textContents(view)).toContain('home.grownUps');
    });

    it('should hand off rather than navigate itself, so the gate can run', () => {
      const { view, onOpenGrownUps, onFindStory } = renderScene();

      pressTestId(view, 'grown-ups-pill');

      expect(onOpenGrownUps).toHaveBeenCalledTimes(1);
      expect(onFindStory).not.toHaveBeenCalled();
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
