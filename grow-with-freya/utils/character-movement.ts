import { Easing } from 'react-native-reanimated';
import { CharacterMovement } from '@/types/story';
import { getDeviceInfo, convertToPixels } from './character-positioning';

export interface MovementSequence {
  id: string;
  movements: CharacterMovement[];
  onComplete?: () => void;
  onMovementComplete?: (movementIndex: number) => void;
}

export interface MovementAnimationValues {
  translateX: number;
  translateY: number;
  scale: number;
  rotation: number;
  opacity: number;
}

/**
 * Movement Animation Controller
 * Handles complex character movement sequences
 */
export class MovementAnimationController {
  private activeSequences: Map<string, MovementSequence> = new Map();
  private animationCallbacks: Map<string, () => void> = new Map();

  /**
   * Create a movement sequence
   */
  createMovementSequence(
    sequenceId: string,
    movements: CharacterMovement[],
    callbacks?: {
      onComplete?: () => void;
      onMovementComplete?: (movementIndex: number) => void;
    }
  ): MovementSequence {
    const sequence: MovementSequence = {
      id: sequenceId,
      movements: this.validateAndNormalizeMovements(movements),
      onComplete: callbacks?.onComplete,
      onMovementComplete: callbacks?.onMovementComplete,
    };

    this.activeSequences.set(sequenceId, sequence);
    return sequence;
  }

  /**
   * Validate and normalize movement data
   */
  private validateAndNormalizeMovements(movements: CharacterMovement[]): CharacterMovement[] {
    const device = getDeviceInfo();
    
    return movements.map(movement => {
      const normalized = { ...movement };

      // Normalize distance based on movement type and device
      if (movement.type === 'translate' && movement.distance) {
        if (typeof movement.distance === 'string') {
          // Convert percentage or pixel string to actual pixels
          if (movement.direction === 'left' || movement.direction === 'right') {
            normalized.distance = convertToPixels(movement.distance, 'width', device);
          } else {
            normalized.distance = convertToPixels(movement.distance, 'height', device);
          }
        }
      }

      // Set default values
      normalized.duration = movement.duration || 1000;
      normalized.easing = movement.easing || 'ease-out';

      return normalized;
    });
  }

  /**
   * Get easing function for React Native Reanimated
   */
  getEasingFunction(easing: string) {
    switch (easing) {
      case 'linear':
        return Easing.linear;
      case 'ease-in':
        return Easing.in(Easing.quad);
      case 'ease-out':
        return Easing.out(Easing.quad);
      case 'ease-in-out':
        return Easing.inOut(Easing.quad);
      case 'bounce':
        return Easing.bounce;
      case 'elastic':
        return Easing.elastic(1);
      case 'back':
        return Easing.back(1.7);
      default:
        return Easing.out(Easing.quad);
    }
  }

  /**
   * Calculate movement delta values
   */
  calculateMovementDelta(
    movement: CharacterMovement,
    currentValues: MovementAnimationValues
  ): Partial<MovementAnimationValues> {
    const delta: Partial<MovementAnimationValues> = {};

    switch (movement.type) {
      case 'translate':
        if (movement.direction === 'left') {
          delta.translateX = currentValues.translateX - (movement.distance || 50);
        } else if (movement.direction === 'right') {
          delta.translateX = currentValues.translateX + (movement.distance || 50);
        } else if (movement.direction === 'up') {
          delta.translateY = currentValues.translateY - (movement.distance || 50);
        } else if (movement.direction === 'down') {
          delta.translateY = currentValues.translateY + (movement.distance || 50);
        }
        break;

      case 'scale':
        delta.scale = movement.distance || 1.2;
        break;

      case 'rotate':
        delta.rotation = currentValues.rotation + (movement.distance || 360);
        break;

      default:
        console.warn('Unknown movement type:', movement.type);
    }

    return delta;
  }

  /**
   * Get movement sequence by ID
   */
  getMovementSequence(sequenceId: string): MovementSequence | null {
    return this.activeSequences.get(sequenceId) || null;
  }

  /**
   * Remove movement sequence
   */
  removeMovementSequence(sequenceId: string): void {
    this.activeSequences.delete(sequenceId);
    this.animationCallbacks.delete(sequenceId);
  }

  /**
   * Clear all movement sequences
   */
  clearAllSequences(): void {
    this.activeSequences.clear();
    this.animationCallbacks.clear();
  }
}

/**
 * Predefined movement patterns
 */
