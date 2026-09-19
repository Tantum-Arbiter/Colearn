/**
 * The shared header's title block spans the whole width above the page, so a
 * page with no title in the header must not get an empty one lying over
 * whatever sits at its top.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PageHeader } from '@/components/ui/page-header';

function titleBlocks(view: ReturnType<typeof render>) {
  return view.UNSAFE_root.findAll((node: any) => node.props.testID === 'page-header-title' && typeof node.type !== 'string');
}

describe('PageHeader', () => {
  it('shows its title', () => {
    const view = render(<PageHeader title="Screen Time" onBack={jest.fn()} />);

    expect(titleBlocks(view)).toHaveLength(1);
    expect(view.UNSAFE_root.findAll((node: any) => node.props.children === 'Screen Time').length).toBeGreaterThan(0);
  });

  it('lays no title block over the page when it has no title', () => {
    const view = render(<PageHeader title="" onBack={jest.fn()} />);

    expect(titleBlocks(view)).toHaveLength(0);
  });

  it('still shows a subtitle without a title', () => {
    const view = render(<PageHeader title="" subtitle="Settings" onBack={jest.fn()} />);

    expect(titleBlocks(view)).toHaveLength(1);
  });

  it('lets touches through the gap between its buttons to the page beneath', () => {
    const view = render(<PageHeader title="" onBack={jest.fn()} />);

    const row = view.UNSAFE_root.findAll((node: any) => node.props.testID === 'page-header-row' && typeof node.type !== 'string');

    expect(row).toHaveLength(1);
    expect(row[0].props.pointerEvents).toBe('box-none');
  });
});
