/**
 * Tests for SceneBackground.
 *
 * The component draws a 1086x1448 portrait scene full-bleed in any viewport, so
 * the assertions are mostly about the centre-crop geometry it computes. Uses the
 * globally mocked expo-blur (testID "blur-view") from jest.setup.js.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import { SceneBackground } from '@/components/ui/scene-background';
import { SCENE_BACKGROUNDS } from '@/constants/scene-backgrounds';

const PORTRAIT = { width: 400, height: 800 };
const LANDSCAPE = { width: 800, height: 400 };

type SceneView = ReturnType<typeof render>;

function renderScene(props: Partial<React.ComponentProps<typeof SceneBackground>> = {}): SceneView {
  return render(<SceneBackground viewport={PORTRAIT} {...props} />);
}

/**
 * react-native maps to react-native-web here, which drops testID before it
 * reaches the DOM -query the element tree by prop instead.
 */
function byTestId(view: SceneView, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function requireByTestId(view: SceneView, testID: string) {
  const [element] = byTestId(view, testID);
  if (!element) throw new Error(`no element with testID "${testID}"`);
  return element;
}

function flatStyle(view: SceneView, testID: string): Record<string, number> {
  return StyleSheet.flatten(requireByTestId(view, testID).props.style) as Record<string, number>;
}

describe('SceneBackground', () => {
  describe('scene choice', () => {
    it('should render the source it is given', () => {
      const view = renderScene({ source: SCENE_BACKGROUNDS[2] });

      expect(requireByTestId(view, 'scene-background-image').props.source).toBe(SCENE_BACKGROUNDS[2]);
    });

    it('should choose one of the bundled scenes when given no source', () => {
      const view = renderScene();

      expect(SCENE_BACKGROUNDS)
        .toContain(requireByTestId(view, 'scene-background-image').props.source);
    });

    it('should keep the same scene across re-renders', () => {
      const view = renderScene();
      const first = requireByTestId(view, 'scene-background-image').props.source;

      view.rerender(<SceneBackground viewport={LANDSCAPE} />);

      expect(requireByTestId(view, 'scene-background-image').props.source).toBe(first);
    });
  });

  describe('centre-crop geometry', () => {
    it('should fill the height and overflow the width in a portrait viewport', () => {
      const style = flatStyle(renderScene({ viewport: PORTRAIT }), 'scene-background-image');

      expect(style.height).toBeCloseTo(800, 1);
      expect(style.width).toBeCloseTo(600, 1);
      expect(style.left).toBeCloseTo(-100, 1);
      expect(style.top).toBeCloseTo(0, 1);
    });

    it('should fill the width and overflow the height in a landscape viewport', () => {
      const style = flatStyle(renderScene({ viewport: LANDSCAPE }), 'scene-background-image');

      expect(style.width).toBeCloseTo(800, 1);
      expect(style.height).toBeCloseTo(1066.67, 1);
      expect(style.left).toBeCloseTo(0, 1);
    });

    it('should bias the landscape crop above centre so the sky survives', () => {
      const centred = flatStyle(
        renderScene({ viewport: LANDSCAPE, focalBias: 0.5 }), 'scene-background-image');
      const biased = flatStyle(
        renderScene({ viewport: LANDSCAPE, focalBias: 0.42 }), 'scene-background-image');

      expect(centred.top).toBeCloseTo(-333.33, 1);
      expect(biased.top).toBeGreaterThan(centred.top);
    });

    it('should not shift a viewport that matches the source aspect ratio', () => {
      const style = flatStyle(
        renderScene({ viewport: { width: 1086, height: 1448 } }), 'scene-background-image');

      expect(style.top).toBeCloseTo(0, 1);
      expect(style.left).toBeCloseTo(0, 1);
    });
  });

  describe('overlay layers', () => {
    it('should blur the scene by default', () => {
      const view = renderScene();

      expect(byTestId(view, 'blur-view')).toHaveLength(1);
    });

    it('should skip the blur layer when the intensity is zero', () => {
      const view = renderScene({ blurIntensity: 0 });

      expect(byTestId(view, 'blur-view')).toHaveLength(0);
    });

    it('should darken the scene with a scrim', () => {
      const view = renderScene({ scrimOpacity: 0.6 });

      expect(flatStyle(view, 'scene-background-scrim').opacity).toBe(0.6);
    });

    it('should skip the scrim when the opacity is zero', () => {
      const view = renderScene({ scrimOpacity: 0 });

      expect(byTestId(view, 'scene-background-scrim')).toHaveLength(0);
    });
  });
});
