import { MusicTrack } from '@/types/music';
import { MusicPlayerService } from './music-player';

/**
 * Service for handling sleep sequence progression
 * Automatically transitions between Alpha → Beta → Theta phases
 */
export class SleepSequencePlayer {
  private static instance: SleepSequencePlayer | null = null;
  private musicPlayer: MusicPlayerService;
  private currentSequence: MusicTrack[] = [];
  private currentPhaseIndex: number = 0;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private isSequenceActive: boolean = false;
  private onSequenceComplete?: () => void;
  private onPhaseChange?: (phase: MusicTrack, phaseNumber: number) => void;
  private phaseStartTime: number = 0; // Track when current phase started

  private constructor() {
    this.musicPlayer = MusicPlayerService.getInstance();
  }

  public static getInstance(): SleepSequencePlayer {
    if (!SleepSequencePlayer.instance) {
      SleepSequencePlayer.instance = new SleepSequencePlayer();
    }
    return SleepSequencePlayer.instance;
  }

  /**
   * Start the sleep sequence with automatic progression
   */
  public async startSleepSequence(
    sequenceTracks: MusicTrack[],
    onPhaseChange?: (phase: MusicTrack, phaseNumber: number) => void,
    onSequenceComplete?: () => void
  ): Promise<void> {
    try {
      this.currentSequence = sequenceTracks;
      this.currentPhaseIndex = 0;
      this.isSequenceActive = true;
      this.onPhaseChange = onPhaseChange;
      this.onSequenceComplete = onSequenceComplete;

      console.log('Starting sleep sequence with', sequenceTracks.length, 'phases');
      
      // Start with the first phase
      await this.playCurrentPhase();
    } catch (error) {
      console.error('Failed to start sleep sequence:', error);
      this.stopSequence();
      throw error;
    }
  }

  /**
   * Play the current phase and set timer for next phase
   */
  private async playCurrentPhase(): Promise<void> {
    if (!this.isSequenceActive || this.currentPhaseIndex >= this.currentSequence.length) {
      this.completeSequence();
      return;
    }

    const currentPhase = this.currentSequence[this.currentPhaseIndex];
    console.log(`Starting phase ${this.currentPhaseIndex + 1}: ${currentPhase.title}`);

    try {
      // Record when this phase started
      this.phaseStartTime = Date.now();

      // Load and play the current phase
      await this.musicPlayer.loadTrack(currentPhase);
      await this.musicPlayer.play();

      // Notify about phase change
      if (this.onPhaseChange) {
        this.onPhaseChange(currentPhase, this.currentPhaseIndex + 1);
      }

      // Set timer for next phase (convert duration from seconds to milliseconds)
      this.phaseTimer = setTimeout(() => {
        this.nextPhase();
      }, currentPhase.duration * 1000);

    } catch (error) {
      console.error(`Failed to play phase ${this.currentPhaseIndex + 1}:`, error);
      this.stopSequence();
      throw error;
    }
  }

  /**
   * Move to the next phase in the sequence
   */
  private async nextPhase(): Promise<void> {
    if (!this.isSequenceActive) return;

    this.currentPhaseIndex++;

    if (this.currentPhaseIndex < this.currentSequence.length) {
      console.log(`Transitioning to phase ${this.currentPhaseIndex + 1}`);
      await this.playCurrentPhase();
    } else {
      await this.completeSequence();
    }
  }

  /**
   * Complete the sequence
   */
  private async completeSequence(): Promise<void> {
    console.log('Sleep sequence completed');
    this.isSequenceActive = false;
    this.clearTimer();

    // Clear the track to properly restore background music
    await this.musicPlayer.clearTrack();

    if (this.onSequenceComplete) {
      this.onSequenceComplete();
    }
  }

