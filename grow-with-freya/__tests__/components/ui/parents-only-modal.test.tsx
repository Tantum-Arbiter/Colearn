/**
 * Tests for the parents-only gate.
 *
 * Two challenge variants share one card. The maths variant is fronted by the
 * owl tutor and writes on a chalkboard; the animal variant puts a painted
 * animal in a starry orb and writes in a neon field. Whichever is showing, the card must
 * stay closable and must only let a correct answer through.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react-native';
import { ParentsOnlyModal } from '@/components/ui/parents-only-modal';
import type { ParentChallenge } from '@/hooks/use-parents-only-challenge';

const MATH_CHALLENGE: ParentChallenge = {
  type: 'math',
  num1: 7,
  num2: 8,
  operation: '+',
  answer: 15,
};

// A source of its own: every real image import collapses to one shared mock
// object, so only a fixture-supplied value can prove the art was passed through.
const CAMEL_ART = { uri: 'test://camel' } as unknown as number;

const ANIMAL_CHALLENGE: ParentChallenge = {
  type: 'emoji',
  art: CAMEL_ART,
  word: 'camel',
};

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function renderGate(props: Partial<React.ComponentProps<typeof ParentsOnlyModal>> = {}) {
  return render(
    <ParentsOnlyModal
      visible
      challenge={MATH_CHALLENGE}
      inputValue=""
      onInputChange={jest.fn()}
      onSubmit={jest.fn()}
      onClose={jest.fn()}
      isInputValid={false}
      {...props}
    />
  );
}

describe('ParentsOnlyModal', () => {
  it('should render nothing while it is not visible', () => {
    const view = renderGate({ visible: false });

    expect(byTestId(view, 'parents-only-modal')).toHaveLength(0);
  });

  it('should front the maths challenge with the owl tutor and a chalkboard', () => {
    const view = renderGate({ challenge: MATH_CHALLENGE });

    expect(byTestId(view, 'parents-only-owl').length).toBeGreaterThan(0);
    expect(byTestId(view, 'parents-only-chalkboard').length).toBeGreaterThan(0);
  });

  it('should let the owl art stand in for the orb it already carries', () => {
    const maths = renderGate({ challenge: MATH_CHALLENGE });
    const animal = renderGate({ challenge: ANIMAL_CHALLENGE });

    // The owl is drawn on its own moon, so stacking our orb behind it would
    // double the disc up; the animal still needs one.
    expect(byTestId(maths, 'parents-only-orb')).toHaveLength(0);
    expect(byTestId(animal, 'parents-only-orb').length).toBeGreaterThan(0);
  });

  it('should show the sum the parent has to solve', () => {
    const view = renderGate({ challenge: MATH_CHALLENGE });

    const sum = byTestId(view, 'parents-only-sum')[0];

    expect([sum.props.children].flat(Infinity).join('')).toBe('7 + 8 = ?');
  });

  it('should put the animal in the orb rather than behind the owl', () => {
    const view = renderGate({ challenge: ANIMAL_CHALLENGE });

    expect(byTestId(view, 'parents-only-orb').length).toBeGreaterThan(0);
    expect(byTestId(view, 'parents-only-owl')).toHaveLength(0);
    expect(byTestId(view, 'parents-only-chalkboard')).toHaveLength(0);
  });

  it('should show the painted animal the challenge names', () => {
    const view = renderGate({ challenge: ANIMAL_CHALLENGE });

    const sources = byTestId(view, 'parents-only-animal')
      .map((node) => node.props.source)
      .filter(Boolean);

    expect(sources).toContain(CAMEL_ART);
  });

  it('should send the parent to a number pad for maths and a keyboard for animals', () => {
    const maths = renderGate({ challenge: MATH_CHALLENGE });
    const animal = renderGate({ challenge: ANIMAL_CHALLENGE });

    expect(byTestId(maths, 'parents-only-input')[0].props.keyboardType).toBe('number-pad');
    expect(byTestId(animal, 'parents-only-input')[0].props.keyboardType).toBe('default');
  });

  it.each([
    ['maths', MATH_CHALLENGE],
    ['animal', ANIMAL_CHALLENGE],
  ])('should keep the %s challenge closable', (_label, challenge) => {
    const onClose = jest.fn();
    const view = renderGate({ challenge, onClose });

    byTestId(view, 'parents-only-close')[0].props.onPress();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['maths', MATH_CHALLENGE],
    ['animal', ANIMAL_CHALLENGE],
  ])('should hold the %s challenge shut until the answer is right', (_label, challenge) => {
    const onSubmit = jest.fn();
    const view = renderGate({ challenge, onSubmit, isInputValid: false });

    expect(byTestId(view, 'parents-only-submit')[0].props.disabled).toBe(true);

    view.rerender(
      <ParentsOnlyModal
        visible
        challenge={challenge}
        inputValue="15"
        onInputChange={jest.fn()}
        onSubmit={onSubmit}
        onClose={jest.fn()}
        isInputValid
      />
    );

    const submit = byTestId(view, 'parents-only-submit')[0];
    expect(submit.props.disabled).toBe(false);

    submit.props.onPress();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('should hang the close button from the top right, not the left', () => {
    const view = renderGate({ challenge: MATH_CHALLENGE });

    const style = [byTestId(view, 'parents-only-close')[0].props.style]
      .flat(Infinity)
      .filter(Boolean)
      .reduce((merged: any, part: any) => ({ ...merged, ...part }), {});

    expect(style.right).toBe(10);
    expect(style.left).toBeUndefined();
  });

  it('should bank cloud along the foot of the card', () => {
    const view = renderGate({ challenge: MATH_CHALLENGE });

    // A drawn pair, one bank per corner.
    expect(byTestId(view, 'parents-only-clouds-left').length).toBeGreaterThan(0);
    expect(byTestId(view, 'parents-only-clouds-right').length).toBeGreaterThan(0);
  });

  it('should scale its type when the accessibility scale is turned up', () => {
    // Compared against the unscaled render rather than a hardcoded number, so
    // resizing the chalk hand cannot quietly turn this into a passing no-op.
    const inputFontSize = (scale: number) => {
      const view = renderGate({
        challenge: MATH_CHALLENGE,
        scaledFontSize: (size) => size * scale,
      });
      const styles = [byTestId(view, 'parents-only-input')[0].props.style]
        .flat(Infinity)
        .filter(Boolean) as { fontSize?: number }[];
      return styles.map((style) => style.fontSize).filter(Boolean).at(-1);
    };

    const plain = inputFontSize(1);

    expect(plain).toBeGreaterThan(0);
    expect(inputFontSize(2)).toBe(plain! * 2);
  });
});
