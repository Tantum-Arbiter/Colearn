type SessionLapseListener = () => void;

let listener: SessionLapseListener | null = null;

/** The store registers here; the API client only knows how to report. */
export function onSessionLapse(next: SessionLapseListener | null): void {
  listener = next;
}

/** The app could not keep the family signed in: tokens are gone and a login is needed. */
export function reportSessionLapse(): void {
  listener?.();
}