  /**
   * Stop the sequence manually
   */
  public async stopSequence(): Promise<void> {
    console.log('Stopping sleep sequence');
    this.isSequenceActive = false;
    this.clearTimer();
    await this.musicPlayer.stop();

    // Clear the track to properly restore background music
    await this.musicPlayer.clearTrack();
  }

  /**
   * Pause the current sequence
   */
  public async pauseSequence(): Promise<void> {
    if (this.isSequenceActive) {
      await this.musicPlayer.pause();
      this.clearTimer();
    }
  }

  /**
   * Resume the current sequence
   */
  public async resumeSequence(): Promise<void> {
    if (this.isSequenceActive) {
      await this.musicPlayer.play();
      
      // Calculate remaining time for current phase
      const currentPhase = this.currentSequence[this.currentPhaseIndex];
      const currentTime = this.musicPlayer.getState().currentTime;
      const remainingTime = (currentPhase.duration - currentTime) * 1000;
      
      if (remainingTime > 0) {
        this.phaseTimer = setTimeout(() => {
          this.nextPhase();
        }, remainingTime);
      } else {
        this.nextPhase();
      }
    }
  }

  /**
   * Skip to next phase manually
   */
  public async skipToNextPhase(): Promise<void> {
    if (this.isSequenceActive && this.currentPhaseIndex < this.currentSequence.length - 1) {
      this.clearTimer();
      this.currentPhaseIndex++;
      await this.playCurrentPhase();
    }
  }

  /**
   * Skip to previous phase manually
   */
  public async skipToPreviousPhase(): Promise<void> {
    if (this.isSequenceActive && this.currentPhaseIndex > 0) {
      this.clearTimer();
      this.currentPhaseIndex--;
      await this.playCurrentPhase();
    }
  }

  /**
   * Get current sequence status with enhanced timing information
   */
  public getSequenceStatus(): {
    isActive: boolean;
    currentPhase: number;
    totalPhases: number;
    currentTrack: MusicTrack | null;
    remainingTimeInPhase: number;
    remainingTimeTotal: number;
    timeUntilThetaPhase: number;
    isInThetaPhase: boolean;
  } {
    const currentTrack = this.currentSequence[this.currentPhaseIndex] || null;

    if (!this.isSequenceActive || !currentTrack) {
      return {
        isActive: false,
        currentPhase: 0,
        totalPhases: 0,
        currentTrack: null,
        remainingTimeInPhase: 0,
        remainingTimeTotal: 0,
        timeUntilThetaPhase: 0,
        isInThetaPhase: false,
      };
    }

    // Calculate elapsed time in current phase
    const elapsedTimeInPhase = (Date.now() - this.phaseStartTime) / 1000;
    const remainingTimeInPhase = Math.max(0, currentTrack.duration - elapsedTimeInPhase);

    // Calculate total remaining time in sequence
    let remainingTimeTotal = remainingTimeInPhase;
    for (let i = this.currentPhaseIndex + 1; i < this.currentSequence.length; i++) {
      remainingTimeTotal += this.currentSequence[i].duration;
    }

    // Calculate time until theta phase (assuming phase 2 is theta)
    const isInThetaPhase = this.currentPhaseIndex >= 1;
    const timeUntilThetaPhase = isInThetaPhase ? 0 : remainingTimeInPhase;

    return {
      isActive: this.isSequenceActive,
      currentPhase: this.currentPhaseIndex + 1,
      totalPhases: this.currentSequence.length,
      currentTrack,
      remainingTimeInPhase: Math.max(0, remainingTimeInPhase),
      remainingTimeTotal: Math.max(0, remainingTimeTotal),
      timeUntilThetaPhase: Math.max(0, timeUntilThetaPhase),
      isInThetaPhase,
    };
  }

  /**
   * Clear the phase timer
   */
  private clearTimer(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.stopSequence();
    this.currentSequence = [];
    this.currentPhaseIndex = 0;
    this.onPhaseChange = undefined;
    this.onSequenceComplete = undefined;
  }
}

export default SleepSequencePlayer;
