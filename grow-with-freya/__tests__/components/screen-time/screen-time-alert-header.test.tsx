/**
 * Tests for the alert header that leads the screen-time glance once the
 * day's limit is spent.
 *
 * The one behaviour worth pinning down is the usage figure: it is emphasised
 * in red, which means the sentence has to be broken around it, and it must
 * stay a single translatable sentence rather than three fragments glued
 * together in English word order.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

import { ScreenTimeAlertHeader } from '@/components/screen-time/screen-time-alert-header';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function renderHeader(props: Partial<React.ComponentProps<typeof ScreenTimeAlertHeader>> = {}) {
  return render(
    <ScreenTimeAlertHeader usageSeconds={3600} limitSeconds={3600} {...props} />
  );
}

describe('ScreenTimeAlertHeader', () => {
  it('renders the badge, title, usage line and break line', () => {
    const tree = renderHeader();

    for (const id of [
      'screen-time-alert-header',
      'screen-time-alert-badge',
      'screen-time-alert-title',
      'screen-time-alert-usage',
      'screen-time-alert-break',
    ]) {
      expect(findByTestId(tree, id).length).toBeGreaterThan(0);
    }
  });

  it('takes its copy from translation keys rather than hardcoded strings', () => {
    const tree = renderHeader();
    const json = JSON.stringify(tree.toJSON());

    expect(json).toContain('screenTime.alert.title');
    expect(json).toContain('screenTime.alert.usage');
    expect(json).toContain('screenTime.alert.break');
  });

  it('hands the sentence the formatted usage and limit to interpolate', () => {
    const tree = renderHeader({ usageSeconds: 840, limitSeconds: 3600 });
    const json = JSON.stringify(tree.toJSON());

    expect(json).toContain('used:');
    expect(json).toContain('limit:1h');
  });

  it('emphasises the figure as its own span inside the usage line', () => {
    const tree = renderHeader({ usageSeconds: 840, limitSeconds: 3600 });
    const json = JSON.stringify(tree.toJSON());

    // the figure is lifted into a span of its own so it can carry the red,
    // but the words either side still come from the one translated string,
    // in whatever order that translation put them
    expect(json).toContain('screenTime.alert.usage (used:');
    expect(json).toContain('["14m"]');
    expect(json).toContain(', limit:1h)');
  });

  it('still renders the whole sentence when a locale drops the placeholder', () => {
    // splitting on the interpolated value is what lets a translation put the
    // figure wherever it belongs -- but a locale that lost {{used}} entirely
    // must degrade to an unemphasised sentence, not a blank line
    const i18n = require('react-i18next');
    const spy = jest
      .spyOn(i18n, 'useTranslation')
      .mockReturnValue({ t: () => 'Bildschirmzeit ist aufgebraucht.' } as any);

    try {
      const tree = renderHeader({ usageSeconds: 840, limitSeconds: 3600 });
      const json = JSON.stringify(tree.toJSON());

      expect(json).toContain('Bildschirmzeit ist aufgebraucht.');
      // and no orphaned figure left dangling beside it
      expect(json).not.toContain('["14m"]');
    } finally {
      spy.mockRestore();
    }
  });
});
