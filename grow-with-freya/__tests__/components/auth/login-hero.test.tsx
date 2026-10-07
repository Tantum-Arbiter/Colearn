/**
 * The login hero: the dome and stars behind, a bear, a bunny and a fox each on
 * their own layer swaying about their feet, and the open book in front.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { cancelAnimation, withRepeat } from 'react-native-reanimated';
import { LoginHero } from '@/components/auth/login-hero';
import { HERO_ANIMALS, HERO_FOREGROUND, HERO_FRAMES, HERO_LOOP_MS, heroFrame } from '@/constants/login-hero';
import { HERO_ANIMAL_ART } from '@/constants/login-hero-art';

const WIDTH = 450;
const HEIGHT = 298;

function byTestId(view: ReturnType<typeof render>, testID: string) {
  return view.UNSAFE_root.findAll((node: any) => node.props.testID === testID && typeof node.type !== 'string');
}

function styleOf(node: any) {
  return StyleSheet.flatten(node.props.style) as Record<string, any>;
}

function renderHero(props: Partial<React.ComponentProps<typeof LoginHero>> = {}) {
  return render(<LoginHero width={WIDTH} height={HEIGHT} {...props} />);
}

describe('LoginHero', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is as big as it is told to be and says nothing to the screen reader', () => {
    const root = byTestId(renderHero(), 'login-hero')[0];

    expect(styleOf(root)).toMatchObject({ width: WIDTH, height: HEIGHT });
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('paints the dome behind, then each animal, then the book in front', () => {
    const order = ['login-hero-backdrop', ...HERO_ANIMALS.map((animal) => `login-hero-${animal}`), 'login-hero-foreground'];
    const view = renderHero();

    const painted = view.UNSAFE_root
      .findAll((node: any) => order.includes(node.props.testID) && typeof node.type !== 'string')
      .map((node: any) => node.props.testID)
      .filter((testID: string, index: number, all: string[]) => all.indexOf(testID) === index);

    expect(painted).toEqual(order);
  });

  it('lays the book over the whole of its measured frame', () => {
    const book = byTestId(renderHero(), 'login-hero-foreground')[0];

    expect(styleOf(book)).toMatchObject(heroFrame(HERO_FOREGROUND, WIDTH, HEIGHT));
  });

  it.each(HERO_ANIMALS)('%s sits in its frame scaled to the box and sways about its feet', (animal) => {
    const style = styleOf(byTestId(renderHero(), `login-hero-${animal}`)[0]);

    expect(style).toMatchObject(heroFrame(HERO_FRAMES[animal], WIDTH, HEIGHT));
    expect(style.transformOrigin).toBe('bottom');
  });

  it.each(HERO_ANIMALS)('%s shows its painted layer filling its frame', (animal) => {
    const art = byTestId(renderHero(), `login-hero-${animal}-art`)[0];
    const frame = heroFrame(HERO_FRAMES[animal], WIDTH, HEIGHT);

    expect(art.props.source).toBe(HERO_ANIMAL_ART[animal]);
    expect(styleOf(art)).toMatchObject({ left: 0, top: 0, width: frame.width, height: frame.height });
  });

  it('runs one clock round the loop for as long as it is on screen', () => {
    const view = renderHero();

    expect(withRepeat).toHaveBeenCalledTimes(1);
    expect(withRepeat).toHaveBeenCalledWith(HERO_LOOP_MS, -1, false);
    expect(cancelAnimation).not.toHaveBeenCalled();

    view.unmount();

    expect(cancelAnimation).toHaveBeenCalled();
  });

  it('holds every animal still, with the painted face, when motion is reduced', () => {
    renderHero({ animated: false });

    expect(withRepeat).not.toHaveBeenCalled();
    expect(cancelAnimation).toHaveBeenCalled();
  });
});
