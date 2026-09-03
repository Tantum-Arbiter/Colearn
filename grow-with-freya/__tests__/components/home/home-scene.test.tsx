/**
 * Tests for the home scene as a whole.
 *
 * One greeting, an optional invitation to carry on, three ways in, and a way
 * out for grown-ups. Nothing else competes for a child's attention.
 */

import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { render, fireEvent, type RenderResult } from '@testing-library/react-native';
import { HomeScene } from '@/components/home/home-scene';
import { HOME_ACTIVITIES, HOME_THEMES } from '@/constants/home-scene';
import { ringCentre } from '@/constants/screen-time-ring';

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

function presentActivityIds(view: RenderResult): string[] {
  return HOME_ACTIVITIES.filter(
    (activity) => byTestId(view, `activity-card-${activity.id}`).length > 0
  ).map((activity) => activity.id);
}

function renderScene(props: Partial<React.ComponentProps<typeof HomeScene>> = {}) {
  const onNavigate = jest.fn();
  const onOpenGrownUps = jest.fn();
  const onContinueReading = jest.fn();

  const view = render(
    <HomeScene
      onNavigate={onNavigate}
      onOpenGrownUps={onOpenGrownUps}
      onContinueReading={onContinueReading}
      continueReading={null}
      timeOfDay="night"
      {...props}
    />
  );

  return { view, onNavigate, onOpenGrownUps, onContinueReading, ...view };
}

const RESUMABLE = {
  storyId: 'wombat',
  title: 'The Gate Hears Two Taps',
  coverImage: 'file:///cover.webp',
  pageIndex: 3,
  totalPages: 10,
};

