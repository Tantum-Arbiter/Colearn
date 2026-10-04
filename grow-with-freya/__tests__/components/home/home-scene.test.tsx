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
import { withTiming } from 'react-native-reanimated';
import { HomeScene, STATS_CHIP_INSET, TABLET_FOOT_PADDING } from '@/components/home/home-scene';
import { AudioControlModal } from '@/components/ui/audio-control-modal';
import { LanguagePicker } from '@/components/ui/language-picker';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { CIRCLE_BUTTON_DIAMETER_PHONE, contentMargin, journeyHeaderTop } from '@/components/child-ui/tokens';
import { HOME_THEMES } from '@/constants/home-scene';
import { HOME_CARDS, HOME_CARD_TYPE } from '@/constants/home-journey';
import { HERO_SKY, heroContentLift, heroContentTop, heroSlackDrop } from '@/constants/home-sky';
import { navClearance, navItemCentre } from '@/components/child-ui/child-bottom-navigation';
import { STAT_ORB, statOrbDiameter, statOrbRowHeight, statOrbRowWidth } from '@/constants/stat-orbs';
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

function greetingProps(view: RenderResult): { titleSize: number; subtitleSize: number } {
  return view.UNSAFE_root.findAll(
    (node: RenderedNode) => node.props.titleSize !== undefined && node.props.subtitleSize !== undefined
  )[0].props as { titleSize: number; subtitleSize: number };
}

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function pillOf(view: RenderResult) {
  return view.UNSAFE_root.findAll(
    (node: RenderedNode) => typeof node.props.kind === 'string' && node.props.row !== undefined && typeof node.props.onFolded === 'function'
  )[0];
}

function openPill(view: RenderResult, kind: 'streak' | 'continue' | 'badges'): void {
  act(() => {
    statOrbsOf(view).props.onOpen(kind);
  });
}

function scrollerOf(view: RenderResult) {
  return view.UNSAFE_root.findAll((n: any) => n.props?.contentContainerStyle !== undefined)[0];
}

function paddingTopOf(view: RenderResult): number {
  return StyleSheet.flatten(scrollerOf(view).props.contentContainerStyle).paddingTop as number;
}

function skyTopInset(view: RenderResult): number {
  return view.UNSAFE_root.findAll((n: any) => n.props?.topInset !== undefined && n.props?.lift !== undefined)[0].props.topInset as number;
}

function measure(view: RenderResult, viewport: number, content: number): void {
  const scroller = scrollerOf(view);
  act(() => {
    scroller.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 402, height: viewport } } });
    scroller.props.onContentSizeChange(402, content);
  });
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
  bestStreakDays: 9,
  screenTimeSafety: 100,
  newestAchievement: { id: 'story-adventurer', title: 'Story Explorer', description: 'Read 10 stories', icon: 'book' },
  nextAchievement: { id: 'moon-explorer', title: 'Moon Explorer', current: 3, required: 5, unit: 'stories' },
};

const WITH_TALLY: ChildHomeData = { ...DATA, achievementTally: { unlocked: 2, remaining: 19 } };

function orbsShown(view: RenderResult): string[] {
  return view.UNSAFE_root
    .findAll(
      (node) =>
        ['text', 'button'].includes(node.props.accessibilityRole as string) &&
        /^stat-orb-[a-z]+$/.test(String(node.props.testID)) &&
        node.props.style !== undefined
    )
    .map((node) => node.props.testID as string)
    .filter((id, index, all) => all.indexOf(id) === index);
}

function statOrbsOf(view: RenderResult) {
  return view.UNSAFE_root.findAll(
    (node: RenderedNode) => node.props.streakDays !== undefined && node.props.contentWidth !== undefined
  )[0];
}

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
    onSelectSection: jest.fn(),
  };

  const view = render(<HomeScene data={DATA} welcome={WELCOME} timeOfDay="night" {...handlers} {...props} />);

  return { view, ...handlers, ...view };
}

