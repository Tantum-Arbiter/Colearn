import { SequenceMatcher } from '@/services/sequence-matcher';

describe('SequenceMatcher', () => {
  describe('constructor and initial state', () => {
    it('should start with currentIndex 0', () => {
      const matcher = new SequenceMatcher(['C', 'D', 'E']);
      expect(matcher.getCurrentIndex()).toBe(0);
      expect(matcher.isComplete()).toBe(false);
      expect(matcher.getProgress()).toBe(0);
    });

    it('should copy the required sequence (no mutation)', () => {
      const original = ['C', 'D'];
      const matcher = new SequenceMatcher(original);
      original.push('E');
      expect(matcher.getRequiredSequence()).toEqual(['C', 'D']);
    });

    it('should report an empty sequence as immediately complete', () => {
      const matcher = new SequenceMatcher([]);
      expect(matcher.isComplete()).toBe(true);
      expect(matcher.getProgress()).toBe(1);
      expect(matcher.getNextExpectedNote()).toBeNull();
    });
  });

  describe('correct sequence playback', () => {
    it('should advance on each correct note', () => {
      const matcher = new SequenceMatcher(['C', 'D', 'E', 'C']);

      const r1 = matcher.processNote('C');
      expect(r1.lastInputCorrect).toBe(true);
      expect(r1.currentIndex).toBe(1);
      expect(r1.isComplete).toBe(false);
      expect(r1.progress).toBe(0.25);

      const r2 = matcher.processNote('D');
      expect(r2.lastInputCorrect).toBe(true);
      expect(r2.currentIndex).toBe(2);
      expect(r2.progress).toBe(0.5);

      const r3 = matcher.processNote('E');
      expect(r3.lastInputCorrect).toBe(true);
      expect(r3.currentIndex).toBe(3);
      expect(r3.progress).toBe(0.75);

      const r4 = matcher.processNote('C');
      expect(r4.lastInputCorrect).toBe(true);
      expect(r4.isComplete).toBe(true);
      expect(r4.progress).toBe(1);
      expect(r4.totalNotes).toBe(4);
    });

    it('should handle a single-note sequence', () => {
      const matcher = new SequenceMatcher(['G']);
      const result = matcher.processNote('G');
      expect(result.isComplete).toBe(true);
      expect(result.progress).toBe(1);
    });
  });

  describe('wrong note resets sequence', () => {
    it('should reset to 0 on an incorrect note', () => {
      const matcher = new SequenceMatcher(['C', 'D', 'E']);

      matcher.processNote('C'); // correct
      matcher.processNote('D'); // correct
      const result = matcher.processNote('F'); // wrong

      expect(result.lastInputCorrect).toBe(false);
      expect(result.currentIndex).toBe(0);
      expect(result.progress).toBe(0);
      expect(matcher.getNextExpectedNote()).toBe('C');
    });

    it('should reset on the very first note if wrong', () => {
      const matcher = new SequenceMatcher(['C', 'D']);
      const result = matcher.processNote('D');

      expect(result.lastInputCorrect).toBe(false);
      expect(result.currentIndex).toBe(0);
    });
  });

  describe('repeat tolerance (default = true)', () => {
    it('should tolerate repeating the previous correct note', () => {
      const matcher = new SequenceMatcher(['C', 'D', 'E']);

      matcher.processNote('C'); // correct → index 1
      const result = matcher.processNote('C'); // repeat of previous → tolerated

      expect(result.lastInputCorrect).toBe(true);
      expect(result.currentIndex).toBe(1); // stays at 1, doesn't advance
      expect(matcher.getNextExpectedNote()).toBe('D');
    });

    it('should NOT tolerate a repeat of a non-adjacent correct note', () => {
      const matcher = new SequenceMatcher(['C', 'D', 'E']);

      matcher.processNote('C'); // correct
      matcher.processNote('D'); // correct → index 2
      // Now previous note is D, expected is E. Playing C should reset.
      const result = matcher.processNote('C');

      expect(result.lastInputCorrect).toBe(false);
      expect(result.currentIndex).toBe(0);
    });

    it('should not tolerate a repeat when at index 0', () => {
      const matcher = new SequenceMatcher(['C', 'D']);
      // No previous note yet, pressing anything wrong should reset
      const result = matcher.processNote('X');
      expect(result.lastInputCorrect).toBe(false);
      expect(result.currentIndex).toBe(0);
    });
  });

  describe('repeat tolerance disabled', () => {
    it('should reset on any wrong note including repeats', () => {
      const matcher = new SequenceMatcher(['C', 'D', 'E'], false);

      matcher.processNote('C'); // correct
      const result = matcher.processNote('C'); // repeat — NOT tolerated

      expect(result.lastInputCorrect).toBe(false);
      expect(result.currentIndex).toBe(0);
    });
  });

  describe('after completion', () => {
    it('should stay complete if more notes are processed', () => {
      const matcher = new SequenceMatcher(['C']);
      matcher.processNote('C'); // complete

      const result = matcher.processNote('D'); // extra note after completion
      expect(result.isComplete).toBe(true);
      expect(result.lastInputCorrect).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset progress to 0', () => {
      const matcher = new SequenceMatcher(['C', 'D', 'E']);
      matcher.processNote('C');
      matcher.processNote('D');

      matcher.reset();
      expect(matcher.getCurrentIndex()).toBe(0);
      expect(matcher.isComplete()).toBe(false);
      expect(matcher.getProgress()).toBe(0);
      expect(matcher.getNextExpectedNote()).toBe('C');
    });
  });

  describe('getNextExpectedNote', () => {
    it('should return the correct next note at each step', () => {
      const matcher = new SequenceMatcher(['C', 'D', 'E']);
      expect(matcher.getNextExpectedNote()).toBe('C');
      matcher.processNote('C');
      expect(matcher.getNextExpectedNote()).toBe('D');
      matcher.processNote('D');
      expect(matcher.getNextExpectedNote()).toBe('E');
      matcher.processNote('E');
      expect(matcher.getNextExpectedNote()).toBeNull();
    });
  });

  describe('getRequiredSequence', () => {
    it('should return a copy of the sequence', () => {
      const matcher = new SequenceMatcher(['A', 'B']);
      const seq = matcher.getRequiredSequence();
      seq.push('C'); // mutate the copy
      expect(matcher.getRequiredSequence()).toEqual(['A', 'B']); // original unchanged
    });
  });
});
