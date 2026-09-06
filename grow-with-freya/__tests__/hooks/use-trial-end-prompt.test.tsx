/**
 * Tests for the hook that decides when the end-of-trial upgrade offer is owed.
 *
 * The offer interrupts a parent, so it has to be right twice: it must appear
 * inside the warning window before the first charge, and it must stay gone
 * once they have answered it.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useTrialEndPrompt } from '@/hooks/use-trial-end-prompt';
import { getTrialStatus } from '@/services/subscription-service';
import { useAppStore } from '@/store/app-store';
import type { TrialStatus } from '@/constants/trial-end';

jest.mock('@/services/subscription-service', () => ({
  getTrialStatus: jest.fn(),
}));

const mockGetTrialStatus = getTrialStatus as jest.MockedFunction<typeof getTrialStatus>;

const markSeen = jest.fn();
let storeState: Record<string, unknown>;

jest.mock('@/store/app-store', () => ({
  useAppStore: jest.fn(),
}));

const mockUseAppStore = useAppStore as unknown as jest.Mock;

function trialStatus(overrides: Partial<TrialStatus> = {}): TrialStatus {
  return {
    inTrial: true,
    daysRemaining: 0,
    endsAt: new Date('2026-09-08T09:00:00.000Z'),
    billingTier: 'basic',
    ...overrides,
  };
}

describe('useTrialEndPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storeState = {
      trialEndPromptSeenFor: null,
      setTrialEndPromptSeenFor: markSeen,
      subscriptionTier: 'basic',
      _devSubscriptionOverride: null,
    };
    mockUseAppStore.mockImplementation((selector: (s: unknown) => unknown) => selector(storeState));
    mockGetTrialStatus.mockResolvedValue(trialStatus());
  });

  it('stays hidden while the store is still being asked', () => {
    mockGetTrialStatus.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTrialEndPrompt());

    expect(result.current.visible).toBe(false);
  });

  it('offers the upgrade on the trial’s last day', async () => {
    const { result } = renderHook(() => useTrialEndPrompt());

    await waitFor(() => expect(result.current.visible).toBe(true));
  });

  it('stays hidden earlier in the trial', async () => {
    mockGetTrialStatus.mockResolvedValue(trialStatus({ daysRemaining: 2 }));

    const { result } = renderHook(() => useTrialEndPrompt());

    await waitFor(() => expect(result.current.status).not.toBeNull());
    expect(result.current.visible).toBe(false);
  });

  it('stays hidden once this trial has been answered', async () => {
    storeState.trialEndPromptSeenFor = '2026-09-08';

    const { result } = renderHook(() => useTrialEndPrompt());

    await waitFor(() => expect(result.current.status).not.toBeNull());
    expect(result.current.visible).toBe(false);
  });

  it('remembers the trial the parent answered', async () => {
    const { result } = renderHook(() => useTrialEndPrompt());
    await waitFor(() => expect(result.current.visible).toBe(true));

    act(() => result.current.dismiss());

    expect(markSeen).toHaveBeenCalledWith('2026-09-08');
  });

  it('remembers nothing when there is no trial to remember', async () => {
    mockGetTrialStatus.mockResolvedValue(trialStatus({ inTrial: false, endsAt: null }));
    const { result } = renderHook(() => useTrialEndPrompt());
    await waitFor(() => expect(result.current.status).not.toBeNull());

    act(() => result.current.dismiss());

    expect(markSeen).not.toHaveBeenCalled();
  });

  it('asks the store again when the tier moves', async () => {
    const { rerender } = renderHook(() => useTrialEndPrompt());
    await waitFor(() => expect(mockGetTrialStatus).toHaveBeenCalledTimes(1));

    storeState.subscriptionTier = 'premium';
    rerender(undefined);

    await waitFor(() => expect(mockGetTrialStatus).toHaveBeenCalledTimes(2));
  });

  it('survives the store refusing to answer', async () => {
    mockGetTrialStatus.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useTrialEndPrompt());

    await waitFor(() => expect(result.current.visible).toBe(false));
  });
});
