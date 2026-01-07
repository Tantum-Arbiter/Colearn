import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LoadingOverlay } from '@/components/auth/loading-overlay';

describe('LoadingOverlay', () => {
  it('renders authenticating phase', () => {
    const { toJSON } = render(<LoadingOverlay phase="authenticating" />);
    const tree = toJSON();
    expect(tree).toBeTruthy();
  });

  it('renders syncing phase', () => {
    const { toJSON } = render(<LoadingOverlay phase="syncing" />);
    const tree = toJSON();
    expect(tree).toBeTruthy();
  });

  it('renders auth error phase', () => {
    const { toJSON } = render(<LoadingOverlay phase="auth-error" />);
    const tree = toJSON();
    expect(tree).toBeTruthy();
  });

  it('renders sync error phase with offline message', () => {
    const { toJSON } = render(<LoadingOverlay phase="sync-error" />);
    const tree = toJSON();
    expect(tree).toBeTruthy();
  });

  it('renders null phase (completion)', () => {
    const mockCallback = jest.fn();
    const { toJSON } = render(<LoadingOverlay phase={null} onPulseComplete={mockCallback} />);
    const tree = toJSON();
    expect(tree).toBeTruthy();
  });

  it('renders without crashing for all phases', () => {
    const phases: Array<'authenticating' | 'syncing' | 'auth-error' | 'sync-error' | null> = [
      'authenticating',
      'syncing',
      null,
      'auth-error',
      'sync-error',
    ];

    phases.forEach((phase) => {
      const { toJSON } = render(<LoadingOverlay phase={phase} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});

