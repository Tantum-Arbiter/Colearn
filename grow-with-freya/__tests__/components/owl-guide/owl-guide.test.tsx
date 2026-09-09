import React, { useEffect, useState, type RefObject } from 'react';
import type { View } from 'react-native';
import { render, act } from '@testing-library/react-native';

import { withTiming } from 'react-native-reanimated';

import { OwlGuide, PERCH_STEP_BACK } from '@/components/owl-guide/owl-guide';
import { GUIDE_STEPS, GUIDE_TIMING } from '@/constants/owl-guide';
import { OWL_RHYTHM } from '@/constants/owl-companion';
import type { GuideId } from '@/constants/owl-guide';

function setWindow(width: number, height: number) {
  Object.defineProperty(document.documentElement, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(document.documentElement, 'clientHeight', { value: height, configurable: true });
  window.dispatchEvent(new Event('resize'));
}

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}));

const mockListeners = new Set<() => void>();
const notify = () => mockListeners.forEach((listener) => listener());

const mockGuide = {
  isLoaded: true,
  activeGuide: null as GuideId | null,
  stepIndex: 0,
  completed: [] as GuideId[],
};

const mockApi = {
  startGuide: jest.fn((id: GuideId) => {
    mockGuide.activeGuide = id;
    mockGuide.stepIndex = 0;
    notify();
  }),
  nextStep: jest.fn(() => {
    mockGuide.stepIndex += 1;
    notify();
  }),
  skipGuide: jest.fn(() => {
    if (mockGuide.activeGuide) mockGuide.completed.push(mockGuide.activeGuide);
    mockGuide.activeGuide = null;
    notify();
  }),
  completeGuide: jest.fn(() => {
    if (mockGuide.activeGuide) mockGuide.completed.push(mockGuide.activeGuide);
    mockGuide.activeGuide = null;
    notify();
  }),
  dismissGuide: jest.fn(() => {
    mockGuide.activeGuide = null;
    notify();
  }),
  resetGuides: jest.fn(),
};

jest.mock('@/contexts/owl-guide-context', () => ({
  useOwlGuide: () => ({
    isLoaded: mockGuide.isLoaded,
    activeGuide: mockGuide.activeGuide,
    stepIndex: mockGuide.stepIndex,
    completedGuides: mockGuide.completed,
    lastResetTimestamp: 0,
    shouldShowGuide: (id: GuideId) => !mockGuide.completed.includes(id),
    ...mockApi,
  }),
}));

function Harness(props: React.ComponentProps<typeof OwlGuide>) {
  const [, bump] = useState(0);
  useEffect(() => {
    const listener = () => bump((n) => n + 1);
    mockListeners.add(listener);
    return () => {
      mockListeners.delete(listener);
    };
  }, []);
  return <OwlGuide {...props} />;
}

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

function has(tree: ReturnType<typeof render>, testID: string) {
  return findByTestId(tree, testID).length > 0;
}

/** Where the spotlight ring is drawn, flattened out of its style array. */
function ringFrame(tree: ReturnType<typeof render>) {
  const ring = findByTestId(tree, 'owl-guide-ring')[0];
  if (!ring) return null;
  const flat = [ring.props.style].flat(3).reduce((all: object, one: object) => ({ ...all, ...one }), {});
  const { left, top, width, height } = flat as Record<string, number>;
  return { left, top, width, height };
}

/** Every value anything has been asked to animate to. */
function fadedTo() {
  return (withTiming as unknown as jest.Mock).mock.calls.map((call) => call[0]);
}

function owl(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll(
    (node: any) => typeof node.props.phase === 'string' && typeof node.props.width === 'number'
  )[0];
}

function press(tree: ReturnType<typeof render>, testID: string) {
  act(() => {
    findByTestId(tree, testID)[0].props.onPress();
  });
}

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

async function settleMeasurements() {
  await act(async () => {
    jest.advanceTimersByTime(GUIDE_TIMING.measureSettleMs);
  });
}

/**
 * Long enough for a step to be measured, the page moved for it, measured again
 * in the view it came to rest in, and the words to follow the spotlight.
 */
