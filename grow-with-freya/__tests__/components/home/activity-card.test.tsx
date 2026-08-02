/**
 * Tests for a single activity row on the home scene.
 *
 * The card is one large target: artwork bleeding from the left edge, a coloured
 * badge, a title, a description and a chevron. Nothing inside it is separately
 * tappable, so a child cannot miss.
 *
 * Note: jest.config maps `react-native` to `react-native-web`, so host nodes are
 * DOM elements and getByTestId does not resolve. Queries use UNSAFE_*ByProps.
 */

import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, fireEvent, type RenderResult } from '@testing-library/react-native';
import { ActivityCard } from '@/components/home/activity-card';
import { HOME_ACTIVITIES, HOME_SCENE_LAYOUT } from '@/constants/home-scene';

const CARD_WIDTH = 363;
const CARD_HEIGHT = 112;

function textContents(view: RenderResult): string[] {
  return view
    .UNSAFE_queryAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function renderCard(props: Partial<React.ComponentProps<typeof ActivityCard>> = {}) {
  const onPress = jest.fn();

  const view = render(
    <ActivityCard
      activity={HOME_ACTIVITIES[0]}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      timeOfDay="night"
      onPress={onPress}
      {...props}
    />
  );

  return { view, onPress, ...view };
}

describe('ActivityCard', () => {
  describe('what the child sees', () => {
    it.each(HOME_ACTIVITIES.map((activity) => [activity.id, activity] as const))(
      'should name the %s activity from translation keys',
      (_id, activity) => {
        const { view } = renderCard({ activity });

        const underTest = textContents(view);

        expect(underTest).toContain(activity.titleKey);
        expect(underTest).toContain(activity.descriptionKey);
      }
    );

    it.each([
      ['a hairline along the top edge', 'activity-card-hairline'],
      ['a diagonal glass sheen', 'activity-card-sheen'],
    ])('should carry %s', (_case, testID) => {
      const { view } = renderCard();

      const underTest = byTestId(view, testID);

      expect(underTest.length).toBeGreaterThan(0);
    });

    it('should show a chevron so the row reads as a way through', () => {
      const { view } = renderCard();

      const underTest = byTestId(view, 'activity-card-chevron');

      expect(underTest.length).toBeGreaterThan(0);
    });

    it.each(HOME_ACTIVITIES.map((activity) => [activity.id, activity] as const))(
      'should carry the %s badge',
      (_id, activity) => {
        const { view } = renderCard({ activity });

        const underTest = byTestId(view, 'activity-card-badge');

        expect(underTest.length).toBeGreaterThan(0);
      }
    );

    it('should size the badge from the card so it scales on a tablet', () => {
      const { view } = renderCard();

      const underTest = byTestId(view, 'activity-card-badge')[0].props.size;

      expect(underTest).toBe(Math.round(CARD_WIDTH * HOME_SCENE_LAYOUT.badgeSizeRatio));
    });
  });

  describe('the artwork', () => {
    it('should run the full width of the card', () => {
      const underTest = Math.round(CARD_WIDTH * HOME_SCENE_LAYOUT.artWidthRatio);

      expect(underTest).toBe(CARD_WIDTH);
    });

    it('should hold at full strength past the badge and the words', () => {
      const wordsEnd = HOME_SCENE_LAYOUT.badgeLeftRatio + HOME_SCENE_LAYOUT.badgeSizeRatio;

      const underTest = HOME_SCENE_LAYOUT.artFadeStart;

      expect(underTest).toBeGreaterThan(wordsEnd);
    });

    it('should only begin to let go once it reaches the chevron', () => {
      const underTest = HOME_SCENE_LAYOUT.artFadeStart;

      expect(underTest).toBeGreaterThanOrEqual(0.85);
      expect(HOME_SCENE_LAYOUT.artFadeMid).toBe(1);
    });

    it('should render artwork for the activity', () => {
      const { view } = renderCard();

      const underTest = byTestId(view, 'activity-card-art');

      expect(underTest.length).toBeGreaterThan(0);
    });
  });

  describe('choosing', () => {
    it('should hand back the whole activity, not just its id', () => {
      const { onPress, view } = renderCard({ activity: HOME_ACTIVITIES[2] });

      fireEvent.press(byTestId(view, 'activity-card')[0]);

      expect(onPress).toHaveBeenCalledWith(HOME_ACTIVITIES[2]);
    });

    it('should expose exactly one target so nothing inside can be missed', () => {
      const { view } = renderCard();

      const underTest = view.UNSAFE_queryAllByType(Pressable);

      expect(underTest.length).toBe(1);
    });

    it('should label that target with the activity title', () => {
      const { view } = renderCard();

      const underTest = byTestId(view, 'activity-card')[0];

      expect(underTest.props.accessibilityLabel).toBe(HOME_ACTIVITIES[0].titleKey);
    });
  });
});
