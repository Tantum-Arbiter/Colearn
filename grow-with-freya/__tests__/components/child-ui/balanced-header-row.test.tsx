/**
 * A page header with a control on each side and the title between them. The
 * two sides are kept the width of the wider control, so the title stays in the
 * middle of the screen, and never has a control drawn over it.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { BalancedHeaderRow, TITLE_SHARE } from '@/components/child-ui/balanced-header-row';

function side(tree: ReturnType<typeof render>, which: 'left' | 'right') {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === `row-${which}` && n.props.style)[0];
}

function measure(tree: ReturnType<typeof render>, which: 'left' | 'right', width: number) {
  const holder = tree.UNSAFE_root.findAll((n: any) => n.props.testID === `row-${which}-content` && n.props.onLayout)[0];

  act(() => {
    holder.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 56 } } });
  });
}

function renderRow() {
  return render(
    <BalancedHeaderRow
      testID="row"
      left={<View />}
      title={<Text>Profile</Text>}
      right={<View />}
    />
  );
}

describe('BalancedHeaderRow', () => {
  it('gives both sides the width of the wider control', () => {
    const tree = renderRow();

    measure(tree, 'left', 90);
    measure(tree, 'right', 130);

    expect(StyleSheet.flatten(side(tree, 'left').props.style).minWidth).toBe(130);
    expect(StyleSheet.flatten(side(tree, 'right').props.style).minWidth).toBe(130);
  });

  it('shares what is left equally between the sides, so the title sits in the middle', () => {
    const tree = renderRow();

    expect(StyleSheet.flatten(side(tree, 'left').props.style).flex).toBe(1);
    expect(StyleSheet.flatten(side(tree, 'right').props.style).flex).toBe(1);
  });

  it('lets a touch pass through the empty parts of the row', () => {
    const tree = renderRow();

    const row = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'row' && n.props.style)[0];

    expect(row.props.pointerEvents).toBe('box-none');
    expect(side(tree, 'left').props.pointerEvents).toBe('box-none');
  });
});

/**
 * A long word in some languages ("Dla dorosłych") must not squeeze the title
 * out: the title keeps a third of the row, and the sides are capped at what is
 * left, so a long label shrinks to fit rather than running over the title.
 */
describe('BalancedHeaderRow with long labels', () => {
  function measureRow(tree: ReturnType<typeof render>, width: number) {
    const row = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'row' && n.props.onLayout)[0];

    act(() => {
      row.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 56 } } });
    });
  }

  it('keeps a third of the row for the title however wide a control wants to be', () => {
    const tree = renderRow();
    measureRow(tree, 370);

    measure(tree, 'left', 90);
    measure(tree, 'right', 170);

    const cap = (370 - 370 * TITLE_SHARE) / 2;
    const right = StyleSheet.flatten(side(tree, 'right').props.style);
    const content = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'row-right-content' && n.props.style)[0];
    expect(right.minWidth).toBeCloseTo(cap, 6);
    expect(StyleSheet.flatten(content.props.style).maxWidth).toBeCloseTo(cap, 6);
  });

  /**
   * On a tablet the cap is narrower than a side's share of the row. Capping the
   * side itself left the spare room at the far end, pulling the speaker in from
   * the edge and the title off centre; only the control inside is capped.
   */
  it('lets the sides fill the row, so the controls sit in the corners on a wide screen', () => {
    const tree = renderRow();
    measureRow(tree, 768);

    measure(tree, 'right', 60);

    expect(StyleSheet.flatten(side(tree, 'left').props.style).maxWidth).toBeUndefined();
    expect(StyleSheet.flatten(side(tree, 'right').props.style).maxWidth).toBeUndefined();
    expect(StyleSheet.flatten(side(tree, 'right').props.style).flex).toBe(1);
  });

  it('leaves the sides as wide as the wider control when there is room', () => {
    const tree = renderRow();
    measureRow(tree, 800);

    measure(tree, 'right', 170);

    expect(StyleSheet.flatten(side(tree, 'left').props.style).minWidth).toBe(170);
  });
});