export const MOVEMENT_PATTERNS = {
  // Simple movements
  walkRight: (distance: number = 100): CharacterMovement[] => [
    {
      type: 'translate',
      direction: 'right',
      distance,
      duration: 2000,
      easing: 'ease-out',
    },
  ],

  walkLeft: (distance: number = 100): CharacterMovement[] => [
    {
      type: 'translate',
      direction: 'left',
      distance,
      duration: 2000,
      easing: 'ease-out',
    },
  ],

  jump: (height: number = 50): CharacterMovement[] => [
    {
      type: 'translate',
      direction: 'up',
      distance: height,
      duration: 500,
      easing: 'ease-out',
    },
    {
      type: 'translate',
      direction: 'down',
      distance: height,
      duration: 500,
      easing: 'ease-in',
    },
  ],

  bounce: (): CharacterMovement[] => [
    {
      type: 'scale',
      distance: 1.2,
      duration: 300,
      easing: 'bounce',
    },
    {
      type: 'scale',
      distance: 1.0,
      duration: 300,
      easing: 'bounce',
    },
  ],

  spin: (rotations: number = 1): CharacterMovement[] => [
    {
      type: 'rotate',
      distance: 360 * rotations,
      duration: 1000,
      easing: 'ease-in-out',
    },
  ],

  // Complex movement patterns
  happyDance: (): CharacterMovement[] => [
    {
      type: 'translate',
      direction: 'up',
      distance: 30,
      duration: 300,
      easing: 'ease-out',
    },
    {
      type: 'rotate',
      distance: 15,
      duration: 200,
      easing: 'ease-in-out',
    },
    {
      type: 'translate',
      direction: 'down',
      distance: 30,
      duration: 300,
      easing: 'ease-in',
    },
    {
      type: 'rotate',
      distance: -30,
      duration: 200,
      easing: 'ease-in-out',
    },
    {
      type: 'rotate',
      distance: 15,
      duration: 200,
      easing: 'ease-in-out',
    },
  ],

  walkAcrossScreen: (): CharacterMovement[] => [
    {
      type: 'translate',
      direction: 'right',
      distance: '60%', // Move 60% of screen width
      duration: 3000,
      easing: 'ease-in-out',
    },
  ],

  exitLeft: (): CharacterMovement[] => [
    {
      type: 'translate',
      direction: 'left',
      distance: '120%', // Move completely off screen
      duration: 2000,
      easing: 'ease-in',
    },
  ],

  exitRight: (): CharacterMovement[] => [
    {
      type: 'translate',
      direction: 'right',
      distance: '120%', // Move completely off screen
      duration: 2000,
      easing: 'ease-in',
    },
  ],

  fadeOut: (): CharacterMovement[] => [
    {
      type: 'scale',
      distance: 0,
      duration: 1000,
      easing: 'ease-in',
    },
  ],

  popIn: (): CharacterMovement[] => [
    {
      type: 'scale',
      distance: 0.1,
      duration: 0,
      easing: 'linear',
    },
    {
      type: 'scale',
      distance: 1.2,
      duration: 300,
      easing: 'back',
    },
    {
      type: 'scale',
      distance: 1.0,
      duration: 200,
      easing: 'ease-out',
    },
  ],
};

/**
 * Utility functions for movement creation
 */
export const MovementUtils = {
  /**
   * Create a custom walk movement
   */
  createWalk: (
    direction: 'left' | 'right',
    distance: number | string,
    duration: number = 2000
  ): CharacterMovement[] => [
    {
      type: 'translate',
      direction,
      distance,
      duration,
      easing: 'ease-out',
    },
  ],

  /**
   * Create a custom jump movement
   */
  createJump: (
    height: number | string,
    duration: number = 1000
  ): CharacterMovement[] => [
    {
      type: 'translate',
      direction: 'up',
      distance: height,
      duration: duration / 2,
      easing: 'ease-out',
    },
    {
      type: 'translate',
      direction: 'down',
      distance: height,
      duration: duration / 2,
      easing: 'ease-in',
    },
  ],

  /**
   * Combine multiple movement patterns
   */
  combineMovements: (...patterns: CharacterMovement[][]): CharacterMovement[] => {
    return patterns.flat();
  },

  /**
   * Create a delay movement (no visual change)
   */
  createDelay: (duration: number): CharacterMovement => ({
    type: 'scale',
    distance: 1.0, // No change
    duration,
    easing: 'linear',
  }),
};

// Global movement controller instance
export const movementController = new MovementAnimationController();
