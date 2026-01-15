import {
  createAudioPlayer,
  AudioPlayer,
} from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paths, Directory, File } from 'expo-file-system/next';

const VOICE_OVERS_STORAGE_KEY = '@voice_overs';
const RECORDINGS_DIRECTORY_NAME = 'voice-recordings';

export interface PageRecording {
  pageIndex: number;
  uri: string;
  duration: number;
}

export interface VoiceOver {
  id: string;
  storyId: string;
  name: string;
  createdAt: number;
  pageRecordings: Record<number, PageRecording>;
}

export interface VoiceOverMetadata {
  voiceOvers: VoiceOver[];
}

/**
 * Voice Recording Service
 *
 * Handles file management, metadata storage, and playback for voice recordings.
 *
 * NOTE: Recording functionality has been moved to the useVoiceRecording hook
 * since expo-audio only supports hook-based recording. Components should use
 * the hook for recording and this service for file/metadata management.
 *
 * @see hooks/use-voice-recording.ts for recording functionality
 */
class VoiceRecordingService {
  private recordingsDir: Directory | null = null;

  async initialize(): Promise<void> {
    try {
      this.recordingsDir = new Directory(Paths.document, RECORDINGS_DIRECTORY_NAME);
      if (!this.recordingsDir.exists) {
        this.recordingsDir.create();
        console.log('Voice recordings directory created');
      }
    } catch (error) {
      console.error('Failed to initialize voice recording service:', error);
    }
  }

  async saveRecording(
    _storyId: string,
    voiceOverId: string,
    pageIndex: number,
    tempUri: string,
    _duration: number
  ): Promise<string | null> {
    try {
      if (!this.recordingsDir) {
        await this.initialize();
      }
      const filename = `${voiceOverId}_page${pageIndex}.m4a`;
      const tempFile = new File(tempUri);
      const targetPath = `${this.recordingsDir!.uri}${filename}`;
      const permanentFile = new File(targetPath);

      // Delete existing file if it exists (for overwrites)
      try {
        if (permanentFile.exists) {
          permanentFile.delete();
          console.log('Deleted existing recording:', targetPath);
        }
      } catch (deleteError) {
        console.warn('Could not delete existing file:', deleteError);
      }

      // Use move instead of copy - move replaces existing files
      tempFile.move(permanentFile);
      console.log('Recording saved:', permanentFile.uri);
      return permanentFile.uri;
    } catch (error) {
      console.error('Failed to save recording:', error);
      return null;
    }
  }

  async getVoiceOvers(): Promise<VoiceOver[]> {
    try {
      const data = await AsyncStorage.getItem(VOICE_OVERS_STORAGE_KEY);
      if (!data) return [];
      const metadata: VoiceOverMetadata = JSON.parse(data);
      return metadata.voiceOvers || [];
    } catch (error) {
      console.error('Failed to get voice overs:', error);
      return [];
    }
  }

  async getVoiceOversForStory(storyId: string): Promise<VoiceOver[]> {
    const allVoiceOvers = await this.getVoiceOvers();
    return allVoiceOvers.filter(vo => vo.storyId === storyId);
  }

  async createVoiceOver(storyId: string, name: string): Promise<VoiceOver> {
    const voiceOver: VoiceOver = {
      id: `vo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      storyId,
      name,
      createdAt: Date.now(),
      pageRecordings: {},
    };

    const voiceOvers = await this.getVoiceOvers();
    voiceOvers.push(voiceOver);
    await this.saveVoiceOvers(voiceOvers);

    console.log('Voice over created:', voiceOver.id);
    return voiceOver;
  }

  async updateVoiceOver(voiceOver: VoiceOver): Promise<void> {
    const voiceOvers = await this.getVoiceOvers();
    const index = voiceOvers.findIndex(vo => vo.id === voiceOver.id);
    if (index !== -1) {
      voiceOvers[index] = voiceOver;
      await this.saveVoiceOvers(voiceOvers);
    }
  }

  async addPageRecording(
    voiceOverId: string,
    pageIndex: number,
    uri: string,
    duration: number
  ): Promise<void> {
    const voiceOvers = await this.getVoiceOvers();
    const voiceOver = voiceOvers.find(vo => vo.id === voiceOverId);
    if (voiceOver) {
      voiceOver.pageRecordings[pageIndex] = { pageIndex, uri, duration };
      await this.saveVoiceOvers(voiceOvers);
      console.log(`Page ${pageIndex} recording added to voice over ${voiceOverId}`);
    }
  }

  async deleteVoiceOver(voiceOverId: string): Promise<{ success: boolean; orphanedFiles: string[] }> {
    const orphanedFiles: string[] = [];

    try {
      const voiceOvers = await this.getVoiceOvers();
      const voiceOver = voiceOvers.find(vo => vo.id === voiceOverId);

      if (voiceOver) {
        // Attempt to delete all recording files, tracking failures
        for (const recording of Object.values(voiceOver.pageRecordings)) {
          try {
            const file = new File(recording.uri);
            if (file.exists) {
              file.delete();
            }
          } catch (e) {
            // Track files that failed to delete
            orphanedFiles.push(recording.uri);
            console.warn('Failed to delete recording file:', recording.uri, e);
          }
        }
      }

      // Only update metadata - orphaned files are logged but don't block deletion
      // This is intentional: user expectation is the voice over is "deleted"
      // even if some files remain (they can be cleaned up later)
      const filtered = voiceOvers.filter(vo => vo.id !== voiceOverId);
      await this.saveVoiceOvers(filtered);

      if (orphanedFiles.length > 0) {
        console.warn(`Voice over ${voiceOverId} deleted but ${orphanedFiles.length} file(s) could not be removed`);
      } else {
        console.log('Voice over deleted:', voiceOverId);
      }

      return { success: true, orphanedFiles };
    } catch (error) {
      console.error('Failed to delete voice over:', error);
      return { success: false, orphanedFiles };
    }
  }

  private async saveVoiceOvers(voiceOvers: VoiceOver[]): Promise<void> {
    const metadata: VoiceOverMetadata = { voiceOvers };
    await AsyncStorage.setItem(VOICE_OVERS_STORAGE_KEY, JSON.stringify(metadata));
  }

  async playRecording(uri: string): Promise<AudioPlayer | null> {
    try {
      const player = createAudioPlayer({ uri });
      player.play();
      return player;
    } catch (error) {
      console.error('Failed to play recording:', error);
      return null;
    }
  }
}

export const voiceRecordingService = new VoiceRecordingService();

