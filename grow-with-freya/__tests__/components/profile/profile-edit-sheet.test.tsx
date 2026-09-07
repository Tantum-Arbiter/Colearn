/**
 * The edit page, risen over the profile rather than reached through the
 * grown-ups' area. It hosts exactly the content onboarding uses, so a name,
 * avatar or age changed here behaves as it did the first time.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ProfileEditSheet, PROFILE_EDIT_SHEET_EXIT_MS } from '@/components/profile/profile-edit-sheet';

const mockContent = jest.fn();
jest.mock('@/components/account/edit-profile-screen', () => {
  const { View } = jest.requireActual('react-native');
  return {
    EditProfileContent: (props: { onSaveComplete?: () => void }) => {
      mockContent(props);
      return <View testID="edit-profile-content" />;
    },
  };
});

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('ProfileEditSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing while closed', () => {
    const underTest = render(<ProfileEditSheet visible={false} onClose={jest.fn()} />);

    expect(byTestId(underTest, 'profile-edit-sheet')).toHaveLength(0);
    expect(mockContent).not.toHaveBeenCalled();
  });

  it('hosts the same edit content onboarding uses', () => {
    const underTest = render(<ProfileEditSheet visible onClose={jest.fn()} />);

    expect(byTestId(underTest, 'profile-edit-sheet').length).toBeGreaterThan(0);
    expect(byTestId(underTest, 'edit-profile-content').length).toBeGreaterThan(0);
  });

  it('titles itself as editing the profile', () => {
    const underTest = render(<ProfileEditSheet visible onClose={jest.fn()} />);

    const texts = underTest.UNSAFE_root
      .findAll((n: any) => typeof n.props.children === 'string')
      .map((n: any) => n.props.children);

    expect(texts).toContain('profile.editTitle');
  });

  it('closes from its own close control', () => {
    const onClose = jest.fn();
    const underTest = render(<ProfileEditSheet visible onClose={onClose} />);

    fireEvent.press(byTestId(underTest, 'profile-edit-close')[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes once a save completes', () => {
    const onClose = jest.fn();
    render(<ProfileEditSheet visible onClose={onClose} />);

    mockContent.mock.calls[0][0].onSaveComplete?.();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is tapped', () => {
    const onClose = jest.fn();
    const underTest = render(<ProfileEditSheet visible onClose={onClose} />);

    fireEvent.press(byTestId(underTest, 'profile-edit-backdrop')[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/**
 * The sheet leaves the way it came: it slides back down out of view, and
 * only once it has gone is it taken off the screen. Unmounting on the same
 * frame the close is pressed would snap it away mid-slide.
 */
describe('leaving', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('stays on screen while it slides down, then goes', () => {
    const underTest = render(<ProfileEditSheet visible onClose={jest.fn()} />);

    underTest.rerender(<ProfileEditSheet visible={false} onClose={jest.fn()} />);

    expect(byTestId(underTest, 'profile-edit-sheet').length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(PROFILE_EDIT_SHEET_EXIT_MS);
    });

    expect(byTestId(underTest, 'profile-edit-sheet')).toHaveLength(0);
  });

  it('takes no taps while it is on its way out', () => {
    const underTest = render(<ProfileEditSheet visible onClose={jest.fn()} />);

    underTest.rerender(<ProfileEditSheet visible={false} onClose={jest.fn()} />);

    expect(byTestId(underTest, 'profile-edit-sheet')[0].props.pointerEvents).toBe('none');
  });

  it('comes straight back if reopened before it has gone', () => {
    const underTest = render(<ProfileEditSheet visible onClose={jest.fn()} />);
    underTest.rerender(<ProfileEditSheet visible={false} onClose={jest.fn()} />);

    underTest.rerender(<ProfileEditSheet visible onClose={jest.fn()} />);
    act(() => {
      jest.advanceTimersByTime(PROFILE_EDIT_SHEET_EXIT_MS * 2);
    });

    expect(byTestId(underTest, 'profile-edit-sheet').length).toBeGreaterThan(0);
    expect(byTestId(underTest, 'profile-edit-sheet')[0].props.pointerEvents).not.toBe('none');
  });
});
