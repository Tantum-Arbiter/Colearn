/**
 * Tests for the trial-eligibility hook.
 *
 * The paywall's button changes what it offers based on this: a parent who has
 * never had the trial is offered one, and a parent who has used it and
 * cancelled is offered the plans instead. Getting that backwards either hides
 * the trial from someone entitled to it, or promises a free period the store
 * will refuse -- so the default while the answer is still in flight, and the
 * default when the check fails, are both "eligible". Being offered a trial you
 * cannot have is a recoverable disappointment; being denied one you can have
 * is a lost customer.
 */

import { renderHook, waitFor } from '@testing-library/react-native';

import { useTrialEligibility } from '@/hooks/use-trial-eligibility';
import { isTrialAvailable } from '@/services/subscription-service';

jest.mock('@/services/subscription-service', () => ({
  isTrialAvailable: jest.fn(),
}));

const mockIsTrialAvailable = isTrialAvailable as jest.MockedFunction<typeof isTrialAvailable>;

describe('useTrialEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('assumes the trial is available until the store says otherwise', () => {
    mockIsTrialAvailable.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTrialEligibility());

    expect(result.current).toBe(true);
  });

  it('reports the trial spent once the store says so', async () => {
    mockIsTrialAvailable.mockResolvedValue(false);

    const { result } = renderHook(() => useTrialEligibility());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('keeps offering the trial when the check fails', async () => {
    mockIsTrialAvailable.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useTrialEligibility());

    await waitFor(() => expect(mockIsTrialAvailable).toHaveBeenCalled());
    expect(result.current).toBe(true);
  });
});
