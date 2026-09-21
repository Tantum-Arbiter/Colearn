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
import {
  SCENE_BACKGROUNDS,
  SCENE_BACKGROUND_TONES,
  SCENE_BACKGROUND_TONE_STOPS,
} from '@/constants/scene-backgrounds';

type SceneView = ReturnType<typeof render>;

function renderScene(props: Partial<React.ComponentProps<typeof SceneBackground>> = {}): SceneView {
  return render(<SceneBackground {...props} />);
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

      view.rerender(<SceneBackground scrimOpacity={0.6} />);

      expect(requireByTestId(view, 'scene-background-image').props.source).toBe(first);
    });
  });

  describe('how the crop is asked for', () => {
    /**
     * The artwork is 3:4 and no screen is, so something has to go. The fitting
     * is the platform's: computed here from the window size it was a render
     * behind the view's own bounds, and a tablet turned on its side showed the
     * fill behind the art for a third of a second.
     */
    it('should cover whatever it is put on rather than being sized to a screen', () => {
      const view = renderScene();

      expect(requireByTestId(view, 'scene-background-image').props.contentFit).toBe('cover');
    });

    it('should ask for no size of its own, so the view it fills decides', () => {
      const style = flatStyle(renderScene(), 'scene-background-image');

      expect(style).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
      expect(style.width).toBeUndefined();
      expect(style.height).toBeUndefined();
    });

    it('should bias the crop above centre by default, so the sky survives', () => {
      const view = renderScene();

      expect(requireByTestId(view, 'scene-background-image').props.contentPosition)
        .toEqual({ top: '42%', left: '50%' });
    });

    it.each([
      [0, '0%'],
      [0.5, '50%'],
      [1, '100%'],
    ])('should put a focalBias of %s at %s down the scene', (focalBias, expected) => {
      const view = renderScene({ focalBias });

      expect(requireByTestId(view, 'scene-background-image').props.contentPosition)
        .toEqual({ top: expected, left: '50%' });
    });
  });

  describe('the tones behind the art', () => {
    it('should stand the scene on its own colours, not a flat panel', () => {
      // A picture cannot be re-sampled in the frame a rotation resizes it; a
      // gradient is redrawn with its layer, so this is what shows through.
      const view = renderScene();

      const tones = requireByTestId(view, 'scene-background-tones');
      expect(SCENE_BACKGROUND_TONES).toContainEqual(tones.props.colors);
      expect(tones.props.locations).toEqual(SCENE_BACKGROUND_TONE_STOPS);
    });

    it('should give every scene a set of tones to stand on', () => {
      expect(SCENE_BACKGROUND_TONES).toHaveLength(SCENE_BACKGROUNDS.length);
      for (const tones of SCENE_BACKGROUND_TONES) {
        expect(tones).toHaveLength(SCENE_BACKGROUND_TONE_STOPS.length);
      }
    });

    it('should run those tones from the top of the scene to the bottom', () => {
      expect(SCENE_BACKGROUND_TONE_STOPS[0]).toBe(0);
      expect(SCENE_BACKGROUND_TONE_STOPS[SCENE_BACKGROUND_TONE_STOPS.length - 1]).toBe(1);
    });

    it('should lay the tones under the art rather than over it', () => {
      const view = renderScene();

      const order = view.UNSAFE_root
        .findAll((n: any) => typeof n.props.testID === 'string'
          && n.props.testID.startsWith('scene-background-'))
        .map((n: any) => n.props.testID);
      expect(order.indexOf('scene-background-tones'))
        .toBeLessThan(order.indexOf('scene-background-image'));
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
