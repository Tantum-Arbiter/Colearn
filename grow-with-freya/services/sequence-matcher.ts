/**
 * SequenceMatcher
 *
 * Simple ordered sequence matcher for music challenge note sequences.
 * MVP: exact ordered sequence match with optional tolerance for accidental repeats.
 * No timing/rhythm requirement.
 *
 * Supports chord entries using '+' notation:
 *   - Single note: "C"
 *   - Chord (two notes held simultaneously): "C+E"
 *   - Chord (three notes): "C+E+G"
 *
 * Use processChord(activeNotes) for chord-aware matching, or processNote(note)
 * for backward-compatible single-note matching.
 */

export type SequenceMatchResult = {
  isComplete: boolean;
  currentIndex: number; // How far through the sequence the child is
  totalNotes: number;
  lastInputCorrect: boolean;
  progress: number; // 0-1 progress ratio
};

/**
 * Parse a sequence entry into its constituent notes.
 * "C" → ["C"], "C+E" → ["C", "E"], "C+E+G" → ["C", "E", "G"]
 */
export function parseChordEntry(entry: string): string[] {
  return entry.split('+').map(n => n.trim()).filter(Boolean);
}

/**
 * Check if a sequence entry is a chord (more than one note).
 */
export function isChordEntry(entry: string): boolean {
  return entry.includes('+');
}

export class SequenceMatcher {
  private requiredSequence: string[];
  private currentIndex: number = 0;
  private tolerateRepeats: boolean;

  constructor(requiredSequence: string[], tolerateRepeats: boolean = true) {
    this.requiredSequence = [...requiredSequence];
    this.tolerateRepeats = tolerateRepeats;
  }

  /**
   * Process a single note input from the child.
   * For single-note entries this works directly; for chord entries use processChord().
   */
  processNote(note: string): SequenceMatchResult {
    if (this.isComplete()) {
      return this.getResult(true);
    }

    const expectedNote = this.requiredSequence[this.currentIndex];

    if (note === expectedNote) {
      // Correct note — advance
      this.currentIndex++;
      return this.getResult(true);
    }

    // Wrong note
    if (this.tolerateRepeats && this.currentIndex > 0) {
      // If the child accidentally repeats the previous correct note, tolerate it
      const previousNote = this.requiredSequence[this.currentIndex - 1];
      if (note === previousNote) {
        // Tolerated repeat — don't advance but don't reset either
        return this.getResult(true);
      }
    }

    // Incorrect note — reset sequence
    this.currentIndex = 0;
    return this.getResult(false);
  }

  /**
   * Process a chord (set of simultaneously held notes) against the current entry.
   * For chord entries like "C+E", all required notes must be present in activeNotes.
   * Extra held notes beyond those required are tolerated (partial superset is OK).
   *
   * Call this when the set of held notes changes. It only advances once per entry.
   */
  processChord(activeNotes: Set<string>): SequenceMatchResult {
    if (this.isComplete()) {
      return this.getResult(true);
    }

    const expected = this.requiredSequence[this.currentIndex];
    const expectedNotes = parseChordEntry(expected);

    // Check if ALL expected notes are held
    const allHeld = expectedNotes.every(n => activeNotes.has(n));

    if (allHeld) {
      this.currentIndex++;
      return this.getResult(true);
    }

    // Not all chord notes held yet — don't reset, just wait.
    // Only reset if the user has pressed a note that is clearly wrong
    // (i.e., not part of the expected chord and not part of the previous entry).
    return this.getResult(true); // patient — wait for the full chord
  }

  /**
   * Check if the sequence is complete.
   */
  isComplete(): boolean {
    return this.currentIndex >= this.requiredSequence.length;
  }

  /**
   * Get current progress.
   */
  getProgress(): number {
    if (this.requiredSequence.length === 0) return 1;
    return this.currentIndex / this.requiredSequence.length;
  }

  /**
   * Get current index (how many notes have been correctly played).
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Get the next expected note (or null if complete).
   */
  getNextExpectedNote(): string | null {
    if (this.isComplete()) return null;
    return this.requiredSequence[this.currentIndex];
  }

  /**
   * Get the full required sequence.
   */
  getRequiredSequence(): string[] {
    return [...this.requiredSequence];
  }

  /**
   * Reset the matcher to start over.
   */
  reset(): void {
    this.currentIndex = 0;
  }

  private getResult(lastInputCorrect: boolean): SequenceMatchResult {
    return {
      isComplete: this.isComplete(),
      currentIndex: this.currentIndex,
      totalNotes: this.requiredSequence.length,
      lastInputCorrect,
      progress: this.getProgress(),
    };
  }
}
