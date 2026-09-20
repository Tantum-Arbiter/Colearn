/**
 * The app listens for the seeding link both ways: one that started it, and one
 * that arrives while it is running. In a shipped build it listens for neither.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { useE2eLinks } from '@/hooks/use-e2e-links';
import { applyE2eState } from '@/services/e2e-state';

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('@/services/e2e-state', () => ({
  ...jest.requireActual('@/services/e2e-state'),
  applyE2eState: jest.fn().mockResolvedValue(undefined),
}));

describe('useE2eLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
  });

  it('seeds from the link the app was started with', async () => {
    (Linking.getInitialURL as jest.Mock).mockResolvedValue('growwithfreya://?e2e=1&onboarded=1&tutorials=done');

    renderHook(() => useE2eLinks(true));

    await waitFor(() => expect(applyE2eState).toHaveBeenCalledWith({ onboarded: true, tutorials: 'done' }, true));
  });

  it('seeds again from a link that arrives while it is running', async () => {
    renderHook(() => useE2eLinks(true));
    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalledWith('url', expect.any(Function)));

    const notify = (Linking.addEventListener as jest.Mock).mock.calls[0][1];
    await act(async () => {
      notify({ url: 'growwithfreya://?e2e=1&language=de' });
    });

    expect(applyE2eState).toHaveBeenCalledWith({ language: 'de' }, true);
  });

  it('ignores a link that is not a seeding link', async () => {
    (Linking.getInitialURL as jest.Mock).mockResolvedValue('growwithfreya://stories/wombat');

    renderHook(() => useE2eLinks(true));
    await waitFor(() => expect(Linking.getInitialURL).toHaveBeenCalled());

    expect(applyE2eState).not.toHaveBeenCalled();
  });

  it('does not even listen in a shipped build', async () => {
    (Linking.getInitialURL as jest.Mock).mockResolvedValue('growwithfreya://?e2e=1&reset=1');

    renderHook(() => useE2eLinks(false));

    await waitFor(() => expect(Linking.addEventListener).not.toHaveBeenCalled());
    expect(Linking.getInitialURL).not.toHaveBeenCalled();
    expect(applyE2eState).not.toHaveBeenCalled();
  });

  it('stops listening when the app tears the tree down', async () => {
    const remove = jest.fn();
    (Linking.addEventListener as jest.Mock).mockReturnValue({ remove });

    const view = renderHook(() => useE2eLinks(true));
    await waitFor(() => expect(Linking.addEventListener).toHaveBeenCalled());
    view.unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
