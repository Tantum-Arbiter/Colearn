import React, { useEffect, useState, type RefObject } from 'react';
import type { View } from 'react-native';
import { render, act } from '@testing-library/react-native';

import { OwlGuide } from '@/components/owl-guide/owl-guide';
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

      press(tree, 'owl-guide-next');

      expect(mockApi.nextStep).toHaveBeenCalledTimes(1);
      expect(json(tree)).toContain(GUIDE_STEPS.spelling_tips[1].titleKey);
      expect(owl(tree).props.sayCount).toBe(before + 1);
    });

    it('labels the last step to send them on their way', async () => {
      const tree = await renderLanded();
      const last = GUIDE_STEPS.spelling_tips.length - 1;

      for (let i = 0; i < last; i++) press(tree, 'owl-guide-next');

      expect(has(tree, 'owl-guide-okay')).toBe(true);
      expect(findByTestId(tree, 'owl-guide-okay')[0].props.accessibilityLabel).toBe('tutorial.buttons.letsGo');
      expect(findByTestId(tree, 'owl-guide-dot-3')[0].props.accessibilityState).toEqual({ selected: true });
    });

    it('lets the owl celebrate, then remembers the guide as done', async () => {
      const onEnd = jest.fn();
      const tree = await renderLanded({ onEnd });
      for (let i = 0; i < GUIDE_STEPS.spelling_tips.length - 1; i++) press(tree, 'owl-guide-next');

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

      expect(tree.toJSON()).toBeNull();

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

    it('lifts the bubble above a highlight that sits where it would rest', async () => {
      const tree = await renderLanded({ id: 'book_mode_tour', targets });

      expect(has(tree, 'owl-guide-bubble-above')).toBe(true);
      expect(has(tree, 'owl-guide-pointer-down')).toBe(true);
      expect(has(tree, 'owl-guide-tail-down')).toBe(false);
    });

    it('settles back on the perch for a highlight out of its way', async () => {
      const tree = await renderLanded({ id: 'book_mode_tour', targets });

      press(tree, 'owl-guide-next');
      await settleMeasurements();
      press(tree, 'owl-guide-next');
      await settleMeasurements();

      expect(has(tree, 'owl-guide-bubble-perch')).toBe(true);
      expect(has(tree, 'owl-guide-tail-down')).toBe(true);
      expect(has(tree, 'owl-guide-pointer-up')).toBe(false);
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

    it('still lifts the bubble clear of a highlight in the bottom band', async () => {
      const tree = await renderLandscape({ id: 'book_mode_tour', targets: { read_button: ref(300, 340, 120, 40) } });

      expect(has(tree, 'owl-guide-bubble-above')).toBe(true);
      expect(has(tree, 'owl-guide-tail-left')).toBe(false);
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
      press(tree, 'owl-guide-next');
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
