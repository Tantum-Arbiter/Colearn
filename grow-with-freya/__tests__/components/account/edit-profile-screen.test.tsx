/**
 * Editing a profile reuses the onboarding profile page, so these cover the
 * wiring around it: seeding from the store, the same nickname rule as
 * onboarding, and what a save writes.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EditProfileContent } from '@/components/account/edit-profile-screen';
import { AVATAR_OPTIONS } from '@/components/onboarding/onboarding-pages';
import { MIN_NICKNAME_LENGTH } from '@/constants/profile';

const mockSetUserProfile = jest.fn();
const mockSetChildAge = jest.fn();
const mockQueueProfileSave = jest.fn();

let mockStore: Record<string, unknown>;

jest.mock('@/store/app-store', () => ({
  useAppStore: () => mockStore,
}));

jest.mock('../../../services/background-save-service', () => ({
  backgroundSaveService: {
    queueProfileSave: (...args: unknown[]) => mockQueueProfileSave(...args),
  },
}));

jest.mock('@/components/ui/star-background', () => ({
  StarBackground: () => null,
}));

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function saveButton(tree: ReturnType<typeof render>) {
  return findByTestId(tree, 'profile-save').pop()!;
}

function isSaveDisabled(tree: ReturnType<typeof render>) {
  const btn = saveButton(tree);
  return btn.props.disabled === true || btn.props['aria-disabled'] === true;
}

describe('EditProfileContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore = {
      userNickname: 'Ava',
      userAvatarType: 'girl',
      userAvatarId: 'fox',
      childAgeInMonths: 36,
      isGuestMode: false,
      setUserProfile: mockSetUserProfile,
      setChildAge: mockSetChildAge,
    };
  });

  it('renders the onboarding profile controls rather than a bespoke form', () => {
    const tree = render(<EditProfileContent />);

    AVATAR_OPTIONS.forEach((option) => {
      expect(findByTestId(tree, `avatar-option-${option.key}`).length).toBeGreaterThan(0);
    });
    expect(findByTestId(tree, 'profile-nickname-input').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'age-select').length).toBeGreaterThan(0);
  });

  it('seeds the fields from the stored profile', () => {
    const tree = render(<EditProfileContent />);

    expect(findByTestId(tree, 'profile-nickname-input')[0].props.value).toBe('Ava');
  });

  it('applies the same nickname rule as onboarding', () => {
    const tree = render(<EditProfileContent />);
    const input = findByTestId(tree, 'profile-nickname-input')[0];

    fireEvent.changeText(input, 'a'.repeat(MIN_NICKNAME_LENGTH - 1));
    expect(isSaveDisabled(tree)).toBe(true);

    fireEvent.changeText(input, '   ');
    expect(isSaveDisabled(tree)).toBe(true);

    fireEvent.changeText(input, 'Sam');
    expect(isSaveDisabled(tree)).toBe(false);
  });

  it('writes the nickname, avatar and age on save', () => {
    const onSaveComplete = jest.fn();
    const tree = render(<EditProfileContent onSaveComplete={onSaveComplete} />);

    fireEvent.changeText(findByTestId(tree, 'profile-nickname-input')[0], 'Sam');
    fireEvent.press(findByTestId(tree, 'avatar-option-dino')[0]);
    fireEvent.press(saveButton(tree));

    expect(mockSetUserProfile).toHaveBeenCalledWith('Sam', 'girl', 'dino');
    expect(mockSetChildAge).toHaveBeenCalledWith(36);
    expect(onSaveComplete).toHaveBeenCalled();
  });

  it('queues a background save for signed-in users', () => {
    const tree = render(<EditProfileContent />);

    fireEvent.press(saveButton(tree));

    expect(mockQueueProfileSave).toHaveBeenCalledWith({
      nickname: 'Ava',
      avatarType: 'girl',
      avatarId: 'fox',
    });
  });

  it('does not queue a background save in guest mode', () => {
    mockStore.isGuestMode = true;
    const tree = render(<EditProfileContent />);

    fireEvent.press(saveButton(tree));

    expect(mockSetUserProfile).toHaveBeenCalled();
    expect(mockQueueProfileSave).not.toHaveBeenCalled();
  });

  it('falls back to the first animal for a profile saved before the animal avatars', () => {
    mockStore.userAvatarId = 'girl_1';
    const tree = render(<EditProfileContent />);

    fireEvent.press(saveButton(tree));

    expect(mockSetUserProfile).toHaveBeenCalledWith('Ava', 'girl', AVATAR_OPTIONS[0].key);
  });
});