async function settleEverything() {
  for (let pass = 0; pass < 3; pass += 1) {
    await act(async () => {
      jest.advanceTimersByTime(GUIDE_TIMING.scrollSettleMs + GUIDE_TIMING.highlightLeadMs);
    });
  }
}

/** Next, then the beat the spotlight is given before the words follow it. */
async function step(tree: ReturnType<typeof render>) {
  press(tree, 'owl-guide-next');
  await settleMeasurements();
  advance(GUIDE_TIMING.highlightLeadMs);
}

function json(tree: ReturnType<typeof render>) {
  return JSON.stringify(tree.toJSON());
}

function ref(x: number, y: number, width = 80, height = 40): RefObject<View | null> {
  return { current: { measureInWindow: (cb: (...args: number[]) => void) => cb(x, y, width, height) } as unknown as View };
}

function renderGuide(props: Partial<React.ComponentProps<typeof OwlGuide>> = {}) {
  return render(<Harness id="spelling_tips" {...props} />);
}

async function renderStarted(props: Partial<React.ComponentProps<typeof OwlGuide>> = {}) {
  const tree = renderGuide(props);
  advance(GUIDE_TIMING.showDelayMs);
  await settleMeasurements();
  return tree;
}

async function renderLanded(props: Partial<React.ComponentProps<typeof OwlGuide>> = {}) {
  const tree = await renderStarted(props);
  advance(OWL_RHYTHM.arriveMs);
  return tree;
}

