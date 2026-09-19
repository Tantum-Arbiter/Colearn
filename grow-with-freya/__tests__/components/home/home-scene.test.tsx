/**
 * Tests for the returning-user home as a whole.
 *
 * A personal welcome, the story to carry on with, how far the family has come,
 * what they achieved and what comes next -- every value from the data model,
 * every card a way somewhere.
 */

import React from 'react';
import { Dimensions, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { render, fireEvent, act, type RenderResult } from '@testing-library/react-native';
import { HomeScene, STATS_CHIP_INSET } from '@/components/home/home-scene';
import { AudioControlModal } from '@/components/ui/audio-control-modal';
import { LanguagePicker } from '@/components/ui/language-picker';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { CIRCLE_BUTTON_DIAMETER_PHONE, contentMargin, journeyHeaderTop } from '@/components/child-ui/tokens';
import { HOME_THEMES } from '@/constants/home-scene';
import { HOME_CARDS, HOME_CARD_TYPE } from '@/constants/home-journey';
import { HERO_SKY, heroContentTop } from '@/constants/home-sky';
import { navClearance, navItemCentre } from '@/components/child-ui/child-bottom-navigation';
import type { ChildHomeData, WelcomeCopy } from '@/types/child-home';

jest.mock('@/components/ui/audio-control-modal', () => ({
  AudioControlModal: function AudioControlModal() {
    return null;
  },
}));

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
    onSelectSection: jest.fn(),
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
    it('should read continue, then achievements, with the way onward in the bar at the foot rather than a third card', () => {
      const { view } = renderScene();

      const ids = ['continue-card', 'achievement-card'].map((id) => byTestId(view, id).length > 0);

      expect(ids).toEqual([true, true]);
      expect(byTestId(view, 'continue-learning-card')).toHaveLength(0);
      expect(byTestId(view, 'child-bottom-navigation').length).toBeGreaterThan(0);
      expect(byTestId(view, 'journey-card')).toHaveLength(0);
      expect(byTestId(view, 'find-story-pill')).toHaveLength(0);
    });

    it('should pin the bar to the foot of the screen, where the library has it, and keep the page clear of it', () => {
      const { view } = renderScene();

      const scroll = view.UNSAFE_root.findAll((n: any) => n.props?.contentContainerStyle !== undefined)[0];
      const wrapper = StyleSheet.flatten(byTestId(view, 'child-bottom-navigation-positioner')[0].props.style);
      const padding = StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom as number;

      expect(scroll.findAll((n: any) => n.props?.testID === 'child-bottom-navigation')).toHaveLength(0);
      expect(wrapper.position).toBe('absolute');
      expect(padding).toBeGreaterThanOrEqual(navClearance(34));
    });

    it('should send its bar to the shared slot for the main page, so one bar serves the whole journey', () => {
      const { view } = renderScene();

      const underTest = view.UNSAFE_root.findAll((n: any) => n.props?.slotKey !== undefined);

      expect(underTest.length).toBeGreaterThan(0);
      expect(underTest[0].props.slotKey).toBe('main');
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

    it.each(['home', 'progress', 'search', 'profile'])('should hand %s in the bar on to be opened, like a normal selection', (id) => {
      const { view, onSelectSection } = renderScene();

      pressTestId(view, `navigation-item-${id}`);

      expect(onSelectSection).toHaveBeenCalledWith(id);
    });

    it('should light nothing in the bar, since the main menu is none of its places', () => {
      const { view } = renderScene();

      const underTest = byTestId(view, 'navigation-item-home').find((n) => n.props.accessibilityState !== undefined);

      expect(underTest?.props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
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

  describe('the corner controls', () => {
    it('should leave the grown-ups control to the Profile page', () => {
      const { view } = renderScene();

      expect(byTestId(view, 'grown-ups-pill')).toHaveLength(0);
      expect(textContents(view)).not.toContain('home.grownUps');
    });

    it('should keep the speaker in its corner on the right', () => {
      const { view } = renderScene();

      const corner = byTestId(view, 'home-corner-controls').filter((node) => node.props.style)[0];
      const flat = StyleSheet.flatten(corner.props.style);

      expect(byTestId(view, 'home-sound-button').length).toBeGreaterThan(0);
      expect(flat.justifyContent).toBe('space-between');
    });

    describe('the language flag', () => {
      afterEach(() => {
        jest.restoreAllMocks();
      });

      function flagButton(view: RenderResult) {
        return byTestId(view, 'home-language-button').filter((node) => typeof node.props.onPress === 'function')[0];
      }

      it('sits in the top left, the speaker in the top right', () => {
        const { view } = renderScene();

        const corner = byTestId(view, 'home-corner-controls').filter((node) => node.props.style)[0];
        const ids = corner.findAll((node: any) => node.props.testID === 'home-language-button' || node.props.testID === 'home-sound-button')
          .map((node: any) => node.props.testID)
          .filter((id: string, index: number, all: string[]) => all.indexOf(id) === index);

        expect(ids).toEqual(['home-language-button', 'home-sound-button']);
      });

      it('shows the flag of the language in use', () => {
        jest.spyOn(require('react-i18next'), 'useTranslation').mockReturnValue({
          t: (key: string) => key,
          i18n: { language: 'de' },
        } as never);

        const { view } = renderScene();

        expect(flagButton(view).findAll((node: any) => node.props.children === '🇩🇪').length).toBeGreaterThan(0);
      });

      it('is named for what it does', () => {
        const { view } = renderScene();

        expect(flagButton(view).props.accessibilityLabel).toBe('account.language');
      });

      it('opens the language chooser, closed until then', () => {
        const { view } = renderScene();
        expect(view.UNSAFE_getByType(LanguagePicker).props.visible).toBe(false);

        act(() => {
          flagButton(view).props.onPress();
        });

        expect(view.UNSAFE_getByType(LanguagePicker).props.visible).toBe(true);
      });

      it('closes the chooser when it is done', () => {
        const { view } = renderScene();
        act(() => {
          flagButton(view).props.onPress();
        });

        act(() => {
          view.UNSAFE_getByType(LanguagePicker).props.onClose();
        });

        expect(view.UNSAFE_getByType(LanguagePicker).props.visible).toBe(false);
      });
    });

    it('should put the speaker where every journey page puts its own', () => {
      const { view } = renderScene();

      const corner = byTestId(view, 'home-corner-controls').filter((node) => node.props.style)[0];
      const flat = StyleSheet.flatten(corner.props.style);

      expect(flat.top).toBe(journeyHeaderTop(44, false));
      expect(flat.right).toBe(contentMargin(false));
      expect(flat.left).toBe(contentMargin(false));
      expect(flat.height).toBe(CIRCLE_BUTTON_DIAMETER_PHONE);
    });

    it('should draw the speaker as the journey pages\' own audio button', () => {
      const { view } = renderScene();

      const button = byTestId(view, 'home-sound-button').filter((node) => typeof node.props.style === 'function')[0];

      expect(button.props.accessibilityLabel).toBe('catalogue.sound');
      expect(StyleSheet.flatten(button.props.style({ pressed: false })).width).toBe(CIRCLE_BUTTON_DIAMETER_PHONE);
    });

    it('should mute on a tap', () => {
      const toggleMute = jest.fn();
      (useGlobalSound as jest.Mock).mockReturnValueOnce({ isMuted: false, toggleMute });
      const { view } = renderScene();

      pressTestId(view, 'home-sound-button');

      expect(toggleMute).toHaveBeenCalledTimes(1);
    });

    it('should open the volume controls on a long press', () => {
      const { view } = renderScene();

      const button = byTestId(view, 'home-sound-button').filter((node) => typeof node.props.onLongPress === 'function')[0];
      act(() => { button.props.onLongPress(); });

      expect(view.UNSAFE_getByType(AudioControlModal).props.visible).toBe(true);
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
  it('should show Screensafe as a plain shield when screen time is not being tracked', () => {
    const { view } = renderScene({ screenTime: null });

    expect(byTestId(view, 'nav-screen-time-ring').length).toBe(0);
    expect(byTestId(view, 'navigation-item-screensafe').length).toBeGreaterThan(0);
  });

  it('should carry the live ring in the bar while there is time left', () => {
    const { view } = renderScene({ screenTime: { usageSeconds: 600, limitSeconds: 3600 } });

    expect(byTestId(view, 'nav-screen-time-ring').length).toBeGreaterThan(0);
    expect(byTestId(view, 'screen-time-ring')).toHaveLength(0);
  });

  it('should report where the Screensafe item is, so the glance can open out of it', () => {
    const onOpenScreenTime = jest.fn();
    const { view, onSelectSection } = renderScene({ screenTime: { usageSeconds: 600, limitSeconds: 3600 }, onOpenScreenTime });

    pressTestId(view, 'navigation-item-screensafe');

    const { width, height } = Dimensions.get('window');
    expect(onOpenScreenTime).toHaveBeenCalledWith(navItemCentre('screensafe', width, height, 34, false));
    expect(onSelectSection).not.toHaveBeenCalled();
  });

  it('should draw the bar in while the glance is open, so the window opens out of the ring\'s place', () => {
    const { view } = renderScene({ screenTime: { usageSeconds: 600, limitSeconds: 3600 }, screenTimeHidden: true });

    expect(byTestId(view, 'child-bottom-navigation').length).toBeGreaterThan(0);
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

  it('gives the achievement card the whole column, with its own way in, now nothing sits beside it', () => {
    const { view } = renderScene();

    const achievement = byTestId(view, 'achievement-card')[0];

    expect(achievement.props.width).toBeGreaterThan(400);
    expect(byTestId(view, 'continue-learning-card')).toHaveLength(0);
    expect(byTestId(view, 'achievement-cta').length).toBeGreaterThan(0);
  });

  it('keeps every fact on the achievement card', () => {
    const { view } = renderScene();

    const underTest = textContents(view);
    expect(underTest).toContain('home.milestone.eyebrow');
    expect(byTestId(view, 'milestone-stars').length).toBeGreaterThan(0);
  });

  it('still opens the achievements when the card is tapped', () => {
    const { view, onOpenAchievements } = renderScene();

    pressTestId(view, 'achievement-card');

    expect(onOpenAchievements).toHaveBeenCalledTimes(1);
  });

  it('still shows the streak and the week`s reading below the cards', () => {
    const { view } = renderScene();

    expect(byTestId(view, 'streak-chip').length).toBeGreaterThan(0);
    expect(byTestId(view, 'weekly-reading-chip').length).toBeGreaterThan(0);
  });

  it('still keeps the greeting clear of the first card in landscape', () => {
    const { view } = renderScene();

    const subtitle = StyleSheet.flatten(byTestId(view, 'home-welcome-subtitle')[0].props.style);

    // The gap is a tablet thing, not a portrait thing -- at the phone's 8 the
    // subtitle sat on the first card's glow here too.
    expect(subtitle.marginBottom).toBeGreaterThanOrEqual(HOME_CARDS.gap);
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

  it('keeps the bigger subtitle clear of the first card rather than sitting on it', () => {
    const { view } = renderScene();

    const subtitle = StyleSheet.flatten(byTestId(view, 'home-welcome-subtitle')[0].props.style);

    // Bigger type has a taller line box, so it needs *more* room beneath it
    // than the phone's 8, not less -- at 0 it sat on the first card's glow.
    expect(subtitle.marginBottom).toBeGreaterThanOrEqual(HOME_CARDS.gap);
  });

  /**
   * The greeting should not hug the first card while the stats row sits well
   * clear of the plan button -- the block reads as top-heavy when it does.
   */
  it('stands the greeting as far above the cards as the stats sit below them', () => {
    const { view } = renderScene({ onOpenPlans: jest.fn() });

    const gapOf = (testID: string, key: 'marginTop' | 'marginBottom') =>
      (StyleSheet.flatten(byTestId(view, testID)[0].props.style) as Record<string, number>)[key] ?? 0;

    const subtitleToCard = gapOf('home-welcome-subtitle', 'marginBottom');
    const statsToButton = gapOf('home-stats-row', 'marginBottom') + gapOf('home-plan-slot', 'marginTop');

    // Matched by eye, not on paper: the stats chips pad themselves, so the
    // margin under them looks larger than it measures and the greeting's has
    // to add that back. See STATS_CHIP_INSET.
    expect(subtitleToCard).toBe(statsToButton + STATS_CHIP_INSET);
  });

  it('grows the sun to match', () => {
    const { view } = renderScene();

    const sunSize = StyleSheet.flatten(byTestId(view, 'sky-face')[0].props.style).width as number;

    expect(sunSize).toBeGreaterThan(Math.round(834 * HERO_SKY.sunSizeRatio));
  });

  it('gives the achievement card the whole column here too', () => {
    const { view } = renderScene();

    const achievement = byTestId(view, 'achievement-card')[0];

    expect(byTestId(view, 'continue-learning-card')).toHaveLength(0);
    expect(achievement.props.width).toBeGreaterThan(400);
    expect(byTestId(view, 'achievement-cta').length).toBeGreaterThan(0);
  });
});

/** The streak and the week's reading sit under the cards on a phone too. */
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
