import { onSessionLapse, reportSessionLapse } from '@/services/session-lapse';

describe('the session lapse channel', () => {
  afterEach(() => {
    onSessionLapse(null);
  });

  it('should do nothing when nobody is listening', () => {
    expect(() => reportSessionLapse()).not.toThrow();
  });

  it('should tell whoever is listening, each time', () => {
    const listener = jest.fn();
    onSessionLapse(listener);

    reportSessionLapse();
    reportSessionLapse();

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
