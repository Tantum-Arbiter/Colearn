import {
  createMovementSequence,
  validateMovement,
  normalizeMovement,
  getEasingFunction,
  MOVEMENT_PATTERNS,
} from '@/utils/character-movement';
import { CharacterMovement } from '@/types/story';

describe('Character Movement Utils', () => {
  describe('createMovementSequence', () => {
    it('creates sequence from single movement', () => {
      const movement: CharacterMovement = {
        type: 'translate',
        direction: 'right',
        distance: 100,
        duration: 1000,
        easing: 'ease-out',
      };

      const sequence = createMovementSequence([movement]);
      expect(sequence).toHaveLength(1);
      expect(sequence[0]).toEqual(movement);
    });

    it('creates sequence from multiple movements', () => {
      const movements: CharacterMovement[] = [
        {
          type: 'translate',
          direction: 'right',
          distance: 100,
          duration: 1000,
          easing: 'ease-out',
        },
        {
          type: 'scale',
          distance: 1.5,
          duration: 500,
          easing: 'ease-in',
        },
      ];

      const sequence = createMovementSequence(movements);
      expect(sequence).toHaveLength(2);
      expect(sequence).toEqual(movements);
    });

    it('handles empty movement array', () => {
      const sequence = createMovementSequence([]);
      expect(sequence).toHaveLength(0);
    });
  });

  describe('validateMovement', () => {
    it('validates correct translate movement', () => {
      const movement: CharacterMovement = {
        type: 'translate',
        direction: 'right',
        distance: 100,
        duration: 1000,
        easing: 'ease-out',
      };

      const isValid = validateMovement(movement);
      expect(isValid).toBe(true);
    });

    it('validates correct scale movement', () => {
      const movement: CharacterMovement = {
        type: 'scale',
        distance: 1.5,
        duration: 500,
        easing: 'ease-in',
      };

      const isValid = validateMovement(movement);
      expect(isValid).toBe(true);
    });

    it('validates correct rotate movement', () => {
      const movement: CharacterMovement = {
        type: 'rotate',
        distance: 360,
        duration: 2000,
        easing: 'linear',
      };

      const isValid = validateMovement(movement);
      expect(isValid).toBe(true);
    });

    it('rejects movement with invalid type', () => {
      const movement = {
        type: 'invalid',
        distance: 100,
        duration: 1000,
      } as CharacterMovement;

      const isValid = validateMovement(movement);
      expect(isValid).toBe(false);
    });

    it('rejects movement with negative duration', () => {
      const movement: CharacterMovement = {
        type: 'translate',
        direction: 'right',
        distance: 100,
        duration: -500,
        easing: 'ease-out',
      };

      const isValid = validateMovement(movement);
      expect(isValid).toBe(false);
    });

    it('rejects translate movement without direction', () => {
      const movement: CharacterMovement = {
        type: 'translate',
        distance: 100,
        duration: 1000,
        easing: 'ease-out',
      };

      const isValid = validateMovement(movement);
      expect(isValid).toBe(false);
    });

    it('rejects movement with invalid direction', () => {
      const movement: CharacterMovement = {
        type: 'translate',
        direction: 'diagonal' as any,
        distance: 100,
        duration: 1000,
        easing: 'ease-out',
      };

      const isValid = validateMovement(movement);
      expect(isValid).toBe(false);
    });
  });

  describe('normalizeMovement', () => {
    it('adds default easing when not specified', () => {
      const movement: CharacterMovement = {
        type: 'translate',
        direction: 'right',
        distance: 100,
        duration: 1000,
      };

      const normalized = normalizeMovement(movement);
      expect(normalized.easing).toBe('ease-out');
    });

    it('preserves existing easing', () => {
      const movement: CharacterMovement = {
        type: 'translate',
        direction: 'right',
        distance: 100,
        duration: 1000,
        easing: 'linear',
      };

      const normalized = normalizeMovement(movement);
      expect(normalized.easing).toBe('linear');
    });

    it('converts percentage distance to pixels', () => {
      const movement: CharacterMovement = {
        type: 'translate',
        direction: 'right',
        distance: '50%',
        duration: 1000,
      };

      const normalized = normalizeMovement(movement);
      expect(typeof normalized.distance).toBe('number');
      expect(normalized.distance).toBeGreaterThan(0);
    });

    it('preserves numeric distance', () => {
      const movement: CharacterMovement = {
        type: 'translate',
        direction: 'right',
        distance: 100,
        duration: 1000,
      };

      const normalized = normalizeMovement(movement);
      expect(normalized.distance).toBe(100);
    });
  });

  describe('getEasingFunction', () => {
    it('returns correct easing for linear', () => {
      const easing = getEasingFunction('linear');
      expect(easing).toBeDefined();
    });

    it('returns correct easing for ease-in', () => {
      const easing = getEasingFunction('ease-in');
      expect(easing).toBeDefined();
    });

    it('returns correct easing for ease-out', () => {
      const easing = getEasingFunction('ease-out');
      expect(easing).toBeDefined();
    });

    it('returns correct easing for ease-in-out', () => {
      const easing = getEasingFunction('ease-in-out');
      expect(easing).toBeDefined();
    });

    it('returns default easing for invalid input', () => {
      const easing = getEasingFunction('invalid' as any);
      expect(easing).toBeDefined();
    });
  });

  describe('MOVEMENT_PATTERNS', () => {
    it('provides walkRight pattern', () => {
      const pattern = MOVEMENT_PATTERNS.walkRight(150);
      expect(pattern).toHaveLength(1);
      expect(pattern[0].type).toBe('translate');
      expect(pattern[0].direction).toBe('right');
      expect(pattern[0].distance).toBe(150);
      expect(pattern[0].duration).toBe(2000);
    });

    it('provides walkLeft pattern', () => {
      const pattern = MOVEMENT_PATTERNS.walkLeft(100);
      expect(pattern).toHaveLength(1);
      expect(pattern[0].type).toBe('translate');
      expect(pattern[0].direction).toBe('left');
      expect(pattern[0].distance).toBe(100);
    });

    it('provides jump pattern', () => {
      const pattern = MOVEMENT_PATTERNS.jump(75);
      expect(pattern).toHaveLength(2);
      expect(pattern[0].type).toBe('translate');
      expect(pattern[0].direction).toBe('up');
      expect(pattern[0].distance).toBe(75);
      expect(pattern[1].type).toBe('translate');
      expect(pattern[1].direction).toBe('down');
      expect(pattern[1].distance).toBe(75);
    });

    it('provides bounce pattern', () => {
      const pattern = MOVEMENT_PATTERNS.bounce(3);
      expect(pattern).toHaveLength(6); // 3 bounces = 6 movements (up + down each)
      expect(pattern[0].type).toBe('translate');
      expect(pattern[0].direction).toBe('up');
      expect(pattern[1].type).toBe('translate');
      expect(pattern[1].direction).toBe('down');
    });

    it('provides spin pattern', () => {
      const pattern = MOVEMENT_PATTERNS.spin(2);
      expect(pattern).toHaveLength(1);
      expect(pattern[0].type).toBe('rotate');
      expect(pattern[0].distance).toBe(720); // 2 full rotations
    });

    it('provides happyDance pattern', () => {
      const pattern = MOVEMENT_PATTERNS.happyDance();
      expect(pattern.length).toBeGreaterThan(1);
      expect(pattern.some(m => m.type === 'scale')).toBe(true);
      expect(pattern.some(m => m.type === 'rotate')).toBe(true);
    });

    it('provides wiggle pattern', () => {
      const pattern = MOVEMENT_PATTERNS.wiggle(5);
      expect(pattern).toHaveLength(10); // 5 wiggles = 10 movements (left + right each)
      expect(pattern[0].type).toBe('rotate');
      expect(pattern[0].distance).toBe(-10);
      expect(pattern[1].type).toBe('rotate');
      expect(pattern[1].distance).toBe(10);
    });

    it('provides float pattern', () => {
      const pattern = MOVEMENT_PATTERNS.float();
      expect(pattern).toHaveLength(1);
      expect(pattern[0].type).toBe('translate');
      expect(pattern[0].direction).toBe('up');
      expect(pattern[0].distance).toBe(20);
    });

    it('uses default values when no parameters provided', () => {
      const walkPattern = MOVEMENT_PATTERNS.walkRight();
      expect(walkPattern[0].distance).toBe(100); // Default distance

      const jumpPattern = MOVEMENT_PATTERNS.jump();
      expect(jumpPattern[0].distance).toBe(50); // Default height

      const bouncePattern = MOVEMENT_PATTERNS.bounce();
      expect(bouncePattern).toHaveLength(2); // Default 1 bounce = 2 movements
    });
  });
});