describe('OwlGuide', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGuide.isLoaded = true;
    mockGuide.activeGuide = null;
    mockGuide.stepIndex = 0;
    mockGuide.completed = [];
    setWindow(402, 874);
    Object.values(mockApi).forEach((fn) => fn.mockClear());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('starting', () => {
    it('waits a moment for the screen to settle, then starts', () => {
      const tree = renderGuide();

      advance(GUIDE_TIMING.showDelayMs - 1);
      expect(mockApi.startGuide).not.toHaveBeenCalled();

      advance(1);
      expect(mockApi.startGuide).toHaveBeenCalledWith('spelling_tips');
      expect(tree.toJSON()).not.toBeNull();
    });

    it('waits longer in landscape, where the screen may still be turning', () => {
      setWindow(874, 402);
      renderGuide();

      advance(GUIDE_TIMING.showDelayMs);
      expect(mockApi.startGuide).not.toHaveBeenCalled();

      advance(GUIDE_TIMING.landscapeShowDelayMs - GUIDE_TIMING.showDelayMs);
      expect(mockApi.startGuide).toHaveBeenCalled();
    });

    it('honours an explicit delay', () => {
      renderGuide({ delayMs: 50 });

      advance(50);

      expect(mockApi.startGuide).toHaveBeenCalled();
    });

    it('stays away while the screen is not active', () => {
      renderGuide({ active: false });

      advance(10000);

      expect(mockApi.startGuide).not.toHaveBeenCalled();
    });

    it('does not repeat a guide that has been seen', () => {
      mockGuide.completed = ['spelling_tips'];
      const tree = renderGuide();

      advance(10000);

      expect(mockApi.startGuide).not.toHaveBeenCalled();
      expect(tree.toJSON()).toBeNull();
    });

    it('waits until the remembered guides have loaded', () => {
      mockGuide.isLoaded = false;
      renderGuide();

      advance(10000);

      expect(mockApi.startGuide).not.toHaveBeenCalled();
    });

    it('does not interrupt another guide that is already talking', () => {
      mockGuide.activeGuide = 'numbers_tips';
      renderGuide();

      advance(10000);

      expect(mockApi.startGuide).not.toHaveBeenCalled();
    });

    it('replays a seen guide when asked to', () => {
      mockGuide.completed = ['spelling_tips'];
      renderGuide({ replay: true });

      advance(GUIDE_TIMING.showDelayMs);

      expect(mockApi.startGuide).toHaveBeenCalledWith('spelling_tips');
    });
  });

  /**
   * The delay before the owl lands used to leave the page live. A tap in that
   * window opened a sheet, and the owl then arrived over the top of it talking
   * about the page underneath -- the wrong words on the wrong screen.
   */
  describe('while a tour is due but has not arrived', () => {
    it('takes the screen so nothing under it can be tapped', () => {
      const tree = renderGuide();

      expect(has(tree, 'owl-guide-blocker')).toBe(true);
      expect(findByTestId(tree, 'owl-guide-pending')[0].props.onPress).toBeInstanceOf(Function);
    });

    it('gets out of the way once the guide has been seen', () => {
      mockGuide.completed = ['spelling_tips'];

      const tree = renderGuide();

      expect(tree.toJSON()).toBeNull();
    });

    it('leaves the screen alone while another tour is the one running', () => {
      mockGuide.activeGuide = 'catalogue_tour';

      const tree = renderGuide();

      expect(tree.toJSON()).toBeNull();
    });

    it('leaves the screen alone before the tutorial state has loaded', () => {
      mockGuide.isLoaded = false;

      const tree = renderGuide();

      expect(tree.toJSON()).toBeNull();
    });
  });

  /**
   * The words used to change the instant the step did, while the spotlight was
   * still being measured -- so the child read about a thing that was not lit
   * yet. The highlight lands first now, and the words follow it.
   */
  describe('changing step', () => {
    it('leaves the words as they were until the highlight has landed', async () => {
      const tree = await renderLanded();

      press(tree, 'owl-guide-next');

      expect(json(tree)).toContain(GUIDE_STEPS.spelling_tips[0].titleKey);
      expect(json(tree)).not.toContain(GUIDE_STEPS.spelling_tips[1].titleKey);
    });

    it('holds the words out of sight while it waits', async () => {
      const tree = await renderLanded();

      press(tree, 'owl-guide-next');

      expect(findByTestId(tree, 'owl-guide-bubble')[0].props.muted).toBe(true);
    });

    it('brings the words back once the beat is up', async () => {
      const tree = await renderLanded();

      await step(tree);

      expect(json(tree)).toContain(GUIDE_STEPS.spelling_tips[1].titleKey);
      expect(findByTestId(tree, 'owl-guide-bubble')[0].props.muted).toBe(false);
    });

    /**
     * The ring used to blink out the moment the step changed and come back
     * once the next subject had been measured, leaving a beat with an empty
     * bubble over a page with nothing marked on it.
     */
    it('keeps the last subject lit while it looks for the next one', async () => {
      const targets = { read_button: ref(40, 300), narrate_button: ref(240, 300) };
      const tree = await renderLanded({ id: 'book_mode_tour', targets });

      press(tree, 'owl-guide-next');

      expect(has(tree, 'owl-guide-cutout')).toBe(true);
      expect(owl(tree).props.pointing).toBe(true);
    });

    /**
     * A step whose subject is not on this screen after all -- the screen time
     * ring with screen time switched off -- still has its say. Waiting for a
     * highlight that never arrives left the bubble blank and the tour stuck.
     */
    it('speaks a step whose subject cannot be measured, rather than waiting for it', async () => {
      const unmeasurable = { current: null } as RefObject<View | null>;
      const tree = await renderLanded({
        id: 'book_mode_tour',
        targets: { read_button: ref(40, 300), narrate_button: unmeasurable },
      });

      await step(tree);

      expect(json(tree)).toContain(GUIDE_STEPS.book_mode_tour[1].titleKey);
      expect(findByTestId(tree, 'owl-guide-bubble')[0].props.muted).toBe(false);
    });

    it('refuses a second next before the words have caught up', async () => {
      const tree = await renderLanded();

      press(tree, 'owl-guide-next');
      press(tree, 'owl-guide-next');

      expect(mockApi.nextStep).toHaveBeenCalledTimes(1);
    });
  });

  describe('talking', () => {
    it('brings the owl in before it says anything', async () => {
      const tree = await renderStarted();

      expect(owl(tree).props.phase).toBe('arrive');
      expect(has(tree, 'owl-guide-bubble')).toBe(false);
    });

    it('opens with the first step once the owl has landed', async () => {
      const tree = await renderLanded();

      expect(owl(tree).props.phase).toBe('idle');
      expect(json(tree)).toContain(GUIDE_STEPS.spelling_tips[0].titleKey);
      expect(json(tree)).toContain(GUIDE_STEPS.spelling_tips[0].descriptionKey);
    });

    it('moves to the next step and gives the owl something new to say', async () => {
      const tree = await renderLanded();
      const before = owl(tree).props.sayCount;

      await step(tree);

      expect(mockApi.nextStep).toHaveBeenCalledTimes(1);
      expect(json(tree)).toContain(GUIDE_STEPS.spelling_tips[1].titleKey);
      expect(owl(tree).props.sayCount).toBe(before + 1);
    });

    it('labels the last step to send them on their way', async () => {
      const tree = await renderLanded();
      const last = GUIDE_STEPS.spelling_tips.length - 1;

      for (let i = 0; i < last; i++) await step(tree);

      expect(has(tree, 'owl-guide-okay')).toBe(true);
      expect(findByTestId(tree, 'owl-guide-okay')[0].props.accessibilityLabel).toBe('tutorial.buttons.letsGo');
      expect(findByTestId(tree, 'owl-guide-dot-3')[0].props.accessibilityState).toEqual({ selected: true });
    });

    it('lets the owl celebrate, then remembers the guide as done', async () => {
      const onEnd = jest.fn();
      const tree = await renderLanded({ onEnd });
      for (let i = 0; i < GUIDE_STEPS.spelling_tips.length - 1; i++) await step(tree);

      press(tree, 'owl-guide-okay');

      expect(owl(tree).props.phase).toBe('delight');
      expect(mockApi.completeGuide).not.toHaveBeenCalled();

      advance(OWL_RHYTHM.delightMs);

      expect(mockApi.completeGuide).toHaveBeenCalledTimes(1);
      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(tree.toJSON()).toBeNull();
    });

    it('lets the owl slip away on skip, and still counts the guide as seen', async () => {
      const onEnd = jest.fn();
      const tree = await renderLanded({ onEnd });

      press(tree, 'owl-guide-close');

      expect(owl(tree).props.phase).toBe('leave');
      advance(OWL_RHYTHM.leaveMs);
      expect(mockApi.skipGuide).toHaveBeenCalledTimes(1);
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('forgets nothing when a replay is closed', async () => {
      mockGuide.completed = ['spelling_tips'];
      const tree = await renderLanded({ replay: true });

      press(tree, 'owl-guide-close');
      advance(OWL_RHYTHM.leaveMs);

      expect(mockApi.dismissGuide).toHaveBeenCalledTimes(1);
      expect(mockApi.skipGuide).not.toHaveBeenCalled();
    });

    it('ignores taps while the owl is still arriving or leaving', async () => {
      const tree = await renderLanded();

      press(tree, 'owl-guide-close');
      press(tree, 'owl-guide-close');
      advance(OWL_RHYTHM.leaveMs * 2);

      expect(mockApi.skipGuide).toHaveBeenCalledTimes(1);
    });

    it('covers the screen so nothing underneath can be tapped', async () => {
      const tree = await renderLanded();

      expect(has(tree, 'owl-guide-dim')).toBe(true);
      expect(findByTestId(tree, 'owl-guide')[0].props.accessibilityViewIsModal).toBe(true);
    });

    it('names the owl for screen readers', async () => {
      const tree = await renderLanded();

      expect(findByTestId(tree, 'owl-guide-owl-perch')[0].props.accessibilityLabel).toBe('screenTimeOwl.owlLabel');
    });
  });

  describe('highlighting', () => {
    const targets = {
      read_button: ref(40, 700),
      record_button: ref(160, 700),
      narrate_button: ref(280, 60),
    };

    it('waits for the highlight to be measured before showing anything', async () => {
      const tree = renderGuide({ id: 'book_mode_tour', targets });
      advance(GUIDE_TIMING.showDelayMs);

      expect(has(tree, 'owl-guide-blocker')).toBe(true);
      expect(has(tree, 'owl-guide-bubble')).toBe(false);

      await settleMeasurements();

      expect(tree.toJSON()).not.toBeNull();
    });

    it('cuts a spotlight around the highlighted button', async () => {
      const tree = await renderLanded({ id: 'book_mode_tour', targets });

      expect(has(tree, 'owl-guide-cutout')).toBe(true);
      expect(has(tree, 'owl-guide-ring')).toBe(true);
    });

    it('has the owl point its wing at the highlight', async () => {
      const tree = await renderLanded({ id: 'book_mode_tour', targets });

      expect(owl(tree).props.pointing).toBe(true);
    });

    it('keeps the owl on its perch in the bottom-left, pointing right', async () => {
      const tree = await renderLanded({ id: 'book_mode_tour', targets });

      const perch = [findByTestId(tree, 'owl-guide-perch')[0].props.style].flat(3).reduce((a: any, b: any) => ({ ...a, ...b }), {});
      expect(perch).toMatchObject({ left: 0, bottom: 0 });
      expect(owl(tree).props.wingSide).toBe('right');
      expect(owl(tree).props.approach).toBe('none');
    });

    /**
     * The bubble used to fly to whatever was being pointed at, which left a box
     * floating mid-screen with no owl attached to it. It stays with the owl now
     * however the highlight falls, and only the spotlight moves.
     */
    it('keeps the bubble on the owl even for a highlight where it rests', async () => {
      const tree = await renderLanded({ id: 'book_mode_tour', targets });

      expect(has(tree, 'owl-guide-bubble-perch')).toBe(true);
      expect(has(tree, 'owl-guide-tail-down')).toBe(true);
      expect(has(tree, 'owl-guide-pointer-down')).toBe(false);
    });

    it('leaves it there for a highlight out of its way too', async () => {
      const tree = await renderLanded({ id: 'book_mode_tour', targets });

      await step(tree);
      await settleMeasurements();

      expect(has(tree, 'owl-guide-bubble-perch')).toBe(true);
      expect(has(tree, 'owl-guide-tail-down')).toBe(true);
      expect(has(tree, 'owl-guide-pointer-up')).toBe(false);
    });

    /**
     * The child nav bar sits below the scroll view, so the page cannot bring it
     * anywhere: asking walked the page off what the owl was talking about and
     * back again, over and over, before every nav step.
     */
    /**
     * The owl's perch is the bottom-left corner, which is where the first item
     * of a fixed bottom bar sits. It used to stand in front of the very thing
     * it was pointing at.
     */
    it('fades the owl back when it would cover its own subject', async () => {
      // bottom-left, under the perch
      const tree = await renderLanded({
        id: 'catalogue_tour',
        targets: { nav_progress: ref(30, 800, 44, 44) },
      });
      (withTiming as unknown as jest.Mock).mockClear();

      await step(tree);

      expect(fadedTo()).toContain(PERCH_STEP_BACK);
    });

    it('leaves the owl whole for a subject it is nowhere near', async () => {
      const tree = await renderLanded({
        id: 'catalogue_tour',
        targets: { nav_progress: ref(300, 120, 44, 44) },
      });
      (withTiming as unknown as jest.Mock).mockClear();

      await step(tree);

      expect(fadedTo()).not.toContain(PERCH_STEP_BACK);
    });

    it('never asks a page to move for a pinned subject', async () => {
      const scroller = { reveal: jest.fn(), restore: jest.fn(() => false), release: jest.fn() };
      // the child nav bar sits below the scroll view: it is at the foot of the
      // screen, right where the bubble rests, and the page cannot move it
      const tree = await renderLanded({
        id: 'catalogue_tour',
        targets: { nav_progress: ref(40, 800), nav_search: ref(240, 800) },
        scroller,
      });

      await step(tree);

      expect(has(tree, 'owl-guide-cutout')).toBe(true);
      expect(scroller.reveal).not.toHaveBeenCalled();
    });

    /**
     * A page that scrolls does not need the bubble taken off the owl: the page
     * moves until the highlight is clear of it, and goes back afterwards.
     */
    describe('on a page that can scroll', () => {
      /**
        * A page that really moves: revealing lifts the targets by the shift it
        * was given, the way a scroll does, so the guide sees the view it asked
        * for rather than the one it started in.
        */
      function movingPage(start = 700) {
        // the second subject sits above the first, so the scroll that clears
        // the first leaves the second measuring clear in that view -- which is
        // exactly the stale reading a step change must not draw from
        const at: Record<string, number> = {
          progress_hero: start,
          progress_challenges: start - 60,
          progress_milestones: start + 120,
        };
        const targetAt = (id: string) => ({
          current: {
            measureInWindow: (cb: (...args: number[]) => void) => cb(40, at[id], 80, 40),
          } as unknown as View,
        });
        const home = { ...at };
        const scroller = {
          // a real page carries everything on it by the shift it was given,
          // from wherever it was standing
          reveal: jest.fn((shift: number) => {
            Object.keys(at).forEach((id) => {
              at[id] -= shift;
            });
          }),
          release: jest.fn(() => {
            Object.keys(at).forEach((id) => {
              at[id] = home[id];
            });
          }),
        };
        const targets = {
          progress_hero: targetAt('progress_hero'),
          progress_challenges: targetAt('progress_challenges'),
          progress_milestones: targetAt('progress_milestones'),
        };
        return { targets, scroller };
      }

      /** Landed and one step in, past the welcome that opens the tour. */
      async function renderOnSubject(props: Partial<React.ComponentProps<typeof OwlGuide>>) {
        const tree = await renderLanded({ id: 'progress_tour', ...props });
        press(tree, 'owl-guide-next');
        await settleEverything();
        return tree;
      }

      it('keeps the bubble on the perch and moves the page instead', async () => {
        const { targets: moving, scroller } = movingPage();
        const tree = await renderOnSubject({ targets: moving, scroller });

        expect(has(tree, 'owl-guide-bubble-perch')).toBe(true);
        expect(scroller.reveal).toHaveBeenCalledTimes(1);
        expect(scroller.reveal.mock.calls[0][0]).toBeGreaterThan(0);
      });

      /**
       * The scroll glides, so a spotlight cut from the view it started in
       * would sit where the highlight was passing rather than where it stops.
       */
      it('holds the spotlight back until the page has come to rest', async () => {
        const { targets: moving, scroller } = movingPage();
        const tree = await renderLanded({ id: 'progress_tour', targets: moving, scroller });

        press(tree, 'owl-guide-next');
        await settleMeasurements();

        expect(has(tree, 'owl-guide-cutout')).toBe(false);

        await act(async () => {
          jest.advanceTimersByTime(GUIDE_TIMING.scrollSettleMs);
        });

        expect(has(tree, 'owl-guide-cutout')).toBe(true);
      });

      /**
       * A screen mounts every tour it can run at once and they share the one
       * scroller, so a tour standing by must not touch the page: the step
       * index belongs to the guide, not to the instance watching it.
       */
      it('leaves the page alone while a different tour is the one running', () => {
        const { targets: moving, scroller } = movingPage();
        render(<Harness id="catalogue_tour" active={false} targets={moving} scroller={scroller} />);

        act(() => {
          mockApi.startGuide('progress_tour' as GuideId);
        });
        act(() => {
          mockApi.nextStep();
        });

        expect(scroller.reveal).not.toHaveBeenCalled();
        expect(scroller.release).not.toHaveBeenCalled();
      });

      /**
       * Between steps the rects on hand are the last step's, taken in the view
       * that step had scrolled to. Drawing from them puts a ring around the
       * next subject where it was standing a moment ago, before the page has
       * moved for it.
       */
      it('does not spotlight the next subject from the last step\'s view of the page', async () => {
        const { targets: moving, scroller } = movingPage();
        const tree = await renderOnSubject({ targets: moving, scroller });
        const before = ringFrame(tree);

        press(tree, 'owl-guide-next');

        // still around the subject just spoken about, not around wherever the
        // next one was standing before the page moved for it
        expect(ringFrame(tree)).toEqual(before);
      });

      it('leaves the page where it is for a highlight already in the clear', async () => {
        const { scroller } = movingPage();

        await renderOnSubject({ targets: { progress_hero: ref(40, 90) }, scroller });

        expect(scroller.reveal).not.toHaveBeenCalled();
      });

      /**
       * The page used to be carried home between steps and sent out again,
       * which was a bounce the child could see before every subject. It moves
       * on from where it stands now.
       */
      it('moves the page on from where the last step left it', async () => {
        const { targets: moving, scroller } = movingPage();
        const tree = await renderOnSubject({ targets: moving, scroller });
        expect(scroller.reveal).toHaveBeenCalledTimes(1);

        // second subject, then the third, which sits below both
        press(tree, 'owl-guide-next');
        await settleEverything();
        press(tree, 'owl-guide-next');
        await settleEverything();

        expect(scroller.reveal).toHaveBeenCalledTimes(2);
        // only what the third subject still needs, not the whole way from home
        expect(scroller.reveal.mock.calls[1][0]).toBeLessThan(scroller.reveal.mock.calls[0][0]);
      });

      /**
       * A rect measured before a scroll is a lie the moment the page starts
       * gliding. The ring used to be left drawn over the moving page, landing
       * around whatever slid under it.
       */
      it('takes the ring off the page while the page is moving for the next subject', async () => {
        const { targets: moving, scroller } = movingPage();
        const tree = await renderOnSubject({ targets: moving, scroller });
        press(tree, 'owl-guide-next');
        await settleEverything();
        expect(has(tree, 'owl-guide-cutout')).toBe(true);

        // the third subject is below the bubble, so the page has to move again
        press(tree, 'owl-guide-next');
        await settleMeasurements();

        expect(has(tree, 'owl-guide-cutout')).toBe(false);
      });

      /**
       * A page does not always travel the whole way in one go: the room it
       * reserves to do it in only exists a render later, so the first scroll is
       * clamped to the page's old end. The step used to ask once and settle for
       * whatever it got, leaving the card most of the way behind the bubble.
       */
      it('asks again while the page is still closing the gap', async () => {
        const { targets: moving, scroller } = movingPage();
        // a page that only ever travels half of what it is asked for, the way a
        // real one does before the room it reserved has been laid out
        const whole = scroller.reveal.getMockImplementation()!;
        scroller.reveal.mockImplementation((shift: number) => whole(Math.round(shift / 2)));

        const tree = await renderOnSubject({ targets: moving, scroller });
        // half a page at a time takes a few more rounds to settle
        await settleEverything();

        // twice, and no more: a page that keeps under-delivering would
        // otherwise inch along for seconds
        expect(scroller.reveal).toHaveBeenCalledTimes(2);
        const asks = scroller.reveal.mock.calls.map((call) => call[0] as number);
        expect(asks[1]).toBeLessThan(asks[0]);
        expect(has(tree, 'owl-guide-cutout')).toBe(true);
      });

      /** ...and it stops the moment an ask stops making progress. */
      it('gives up on a page that cannot move any further', async () => {
        const { targets: moving } = movingPage();
        const stuck = { reveal: jest.fn(), release: jest.fn() };

        const tree = await renderOnSubject({ targets: moving, scroller: stuck });

        // the page never moved, so the second ask is worth nothing and the
        // ring is drawn where the subject actually stands
        expect(stuck.reveal).toHaveBeenCalledTimes(1);
        expect(has(tree, 'owl-guide-cutout')).toBe(true);
      });

      /** A subject already in the clear costs the page no movement at all. */
      it('asks for nothing when the next subject is already in the clear', async () => {
        const { targets: moving, scroller } = movingPage();
        const tree = await renderOnSubject({ targets: moving, scroller });

        // the second subject sits above the first, so the scroll that cleared
        // the first has already brought it into the band
        press(tree, 'owl-guide-next');
        await settleEverything();

        expect(scroller.reveal).toHaveBeenCalledTimes(1);
      });

      /** Not just back to where the step began: back to the place the child left. */
      it('gives the page back for good when the last step is finished', async () => {
        const { targets: moving, scroller } = movingPage();
        const tree = await renderLanded({ id: 'progress_tour', targets: moving, scroller });

        // only the steps whose subjects these fixtures carry are shown
        while (has(tree, 'owl-guide-next') || has(tree, 'owl-guide-okay')) {
          press(tree, has(tree, 'owl-guide-okay') ? 'owl-guide-okay' : 'owl-guide-next');
          await settleEverything();
        }
        await act(async () => {
          jest.advanceTimersByTime(OWL_RHYTHM.delightMs);
        });

        expect(scroller.release).toHaveBeenCalled();
      });

      it('gives the page back for good when the tour is closed', async () => {
        const { targets: moving, scroller } = movingPage();
        const tree = await renderOnSubject({ targets: moving, scroller });

        press(tree, 'owl-guide-close');
        await act(async () => {
          jest.advanceTimersByTime(OWL_RHYTHM.leaveMs);
        });

        expect(scroller.release).toHaveBeenCalled();
      });
    });

    it('leaves out a step whose highlight is not on this screen', async () => {
      const tree = await renderLanded({ id: 'main_menu_tour', targets: { stories_button: ref(40, 600) } });

      expect(findByTestId(tree, 'owl-guide-dot-1')).toHaveLength(1);
      expect(findByTestId(tree, 'owl-guide-dot-2')).toHaveLength(0);
    });

    it('still speaks, without a spotlight, when a highlight cannot be measured', async () => {
      const unmeasurable = { current: null } as RefObject<View | null>;
      const tree = await renderLanded({ id: 'book_mode_tour', targets: { read_button: unmeasurable } });

      expect(has(tree, 'owl-guide-bubble')).toBe(true);
      expect(has(tree, 'owl-guide-cutout')).toBe(false);
      expect(owl(tree).props.pointing).toBe(false);
    });

    it('lowers the wing again on a step with nothing to point at', async () => {
      const tree = await renderLanded({ id: 'main_menu_tour', targets: { stories_button: ref(40, 600) } });

      expect(owl(tree).props.pointing).toBe(false);

      press(tree, 'owl-guide-next');
      await settleMeasurements();

      expect(owl(tree).props.pointing).toBe(true);
    });
  });

  describe('in landscape', () => {
    beforeEach(() => {
      setWindow(874, 402);
    });

    async function renderLandscape(props: Partial<React.ComponentProps<typeof OwlGuide>> = {}) {
      const tree = renderGuide(props);
      advance(GUIDE_TIMING.landscapeShowDelayMs);
      await settleMeasurements();
      advance(OWL_RHYTHM.arriveMs);
      return tree;
    }

    it('lays the bubble beside a smaller owl', async () => {
      const tree = await renderLandscape();

      expect(has(tree, 'owl-guide-bubble-perch')).toBe(true);
      expect(has(tree, 'owl-guide-tail-left')).toBe(true);
      expect(owl(tree).props.width).toBeLessThan(100);
    });

    it('keeps the bubble beside the owl for a highlight in the bottom band', async () => {
      const tree = await renderLandscape({ id: 'book_mode_tour', targets: { read_button: ref(300, 340, 120, 40) } });

      expect(has(tree, 'owl-guide-bubble-perch')).toBe(true);
      expect(has(tree, 'owl-guide-tail-left')).toBe(true);
    });
  });
});

/**
 * The home tour's ring step shows the ring itself, twice, under its words:
 * with time left, and as the red orb it becomes when the time is up.
 */
describe('the ring step', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGuide.isLoaded = true;
    mockGuide.activeGuide = null;
    mockGuide.stepIndex = 0;
    mockGuide.completed = [];
    setWindow(402, 874);
    Object.values(mockApi).forEach((fn) => fn.mockClear());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('draws the ring legend under the words', async () => {
    const targets = Object.fromEntries(
      GUIDE_STEPS.main_menu_tour.filter((step) => step.target).map((step) => [step.target as string, ref(100, 100)]),
    );
    const tree = await renderLanded({ id: 'main_menu_tour', targets });
    const ringIndex = GUIDE_STEPS.main_menu_tour.findIndex((step) => step.id === 'screen_time_ring');

    for (let i = 0; i < ringIndex; i += 1) {
      await step(tree);
      await settleMeasurements();
    }

    expect(json(tree)).toContain('owl-guide-illustration');
    expect(json(tree)).toContain('screen-time-ring-legend-remaining');
    expect(json(tree)).toContain('screen-time-ring-legend-spent');
  });

  it('draws no picture under a step that has none', async () => {
    const targets = Object.fromEntries(
      GUIDE_STEPS.main_menu_tour.filter((step) => step.target).map((step) => [step.target as string, ref(100, 100)]),
    );
    const tree = await renderLanded({ id: 'main_menu_tour', targets });

    expect(json(tree)).not.toContain('owl-guide-illustration');
  });
});
