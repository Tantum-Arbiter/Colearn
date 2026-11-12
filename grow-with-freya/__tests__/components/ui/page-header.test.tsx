/**
 * The shared header's title block spans the whole width above the page, so a
 * page with no title in the header must not get an empty one lying over
 * whatever sits at its top.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PageHeader } from '@/components/ui/page-header';
import { HEADING_HALO } from '@/components/child-ui/heading-halo';

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

/**
 * Every page below the home page hangs the painted planet behind its header,
 * so the shared header's title sits in the same night-sky halo as the
 * library's and the badge wall's (operator, 2026-10-03).
 */
describe('PageHeader over the painted planet', () => {
  it('should set its title and subtitle in a heading halo, drawn behind them', () => {
    const view = render(<PageHeader title="Song Library" subtitle="Pick a tune" onBack={jest.fn()} />);

    const block = titleBlocks(view)[0];
    const halo = block.findAll((node: any) => node.props.testID === 'page-header-title-halo' && node.props.spread)[0];
    const order = block
      .findAll((node: any) => node.props.testID === 'page-header-title-halo' || node.props.children === 'Song Library')
      .map((node: any) => (node.props.testID === 'page-header-title-halo' ? 'halo' : 'title'))
      .filter((name: string, index: number, all: string[]) => all.indexOf(name) === index);

    expect(halo.props.spread).toEqual(HEADING_HALO.header);
    expect(order).toEqual(['halo', 'title']);
  });

  it('should lay no halo when it has no title block', () => {
    const view = render(<PageHeader title="" onBack={jest.fn()} />);

    expect(view.UNSAFE_root.findAll((node: any) => node.props.testID === 'page-header-title-halo')).toHaveLength(0);
  });
});
