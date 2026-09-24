/**
 * The voice-overs on the phone: where each page's recording lives, and how a
 * voice-over made on another phone joins them.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { voiceRecordingService, type VoiceOver } from '@/services/voice-recording-service';

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///docs/' },
  Directory: class {
    uri = 'file:///docs/voice-recordings/';
    exists = true;
    create() {}
  },
  File: class {},
}));

let storage: Record<string, string>;

function voiceOver(id: string): VoiceOver {
  return { id, storyId: 'snowy', name: 'Mum', createdAt: 1, pageRecordings: {} };
}

beforeEach(() => {
  storage = {};
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
});

describe('voiceRecordingService', () => {
  it('keeps each page of a voice-over in its own file in the recordings folder', async () => {
    expect(await voiceRecordingService.recordingPath('vo_1', 3)).toBe('file:///docs/voice-recordings/vo_1_page3.m4a');
  });

  it('adds a voice-over from another phone under its own id', async () => {
    await voiceRecordingService.importVoiceOver(voiceOver('vo_9'));

    expect((await voiceRecordingService.getVoiceOvers()).map((vo) => vo.id)).toEqual(['vo_9']);
  });

  it('adds a voice-over only once, however often it arrives', async () => {
    await voiceRecordingService.importVoiceOver(voiceOver('vo_9'));
    await voiceRecordingService.importVoiceOver(voiceOver('vo_9'));

    expect(await voiceRecordingService.getVoiceOvers()).toHaveLength(1);
  });
});