describe('HomeScene', () => {
  describe('the welcome', () => {
    it('should greet the child by the message the data model chose', () => {
      const { view } = renderScene();

      const underTest = byTestId(view, 'home-welcome')[0].props.accessibilityLabel as string;

      expect(underTest.startsWith('home.welcome.normal.title (name:Freya')).toBe(true);
      expect(underTest).toContain('home.welcome.normal.subtitle');
    });

    it('should show whichever welcome state it is handed', () => {
      const { view } = renderScene({
        welcome: { ...WELCOME, state: 'longAbsence', titleKey: 'home.welcome.longAbsence.title', subtitleKey: 'home.welcome.longAbsence.subtitle' },
      });

      const underTest = byTestId(view, 'home-welcome')[0].props.accessibilityLabel as string;

      expect(underTest.startsWith('home.welcome.longAbsence.title')).toBe(true);
    });
  });

  describe('the sequence', () => {
    /**
     * Three panels, not four and a link: the story to carry on with, the badge
     * being worked towards, and the way into the library. The stats card that
     * sat second was a parent's reading of the week in the middle of a child's
     * screen, and the way onward was a text pill under everything.
     */
    it('should lead with the learning journey, the story to carry on with in the middle stat orb rather than a card', () => {
      const { view } = renderScene();

      const scroll = view.UNSAFE_root.findAll((n: any) => n.props?.contentContainerStyle !== undefined)[0];

      expect(byTestId(view, 'continue-card')).toHaveLength(0);
      expect(byTestId(view, 'continue-tab')).toHaveLength(0);
      expect(byTestId(view, 'continue-orb')).toHaveLength(0);
      expect(byTestId(view, 'achievement-card').length).toBeGreaterThan(0);
      expect(scroll.findAll((n: any) => n.props?.testID === 'stat-orb-continue').length).toBeGreaterThan(0);
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

    it('should keep every pill folded until an orb is tapped', () => {
      const { view } = renderScene({ data: WITH_TALLY });

      expect(pillOf(view)).toBeUndefined();
      expect(statOrbsOf(view).props.covered).toBe(false);
    });

    it.each(['streak', 'continue', 'badges'] as const)('should open the %s pill out of its orb, over the row', (kind) => {
      const { view } = renderScene({ data: WITH_TALLY });

      openPill(view, kind);

      expect(pillOf(view).props).toEqual(
        expect.objectContaining({
          kind,
          open: true,
          row: { x: expect.any(Number), y: expect.any(Number), width: expect.any(Number) },
          diameter: statOrbDiameter(statOrbsOf(view).props.contentWidth),
          width: statOrbsOf(view).props.contentWidth,
        })
      );
      expect(statOrbsOf(view).props).toEqual(expect.objectContaining({ covered: true, coverKind: kind }));
    });

    describe('while the pill is still folding', () => {
      beforeEach(() => {
        (withTiming as jest.Mock).mockImplementation((value) => value);
      });

      afterEach(() => {
        (withTiming as jest.Mock).mockImplementation((value, _config, callback) => {
          if (typeof callback === 'function') callback(true);
          return value;
        });
      });

      it('should fold the pill when asked, and give the row back once it has folded away', () => {
        const { view } = renderScene();

        openPill(view, 'streak');
        act(() => {
          pillOf(view).props.onClose();
        });

        expect(pillOf(view).props.open).toBe(false);
        expect(statOrbsOf(view).props.covered).toBe(true);

        act(() => {
          pillOf(view).props.onFolded();
        });

        expect(statOrbsOf(view).props.covered).toBe(false);
      });

      it('should leave the tapped orb in the row until the pill has drawn its own, and take it back on folding', () => {
        const { view } = renderScene();

        openPill(view, 'badges');
        const before = statOrbsOf(view).props.carried;
        act(() => {
          pillOf(view).props.onDrawn();
        });
        const drawn = statOrbsOf(view).props.carried;
        act(() => {
          pillOf(view).props.onClose();
        });
        act(() => {
          pillOf(view).props.onFolded();
        });

        expect(before).toBe(false);
        expect(drawn).toBe(true);
        expect(statOrbsOf(view).props.carried).toBe(false);
      });
    });

    it('should hand the pill the streak and its best, the story and the badges with the next to earn', () => {
      const { view } = renderScene({ data: WITH_TALLY });

      openPill(view, 'streak');

      expect(pillOf(view).props).toEqual(
        expect.objectContaining({
          streakDays: 4,
          bestStreakDays: 9,
          story: DATA.currentStory,
          tally: WITH_TALLY.achievementTally,
          next: DATA.nextAchievement,
        })
      );
    });

    it('should lay the pill and its backdrop over the sun and the corner controls, so a tap off it only folds it', () => {
      const { view } = renderScene();

      const host = StyleSheet.flatten(byTestId(view, 'stat-pill-host')[0].props.style);
      const sun = StyleSheet.flatten(byTestId(view, 'hero-sun-zoom')[0].props.style);
      const chrome = StyleSheet.flatten(byTestId(view, 'home-corner-controls').find((n) => n.props.style !== undefined)!.props.style);

      expect(host.zIndex).toBeGreaterThan(sun.zIndex as number);
      expect(host.zIndex).toBeGreaterThan(chrome.zIndex as number);
    });

    it('should hand the row over to be measured, so the pill opens where the orbs are', () => {
      const { view } = renderScene();

      expect(statOrbsOf(view).props.rowRef).toEqual(expect.objectContaining({ current: null }));
    });

    it('should fold the pill when the screen-time glance takes the screen', () => {
      const { view, rerender, onContinue, onOpenJourney, onSelectSection } = renderScene();

      openPill(view, 'continue');
      rerender(
        <HomeScene
          data={DATA}
          welcome={WELCOME}
          timeOfDay="night"
          onContinue={onContinue}
          onOpenJourney={onOpenJourney}
          onSelectSection={onSelectSection}
          screenTimeHidden
        />
      );

      expect(pillOf(view).props.open).toBe(false);
    });

    it('should send its bar to the shared slot for the main page, so one bar serves the whole journey', () => {
      const { view } = renderScene();

      const underTest = view.UNSAFE_root.findAll((n: any) => n.props?.slotKey !== undefined);

      expect(underTest.length).toBeGreaterThan(0);
      expect(underTest[0].props.slotKey).toBe('main');
    });

    /** The one number kept from the stats card, as encouragement above them. */
    it('should show the streak in its orb under the card', () => {
      const { view } = renderScene();

      expect(orbsShown(view)).toContain('stat-orb-streak');
      expect(textContents(view)).toEqual(expect.arrayContaining(['4', 'home.streak.unit (count:4)']));
    });

    it('should name the story to carry on with and where the family is in it, once its orb is opened', () => {
      const { view } = renderScene();

      openPill(view, 'continue');

      const underTest = textContents(view);

      expect(underTest).toContain('The Moonlight Garden');
      expect(underTest).toContain('home.statPill.pages (page:8, total:14)');
    });

    it('should show the next badge to reach', () => {
      const { view } = renderScene();

      const underTest = textContents(view);

      expect(underTest).toContain('Moon Explorer');
    });
  });

  describe('the ways in', () => {
    it('should carry on the story from the pill the middle orb opens', () => {
      const { view, onContinue, onSelectSection } = renderScene();

      pressTestId(view, 'stat-orb-continue');
      const onFirstTap = onContinue.mock.calls.length;
      pressTestId(view, 'stat-pill');

      expect(onFirstTap).toBe(0);
      expect(onContinue).toHaveBeenCalledTimes(1);
      expect(onSelectSection).not.toHaveBeenCalled();
    });

    it("should open the story's own card from the cover in its pill, and leave the pill open under it", () => {
      const onOpenStoryCard = jest.fn();
      const { view, onContinue } = renderScene({ onOpenStoryCard });
      const from = { x: 20, y: 560, width: 77, height: 77 };

      openPill(view, 'continue');
      act(() => {
        pillOf(view).props.onOpenBook(from);
      });

      expect(onOpenStoryCard).toHaveBeenCalledWith('moonlight', from);
      expect(onContinue).not.toHaveBeenCalled();
      expect(pillOf(view).props.open).toBe(true);
    });

    it("should bring up the story's card, with its pages, from a tap anywhere on the story pill", () => {
      const onOpenStoryCard = jest.fn();
      const { view, onContinue } = renderScene({ onOpenStoryCard });

      pressTestId(view, 'stat-orb-continue');
      pressTestId(view, 'stat-pill');

      expect(onOpenStoryCard).toHaveBeenCalledWith('moonlight', expect.objectContaining({ width: expect.any(Number) }));
      expect(onContinue).not.toHaveBeenCalled();
      expect(pillOf(view).props.open).toBe(true);
    });

    it('should open the badge being tracked next from the badges pill', () => {
      const onOpenBadge = jest.fn();
      const { view, onContinue, onSelectSection } = renderScene({ data: WITH_TALLY, onOpenBadge });

      pressTestId(view, 'stat-orb-badges');
      pressTestId(view, 'stat-pill');

      expect(onOpenBadge).toHaveBeenCalledWith('moon-explorer');
      expect(onSelectSection).not.toHaveBeenCalled();
      expect(onContinue).not.toHaveBeenCalled();
    });

    it('should open Progress from the badges pill when every badge is already earned', () => {
      const onOpenBadge = jest.fn();
      const { view, onSelectSection } = renderScene({ data: { ...WITH_TALLY, nextAchievement: undefined }, onOpenBadge });

      pressTestId(view, 'stat-orb-badges');
      pressTestId(view, 'stat-pill');

      expect(onSelectSection).toHaveBeenCalledWith('progress');
      expect(onOpenBadge).not.toHaveBeenCalled();
    });

    it('should only fold the streak pill, going nowhere', () => {
      const onOpenBadge = jest.fn();
      const { view, onContinue, onSelectSection } = renderScene({ onOpenBadge });

      pressTestId(view, 'stat-orb-streak');
      pressTestId(view, 'stat-pill');

      expect(pillOf(view).props.open).toBe(false);
      expect(onSelectSection).not.toHaveBeenCalled();
      expect(onContinue).not.toHaveBeenCalled();
      expect(onOpenBadge).not.toHaveBeenCalled();
    });

    it('should fold the pill as it goes, so the page is as it was on the way back', () => {
      const { view } = renderScene();

      pressTestId(view, 'stat-orb-continue');
      pressTestId(view, 'stat-pill');

      expect(pillOf(view).props.open).toBe(false);
    });

    it('should set off on the learning journey from its card', () => {
      const { view, onOpenJourney } = renderScene();

      pressTestId(view, 'achievement-card');

      expect(onOpenJourney).toHaveBeenCalledTimes(1);
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
      bestStreakDays: 0,
    };

    it('should send a family with nothing to carry on with to the library from the bookmark', () => {
      const { view, onSelectSection } = renderScene({ data: EMPTY });

      pressTestId(view, 'stat-orb-continue');

      expect(onSelectSection).toHaveBeenCalledWith('home');
      expect(pillOf(view)).toBeUndefined();
    });

    it('should have no story to open when there is nothing to carry on with', () => {
      const { view } = renderScene({ data: EMPTY });

      expect(pillOf(view)).toBeUndefined();
      expect(statOrbsOf(view).props.story).toBeUndefined();
      expect(byTestId(view, 'continue-panel-empty')).toHaveLength(0);
    });

    it('should still celebrate rather than show an empty badge card', () => {
      const { view } = renderScene({ data: EMPTY });

      expect(byTestId(view, 'achievement-all-done').length).toBeGreaterThan(0);
    });
  });

  describe('the corner controls', () => {
    it('should leave the grown-ups control to the Profile page', () => {
      const { view } = renderScene();

      expect(textContents(view)).not.toContain('home.grownUps');
      expect(byTestId(view, 'circle-action-settings')).toHaveLength(0);
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

        const flag = flagButton(view).findAll((node: any) => node.props.testID === 'circle-action-flag');
        expect(flag.length).toBeGreaterThan(0);
        expect(flagButton(view).findAll((node: any) => node.props.children === '🇩🇪')).toHaveLength(0);
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

      expect(underTest?.props.fill).toBe(theme.title);
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
/**
 * The page's foot lost the Continue card to the orb over the bar, which left a
 * band of empty sky under the plan button on a phone. The sun and everything
 * under it come down into that room together, so nothing parts company.
 */
describe('HomeScene making use of the room at the foot', () => {
  it('should bring the sun and the page down by the room left at the foot of a phone', () => {
    const { view } = renderScene();
    const top = paddingTopOf(view);
    const sky = skyTopInset(view);

    measure(view, 874, 830);

    expect(paddingTopOf(view)).toBe(top + heroSlackDrop(874, 830));
    expect(skyTopInset(view)).toBe(sky + heroSlackDrop(874, 830));
  });

  it('should stay put once it has come down, rather than measure its own move as more room', () => {
    const { view } = renderScene();
    const top = paddingTopOf(view);

    measure(view, 874, 850);
    measure(view, 874, 874);

    expect(paddingTopOf(view)).toBe(top + 24);
  });

  it('should not move a page that already fills the phone', () => {
    const { view } = renderScene();
    const top = paddingTopOf(view);

    measure(view, 874, 900);

    expect(paddingTopOf(view)).toBe(top);
  });

  it('should keep where it came to while the tour makes extra room to scroll a step into view', () => {
    const binding = { scrollRef: { current: null }, onScroll: jest.fn(), onLayout: jest.fn(), onContentSizeChange: jest.fn(), reserve: 0 };
    const { view } = renderScene({ scrollBinding: binding });
    const top = paddingTopOf(view);
    measure(view, 874, 850);

    view.rerender(
      <HomeScene data={DATA} welcome={WELCOME} timeOfDay="night" onContinue={jest.fn()} onOpenJourney={jest.fn()} onSelectSection={jest.fn()} scrollBinding={{ ...binding, reserve: 200 }} />
    );
    measure(view, 874, 1074);

    expect(paddingTopOf(view)).toBe(top + 24);
  });

  it('should still hand the tour its layout and content size', () => {
    const binding = { scrollRef: { current: null }, onScroll: jest.fn(), onLayout: jest.fn(), onContentSizeChange: jest.fn(), reserve: 0 };
    const { view } = renderScene({ scrollBinding: binding });

    measure(view, 874, 830);

    expect(binding.onLayout).toHaveBeenCalled();
    expect(binding.onContentSizeChange).toHaveBeenCalledWith(402, 830);
  });
});

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

  it('stands the badge orb beside the streak and the story to carry on with, all in the one row', () => {
    const { view } = renderScene({ data: WITH_TALLY });

    expect(orbsShown(view)).toEqual(['stat-orb-streak', 'stat-orb-continue', 'stat-orb-badges']);
  });

  it('leaves a tablet centred as it is, with no room-at-the-foot drop', () => {
    const { view } = renderScene();
    const top = paddingTopOf(view);
    const sky = skyTopInset(view);

    measure(view, 834, 600);

    expect(paddingTopOf(view)).toBe(top);
    expect(skyTopInset(view)).toBe(sky);
  });

  it.each([
    [WITH_TALLY, 3],
    [DATA, 2],
  ])('opens a pill over the row as the row draws it, if the row cannot be measured (%#)', (data, count) => {
    const { view } = renderScene({ data });
    const diameter = statOrbDiameter(statOrbsOf(view).props.contentWidth);
    const rowWidth = statOrbRowWidth(diameter, count);

    openPill(view, 'streak');

    expect(pillOf(view).props.row).toEqual({
      x: (1194 - rowWidth) / 2,
      y: (834 - statOrbRowHeight(diameter)) / 2,
      width: rowWidth,
    });
    expect(pillOf(view).props.diameter).toBeGreaterThan(STAT_ORB.smallest);
  });

  it('opens a pill as wide as the cards', () => {
    const { view } = renderScene();

    openPill(view, 'streak');

    expect(pillOf(view).props.width).toBe(statOrbsOf(view).props.contentWidth);
  });

  it('gives the achievement card the whole column, with its own way in, now nothing sits beside it', () => {
    const { view } = renderScene();

    const achievement = byTestId(view, 'achievement-card')[0];

    expect(achievement.props.width).toBeGreaterThan(400);
    expect(byTestId(view, 'continue-learning-card')).toHaveLength(0);
    expect(byTestId(view, 'achievement-cta').length).toBeGreaterThan(0);
  });

  it('keeps every fact on the achievement card, with the journey`s steps it is handed', () => {
    const journeySteps = [
      { id: 'day-1', day: 1, of: 7, kind: 'story', state: 'open', domainKey: 'plan.domains.language', skill: 'listening' },
      { id: 'day-2', day: 2, of: 7, kind: 'words', state: 'locked', domainKey: 'plan.domains.language', skill: 'listening' },
    ] as const;
    const { view } = renderScene({ journeySteps });

    const underTest = textContents(view);
    expect(underTest).toContain('home.milestone.eyebrow');
    expect(byTestId(view, 'journey-step-1').length).toBeGreaterThan(0);
    expect(byTestId(view, 'journey-step-2').length).toBeGreaterThan(0);
    expect(byTestId(view, 'journey-step-3')).toHaveLength(0);
  });

  it('still sets off on the learning journey when the card is tapped', () => {
    const { view, onOpenJourney } = renderScene();

    pressTestId(view, 'achievement-card');

    expect(onOpenJourney).toHaveBeenCalledTimes(1);
  });

  it('still shows the streak and the story to carry on with below the cards', () => {
    const { view } = renderScene();

    expect(orbsShown(view)).toEqual(['stat-orb-streak', 'stat-orb-continue']);
  });

  it('still keeps the greeting clear of the first card in landscape', () => {
    const { view } = renderScene();

    const greeting = StyleSheet.flatten(byTestId(view, 'home-welcome-block')[0].props.style);

    // The gap is a tablet thing, not a portrait thing -- at the phone's 8 the
    // subtitle sat on the first card's glow here too.
    expect(greeting.marginBottom).toBeGreaterThanOrEqual(HOME_CARDS.gap);
  });

  it('keeps the ordinary welcome text size in landscape -- portrait is the one with height to spend', () => {
    const { view } = renderScene();

    const greeting = greetingProps(view);
    expect(greeting.titleSize).toBe(HOME_CARD_TYPE.welcome);
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

  it('stands the badge orb beside the streak and the story to carry on with, all in the one row', () => {
    const { view } = renderScene({ data: WITH_TALLY });

    expect(orbsShown(view)).toEqual(['stat-orb-streak', 'stat-orb-continue', 'stat-orb-badges']);
  });

  it('grows the welcome title and subtitle past their ordinary size', () => {
    const { view } = renderScene();

    const greeting = greetingProps(view);

    expect(greeting.titleSize).toBeGreaterThan(HOME_CARD_TYPE.welcome);
    expect(greeting.subtitleSize).toBeGreaterThan(HOME_CARD_TYPE.welcomeSubtitle);
  });

  it('keeps the bigger subtitle clear of the first card rather than sitting on it', () => {
    const { view } = renderScene();

    const greeting = StyleSheet.flatten(byTestId(view, 'home-welcome-block')[0].props.style);

    // Bigger type has a taller line box, so it needs *more* room beneath it
    // than the phone's 8, not less -- at 0 it sat on the first card's glow.
    expect(greeting.marginBottom).toBeGreaterThanOrEqual(HOME_CARDS.gap);
  });

  /**
   * The greeting should not hug the first card while the stats row sits well
   * clear of the plan button -- the block reads as top-heavy when it does.
   */
  it('stands the greeting as far above the cards as the stats sit below them', () => {
    const { view } = renderScene({ onOpenPlans: jest.fn() });

    const gapOf = (testID: string, key: 'marginTop' | 'marginBottom') =>
      (StyleSheet.flatten(byTestId(view, testID)[0].props.style) as Record<string, number>)[key] ?? 0;

    const subtitleToCard = gapOf('home-welcome-block', 'marginBottom');
    const statsToButton = gapOf('home-stats-row', 'marginBottom') + gapOf('home-plan-slot', 'marginTop');

    // Matched by eye, not on paper: the stats chips pad themselves, so the
    // margin under them looks larger than it measures and the greeting's has
    // to add that back. See STATS_CHIP_INSET.
    expect(subtitleToCard).toBe(statsToButton + STATS_CHIP_INSET);
  });

  // the block from the greeting to the trial button is centred between the sun
  // and the bar, so taking the lift off the top alone would move it only half
  // as far: it comes off the top and goes on the bottom (operator 2026-09-22)
  it('lifts the greeting-to-trial block by the whole lift, taken from above it and given below', () => {
    const { view } = renderScene({ onOpenPlans: jest.fn() });

    const scroll = view.UNSAFE_root.findAll((n: any) => n.props?.contentContainerStyle !== undefined)[0];
    const style = StyleSheet.flatten(scroll.props.contentContainerStyle);
    const lift = heroContentLift(834, 1194);

    expect(lift).toBeGreaterThan(0);
    expect(style.paddingBottom).toBe(TABLET_FOOT_PADDING + lift);
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

  it('should show the streak beside the story to carry on with', () => {
    const { view } = renderScene();

    expect(orbsShown(view)).toEqual(['stat-orb-streak', 'stat-orb-continue']);
  });

  it('should stand all three orbs in one row on a phone too, with nothing between or beneath them', () => {
    const { view } = renderScene({ data: WITH_TALLY });

    expect(orbsShown(view)).toEqual(['stat-orb-streak', 'stat-orb-continue', 'stat-orb-badges']);
    expect(byTestId(view, 'home-stats-divider')).toHaveLength(0);
    expect(byTestId(view, 'home-stats-second-line')).toHaveLength(0);
  });

  it('should hand the orbs the numbers from the data model', () => {
    const { view } = renderScene({ data: WITH_TALLY });

    expect(statOrbsOf(view).props).toEqual(
      expect.objectContaining({ streakDays: 4, story: DATA.currentStory, tally: { unlocked: 2, remaining: 19 } })
    );
  });

  it('should size the orbs from the width the cards have, and move them only when the cards do', () => {
    const { view } = renderScene();

    const card = view.UNSAFE_root.findAll((node: RenderedNode) => node.props.celebrate !== undefined && node.props.animated !== undefined)[0];

    expect(statOrbsOf(view).props.contentWidth).toBe(card.props.width);
    expect(statOrbsOf(view).props.animated).toBe(card.props.animated);
  });

  it('should leave the old chips out', () => {
    const { view } = renderScene({ data: WITH_TALLY });

    expect(byTestId(view, 'streak-chip')).toHaveLength(0);
    expect(byTestId(view, 'weekly-reading-chip')).toHaveLength(0);
    expect(byTestId(view, 'achievement-tally-chip')).toHaveLength(0);
  });

  it('should keep the gap beneath the orbs the same with two orbs or three', () => {
    const one = renderScene({ onOpenPlans: jest.fn() });
    const two = renderScene({ data: WITH_TALLY, onOpenPlans: jest.fn() });

    const gapUnder = (view: RenderResult) =>
      (StyleSheet.flatten(byTestId(view, 'home-stats-row')[0].props.style) as { marginBottom?: number }).marginBottom;

    expect(gapUnder(two.view)).toBe(gapUnder(one.view));
    expect(gapUnder(one.view)).toBeGreaterThan(0);
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

/**
 * Setting off for the island, every part of the page leaves in its turn and
 * the sky dives at the earth. The parts are handed to the voyage by name, so
 * a part added later and not handed over would simply sit there as the rest
 * left.
 */
describe('HomeScene setting off for the island', () => {
  function rows(view: RenderResult): string[] {
    return view.UNSAFE_root
      .findAll((node) => typeof node.props.row === 'string' && node.parent?.props.row !== node.props.row)
      .map((node) => node.props.row as string);
  }

  it('hands over every part of the page, in the order they leave', () => {
    const { view } = renderScene({ onOpenPlans: jest.fn() });

    expect(rows(view)).toEqual(['chrome', 'greeting', 'journey', 'stats', 'plan']);
  });

  it('hands over no plan row when no plan is on offer', () => {
    const { view } = renderScene();

    expect(rows(view)).toEqual(['chrome', 'greeting', 'journey', 'stats']);
  });

  it.each([
    ['chrome', 'home-corner-controls'],
    ['greeting', 'home-welcome-block'],
    ['journey', 'achievement-card'],
    ['stats', 'home-stats-row'],
    ['plan', 'home-plan-slot'],
  ])('carries the %s row away with what it holds (%s)', (row, holds) => {
    const { view } = renderScene({ onOpenPlans: jest.fn() });

    const carried = view.UNSAFE_root.findAll((node) => node.props.row === row)[0];

    expect(carried.findAll((node) => node.props.testID === holds).length).toBeGreaterThan(0);
  });

  it('dives the night sky and the earth together, taking no touches', () => {
    const { view } = renderScene();

    const zoom = byTestId(view, 'home-sky-zoom')[0];

    expect(zoom.props.pointerEvents).toBe('none');
    expect(zoom.findAll((node) => node.props.testID === 'night-sky').length).toBeGreaterThan(0);
    expect(zoom.findAll((node) => node.props.testID === 'home-horizon').length).toBeGreaterThan(0);
    expect(zoom.findAll((node) => node.props.testID === 'continue-card')).toHaveLength(0);
  });

  it('dives the sun with them, and leaves it where a finger can still reach it', () => {
    const { view } = renderScene();

    const sunLayer = byTestId(view, 'hero-sun-zoom')[0];

    expect(sunLayer.props.pointerEvents).toBe('box-none');
    expect(StyleSheet.flatten(sunLayer.props.style).zIndex).toBeGreaterThanOrEqual(10);
    expect(sunLayer.findAll((node) => node.props.testID === 'sky-face').length).toBeGreaterThan(0);
  });
});

/**
 * A tour step whose target the page never hands over is dropped in silence by
 * `guideSteps` -- no warning, the step simply never appears. So the refs the
 * home tour asks for are worth pinning here rather than finding out on device.
 */
describe('HomeScene guide targets', () => {
  function targetFor(slot: 'language' | 'sound') {
    const ref = React.createRef<View>();
    const view = renderScene({ guideTargets: { [slot]: ref } });

    return view;
  }

  it('hands the tour a ref for the language flag', () => {
    const view = targetFor('language');
    const flag = view.UNSAFE_queryAllByProps({ testID: 'home-language-button' });

    expect(flag.length).toBeGreaterThan(0);
  });

  it('hands the tour the middle stat orb for its stories step, in a host that can be measured', () => {
    const stories = React.createRef<View>();
    const view = renderScene({ guideTargets: { stories } });

    const wrappers = view.UNSAFE_root.findAll(
      (node: any) =>
        node.props.collapsable === false
        && node.findAll((child: any) => child.props.testID === 'stat-orb-continue').length > 0
        && node.findAll((child: any) => child.props.testID === 'achievement-card').length === 0
    );

    expect(statOrbsOf(view).props.storyRef).toBe(stories);
    expect(wrappers.length).toBeGreaterThan(0);
  });

  it('hands the tour the streak and badge orbs for their steps', () => {
    const streak = React.createRef<View>();
    const badges = React.createRef<View>();
    const view = renderScene({ data: WITH_TALLY, guideTargets: { streak, badges } });

    expect(statOrbsOf(view).props.streakRef).toBe(streak);
    expect(statOrbsOf(view).props.badgesRef).toBe(badges);
  });

  it('wraps the flag in a collapsable-false host, so the ref can be measured', () => {
    const view = renderScene({ guideTargets: { language: React.createRef<View>() } });

    // Android flattens a plain wrapper away, taking the measurable node with
    // it. Asserted by containment rather than by the ref, which React strips
    // out of props -- matching on it would pass no matter what.
    const wrappers = view.UNSAFE_root.findAll(
      (node: any) =>
        node.props.collapsable === false
        && node.findAll((child: any) => child.props.testID === 'home-language-button').length > 0
    );

    expect(wrappers.length).toBeGreaterThan(0);
  });
});
