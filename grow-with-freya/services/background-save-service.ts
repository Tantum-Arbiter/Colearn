import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient } from './api-client';
import { Logger } from '@/utils/logger';

const log = Logger.create('BackgroundSave');

const PENDING_SAVES_KEY = 'pending-profile-saves';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000; // 2 seconds

interface PendingSave {
  id: string;
  data: ProfileUpdateData;
  timestamp: number;
  retryCount: number;
}

interface ProfileUpdateData {
  nickname: string;
  avatarType: 'boy' | 'girl';
  avatarId: string;
  notifications?: any;
  schedule?: any;
}

class BackgroundSaveServiceClass {
  private isProcessing = false;
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  async queueProfileSave(data: ProfileUpdateData): Promise<void> {
    log.debug('Queueing profile save');

    const pendingSave: PendingSave = {
      id: Date.now().toString(),
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    // Add to pending saves
    await this.addPendingSave(pendingSave);
    // Profile save queued

    // Start processing queue
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      // Already processing
      return;
    }

    this.isProcessing = true;

    try {
      const pendingSaves = await this.getPendingSaves();
      if (pendingSaves.length === 0) {
        this.isProcessing = false;
        return;
      }

      log.debug(`Processing ${pendingSaves.length} pending save(s)`);

      // Process each pending save (most recent first for profile updates)
      const sortedSaves = pendingSaves.sort((a, b) => b.timestamp - a.timestamp);

      // For profile updates, only keep the most recent one
      const mostRecent = sortedSaves[0];

      try {
        // Check if user is authenticated
        const isAuthenticated = await ApiClient.isAuthenticated();
        if (!isAuthenticated) {
          log.debug('Not authenticated, keeping save queued');
          return;
        }

        // Attempt to save
        await ApiClient.updateProfile(mostRecent.data);
        log.info('Profile saved');

        // Remove all pending saves (they're all superseded by this one)
        await this.clearPendingSaves();

      } catch (error: any) {
        log.warn('Save failed:', error.message);

        // Increment retry count
        mostRecent.retryCount++;

        if (mostRecent.retryCount >= MAX_RETRIES) {
          log.warn('Max retries reached, discarding save');
          await this.removePendingSave(mostRecent.id);
        } else {
          // Update the save with new retry count
          await this.updatePendingSave(mostRecent);

          // Schedule retry with exponential backoff
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, mostRecent.retryCount - 1);
          log.debug(`Retry in ${delay}ms (attempt ${mostRecent.retryCount}/${MAX_RETRIES})`);

          this.retryTimeoutId = setTimeout(() => {
            this.processQueue();
          }, delay);
        }
      }
    } catch (error) {
      log.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async getPendingSaves(): Promise<PendingSave[]> {
    try {
      const json = await AsyncStorage.getItem(PENDING_SAVES_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      log.error('Error reading pending saves:', error);
      return [];
    }
  }

  private async addPendingSave(save: PendingSave): Promise<void> {
    const saves = await this.getPendingSaves();
    saves.push(save);
    await AsyncStorage.setItem(PENDING_SAVES_KEY, JSON.stringify(saves));
  }

  private async updatePendingSave(save: PendingSave): Promise<void> {
    const saves = await this.getPendingSaves();
    const index = saves.findIndex(s => s.id === save.id);
    if (index !== -1) {
      saves[index] = save;
      await AsyncStorage.setItem(PENDING_SAVES_KEY, JSON.stringify(saves));
    }
  }

  private async removePendingSave(id: string): Promise<void> {
    const saves = await this.getPendingSaves();
    const filtered = saves.filter(s => s.id !== id);
    await AsyncStorage.setItem(PENDING_SAVES_KEY, JSON.stringify(filtered));
  }

  private async clearPendingSaves(): Promise<void> {
    await AsyncStorage.removeItem(PENDING_SAVES_KEY);
  }

  async hasPendingSaves(): Promise<boolean> {
    const saves = await this.getPendingSaves();
    return saves.length > 0;
  }

  async retryPendingSaves(): Promise<void> {
    log.debug('Retrying pending saves');
    this.processQueue();
  }

  cancelPendingRetries(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }
}

// Export singleton instance
export const backgroundSaveService = new BackgroundSaveServiceClass();