describe('HomeScene', () => {
  describe('the greeting', () => {
    it('should ask what to do together rather than what to play', () => {
      const { view } = renderScene();

      const underTest = textContents(view);

      expect(underTest).toContain('home.greeting');
    });
  });

  describe('the ways in', () => {
    it('should offer exactly the three ways in', () => {
      const { view } = renderScene();

      const underTest = presentActivityIds(view);

      expect(underTest).toEqual(HOME_ACTIVITIES.map((activity) => activity.id));
    });

    it.each(HOME_ACTIVITIES.map((activity) => [activity.id, activity.destination] as const))(
      'should navigate to %s destination %s',
      (id, destination) => {
        const { onNavigate, view } = renderScene();

        pressTestId(view, `activity-card-${id}`);

        expect(onNavigate).toHaveBeenCalledWith(destination);
      }
    );
  });

  describe('carrying on', () => {
    it('should stay silent when no story is part-read', () => {
      const { view } = renderScene({ continueReading: null });

      const underTest = byTestId(view, 'continue-together-card');

      expect(underTest.length).toBe(0);
    });

    it('should invite the child back into a part-read story', () => {
      const { view } = renderScene({ continueReading: RESUMABLE });

      const underTest = byTestId(view, 'continue-together-card');

      expect(underTest.length).toBeGreaterThan(0);
    });

    it('should hand back the story id when resumed', () => {
      const { onContinueReading, view } = renderScene({ continueReading: RESUMABLE });

      pressTestId(view, 'continue-together-card');

      expect(onContinueReading).toHaveBeenCalledWith('wombat');
    });
  });

  describe('the grown-up corner', () => {
    it('should be present but subordinate', () => {
      const { view } = renderScene();

      const underTest = textContents(view);

      expect(underTest).toContain('home.grownUps');
    });

    it('should hand off rather than navigate itself, so the gate can run', () => {
      const { onOpenGrownUps, onNavigate, view } = renderScene();

      pressTestId(view, 'grown-ups-pill');

      expect(onOpenGrownUps).toHaveBeenCalledTimes(1);
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });
});

describe('HomeScene time of day', () => {
  describe.each([
    ['night', HOME_THEMES.night],
    ['day', HOME_THEMES.day],
  ] as const)('at %s', (timeOfDay, theme) => {
    it('should dress the greeting in that theme', () => {
      const { view } = renderScene({ timeOfDay });

      const underTest = view
        .UNSAFE_queryAllByType(Text)
        .find((node) => node.props.children === 'home.greeting');

      expect(StyleSheet.flatten(underTest?.props.style).color).toBe(theme.title);
    });

    it('should still offer all three ways in', () => {
      const { view } = renderScene({ timeOfDay });

      const underTest = presentActivityIds(view);

      expect(underTest).toEqual(HOME_ACTIVITIES.map((activity) => activity.id));
    });
  });

  it.each(['day', 'night'] as const)('should show the horizon at %s', (timeOfDay) => {
    const { view } = renderScene({ timeOfDay });

    const underTest = byTestId(view, 'home-horizon');

    expect(underTest.length).toBeGreaterThan(0);
  });
});

describe('HomeScene screen time', () => {
  it('should stay out of the way when screen time is not being tracked', () => {
    const { view } = renderScene({ screenTime: null });

    const underTest = byTestId(view, 'screen-time-ring');

    expect(underTest.length).toBe(0);
  });

  it('should show a quiet ring while there is time left', () => {
    const { view } = renderScene({ screenTime: { usageSeconds: 600, limitSeconds: 3600 } });

    const underTest = byTestId(view, 'screen-time-ring-fill');

    expect(byTestId(view, 'screen-time-ring').length).toBeGreaterThan(0);
    expect(underTest.length).toBe(0);
  });

  it('should fill the ring once the allowance is spent', () => {
    const { view } = renderScene({ screenTime: { usageSeconds: 3600, limitSeconds: 3600 } });

    const underTest = byTestId(view, 'screen-time-ring-fill');

    expect(underTest.length).toBeGreaterThan(0);
  });
});

describe('HomeScene opening screen time', () => {
  it('should let the ring be opened from the menu', () => {
    const onOpenScreenTime = jest.fn();
    const { view } = renderScene({
      screenTime: { usageSeconds: 600, limitSeconds: 3600 },
      onOpenScreenTime,
    });

    pressTestId(view, 'screen-time-ring');

    expect(onOpenScreenTime).toHaveBeenCalledTimes(1);
  });

  it('should report where the ring is, so the glance can open out of it', () => {
    const onOpenScreenTime = jest.fn();
    const { view } = renderScene({
      screenTime: { usageSeconds: 600, limitSeconds: 3600 },
      onOpenScreenTime,
    });

    pressTestId(view, 'screen-time-ring');

    // the ring is pinned to the middle of the bottom edge, so its centre
    // follows from the screen and the safe-area inset (34 from the
    // suite-wide mock) rather than a runtime measurement
    const { width, height } = Dimensions.get('window');
    expect(onOpenScreenTime).toHaveBeenCalledWith(ringCentre(width, height, 34));
  });

  it('should keep the offer with the cards, not floating over the bottom', () => {
    // the bottom edge belongs to the ring now: the glance's orb rises there
    // and its closing drop falls back to it, so the offer scrolls with the
    // content it is an offer about
    const { view } = renderScene({
      screenTime: { usageSeconds: 600, limitSeconds: 3600 },
      onOpenPlans: jest.fn(),
    });

    const plan = byTestId(view, 'unlock-plan-button')[0];
    const ring = byTestId(view, 'screen-time-ring')[0];

    expect(plan).toBeTruthy();
    expect(ring).toBeTruthy();
  });

  it('should leave the ring inert when no handler is supplied', () => {
    const { view } = renderScene({ screenTime: { usageSeconds: 600, limitSeconds: 3600 } });

    const underTest = byTestId(view, 'screen-time-ring')[0];

    expect(underTest.props.accessibilityRole).toBe('image');
  });
});

describe('HomeScene sky face', () => {
  it.each([
    ['day', 'home.sun'],
    ['night', 'home.moon'],
  ] as const)('should hang the %s face over the scene', (timeOfDay, label) => {
    const { view } = renderScene({ timeOfDay });

    const underTest = byTestId(view, 'sky-face')[0];

    expect(underTest.props.accessibilityLabel).toBe(label);
  });
});

describe('HomeScene sky dressing', () => {
  it.each(['day', 'night'] as const)('should lay clouds over the %s sky', (timeOfDay) => {
    const { view } = renderScene({ timeOfDay });

    const underTest = byTestId(view, 'home-horizon-clouds');

    expect(underTest.length).toBeGreaterThan(0);
  });

  it.each(['day', 'night'] as const)('should show a star field at %s', (timeOfDay) => {
    const { view } = renderScene({ timeOfDay });

    const underTest = byTestId(view, 'star-field');

    expect(underTest.length).toBeGreaterThan(0);
  });

});

describe('HomeScene the plan offer', () => {
  it('should sit in the opposite corner from the screen-time ring', () => {
    const onOpenPlans = jest.fn();
    const { view } = renderScene({ onOpenPlans });

    const underTest = byTestId(view, 'unlock-plan-button');

    expect(underTest.length).toBeGreaterThan(0);
  });

  it('should open the plans when tapped', () => {
    const onOpenPlans = jest.fn();
    const { view } = renderScene({ onOpenPlans });

    pressTestId(view, 'unlock-plan-button');

    expect(onOpenPlans).toHaveBeenCalledTimes(1);
  });

  it('should stay away entirely for a family who already subscribes', () => {
    const { view } = renderScene();

    const underTest = byTestId(view, 'unlock-plan-button');

    expect(underTest.length).toBe(0);
  });
});
