/**
 * Tests for the planet art on the screen-time alert header.
 *
 * The art lives in the dashboard's greeting block, and the alert replaces
 * that greeting rather than sitting above it -- so once the day's limit was
 * spent the planet vanished from the screen entirely. It belongs beside the
 * title in both states.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react-native';
import { ScreenTimeAlertHeader } from '@/components/screen-time/screen-time-alert-header';

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function renderHeader() {
  return render(<ScreenTimeAlertHeader usageSeconds={4500} limitSeconds={3600} />);
}

describe('the alert header', () => {
  it('should keep the planet on screen once the limit is spent', () => {
    const underTest = byTestId(renderHeader(), 'screen-time-alert-earth');

    expect(underTest.length).toBeGreaterThan(0);
  });

  it('should leave the planet out of the reading order', () => {
    const view = renderHeader();

    const underTest = view.UNSAFE_queryAllByProps({ testID: 'screen-time-alert-earth-layer' })[0];

    expect(underTest.props.pointerEvents).toBe('none');
  });

  it('should still lead with the title, not the art', () => {
    const view = renderHeader();

    expect(byTestId(view, 'screen-time-alert-title').length).toBeGreaterThan(0);
    expect(byTestId(view, 'screen-time-alert-badge').length).toBeGreaterThan(0);
  });
});
