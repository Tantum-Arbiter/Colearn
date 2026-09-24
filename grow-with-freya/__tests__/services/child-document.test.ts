/**
 * The child document is what a family's app keeps on the server so it can be
 * restored on another device: the minimum needed, no timestamps, no usage
 * history. Two devices will disagree, so merging follows written rules.
 */

import {
  ChildDocument,
  LocalChildState,
  mergeChildDocuments,
  toChildDocument,
} from '@/services/child-document';

function localState(overrides: Partial<LocalChildState> = {}): LocalChildState {
  return {
    userNickname: 'Freya',
    userAvatarType: 'girl',
    userAvatarId: 'owl',
    childAgeInMonths: 30,
    language: 'pl',
    textSizeScale: 1.2,
    favoriteStoryIds: ['snowy-day'],
    favoriteActivityIds: ['bubbles'],
    favoriteSongIds: ['twinkle'],
    storyProgress: { 'snowy-day': { pageIndex: 3, totalPages: 12, completedCount: 2, updatedAt: '2026-09-01T10:00:00Z' } },
    finishedStoryIds: ['snowy-day'],
    challengeCounts: { music: 4 },
    achievements: ['first-story'],
    screenTimeEnabled: true,
    notificationsEnabled: false,
    customReminders: [{
      id: 'r1', title: 'Bath; then story', message: 'Teeth', dayOfWeek: 1, time: '19:00', isActive: true,
      createdAt: '2026-09-01T10:00:00Z', notificationId: 'n-1', advanceNotificationId: 'n-2',
    }],
    ...overrides,
  };
}

function doc(overrides: Partial<ChildDocument> = {}): ChildDocument {
  return { ...toChildDocument(localState(), 'main', 1), ...overrides };
}

describe('toChildDocument', () => {
  it('carries the profile, settings, favourites and progress', () => {
    const underTest = toChildDocument(localState(), 'main', 3);

    expect(underTest).toEqual({
      childId: 'main',
      nickname: 'Freya',
      avatarType: 'girl',
      avatarId: 'owl',
      ageBucket: '2-4',
      language: 'pl',
      textSizeScale: 1.2,
      favorites: { stories: ['snowy-day'], activities: ['bubbles'], songs: ['twinkle'] },
      storyProgress: { 'snowy-day': { pageIndex: 3, totalPages: 12, finishedCount: 2 } },
      finishedStoryIds: ['snowy-day'],
      challengeCounts: { music: 4 },
      achievements: ['first-story'],
      settings: {
        screenTimeEnabled: true,
        smartRemindersEnabled: false,
        customReminders: [{ id: 'r1', title: 'Bath; then story', message: 'Teeth', dayOfWeek: 1, time: '19:00', isActive: true }],
      },
      version: 3,
    });
  });

  it('sends no timestamp and no device identifier anywhere', () => {
    const underTest = JSON.stringify(toChildDocument(localState(), 'main', 0));

    expect(underTest).not.toMatch(/updatedAt|createdAt|notificationId|2026-09-01/);
  });

  it.each([
    [10, '0-2'],
    [23, '0-2'],
    [24, '2-4'],
    [47, '2-4'],
    [48, '4-6'],
  ])('reduces an age of %i months to the %s bucket, never the exact age', (months, bucket) => {
    const underTest = toChildDocument(localState({ childAgeInMonths: months }), 'main', 0);

    expect(underTest.ageBucket).toBe(bucket);
    expect(JSON.stringify(underTest)).not.toContain(`"${months}"`);
  });

  it('leaves out a profile the family has not set up', () => {
    const underTest = toChildDocument(localState({ userNickname: null, userAvatarType: null, userAvatarId: null, language: null }), 'main', 0);

    expect(underTest).not.toHaveProperty('nickname');
    expect(underTest).not.toHaveProperty('avatarType');
    expect(underTest).not.toHaveProperty('avatarId');
    expect(underTest).not.toHaveProperty('language');
  });
});

describe('mergeChildDocuments', () => {
  it.each(['achievements', 'finishedStoryIds'] as const)('unites %s, so it never shrinks', (field) => {
    const base = doc({ [field]: ['a'] });
    const local = doc({ [field]: ['a', 'b'] });
    const remote = doc({ [field]: ['a', 'c'], version: 4 });

    const underTest = mergeChildDocuments(local, remote, base);

    expect([...underTest[field]].sort()).toEqual(['a', 'b', 'c']);
  });

  it.each(['achievements', 'finishedStoryIds'] as const)('keeps %s even when one side lost them', (field) => {
    const underTest = mergeChildDocuments(doc({ [field]: [] }), doc({ [field]: ['a'] }), doc({ [field]: ['a'] }));

    expect(underTest[field]).toEqual(['a']);
  });

  it('takes the larger challenge count for each kind', () => {
    const underTest = mergeChildDocuments(
      doc({ challengeCounts: { music: 5, jigsaw: 1 } }),
      doc({ challengeCounts: { music: 3, reading: 2 } }),
      doc({ challengeCounts: { music: 3 } }),
    );

    expect(underTest.challengeCounts).toEqual({ music: 5, jigsaw: 1, reading: 2 });
  });

  it('takes the larger finished count for each story', () => {
    const underTest = mergeChildDocuments(
      doc({ storyProgress: { s: { pageIndex: 1, totalPages: 9, finishedCount: 1 } } }),
      doc({ storyProgress: { s: { pageIndex: 1, totalPages: 9, finishedCount: 4 } } }),
      doc({ storyProgress: { s: { pageIndex: 1, totalPages: 9, finishedCount: 1 } } }),
    );

    expect(underTest.storyProgress.s.finishedCount).toBe(4);
  });

  it('keeps the higher finished count even when this device\'s page wins', () => {
    const underTest = mergeChildDocuments(
      doc({ storyProgress: { s: { pageIndex: 5, totalPages: 9, finishedCount: 1 } } }),
      doc({ storyProgress: { s: { pageIndex: 2, totalPages: 9, finishedCount: 4 } } }),
      doc({ storyProgress: { s: { pageIndex: 1, totalPages: 9, finishedCount: 1 } } }),
    );

    expect(underTest.storyProgress.s).toEqual({ pageIndex: 5, totalPages: 9, finishedCount: 4 });
  });

  it('keeps the page this device moved to since the last sync', () => {
    const base = doc({ storyProgress: { s: { pageIndex: 1, totalPages: 9, finishedCount: 0 } } });

    const underTest = mergeChildDocuments(
      doc({ storyProgress: { s: { pageIndex: 5, totalPages: 9, finishedCount: 0 } } }),
      doc({ storyProgress: { s: { pageIndex: 2, totalPages: 9, finishedCount: 0 } } }),
      base,
    );

    expect(underTest.storyProgress.s.pageIndex).toBe(5);
  });

  it('takes the page another device moved to when this one has not moved', () => {
    const base = doc({ storyProgress: { s: { pageIndex: 1, totalPages: 9, finishedCount: 0 } } });

    const underTest = mergeChildDocuments(base, doc({ storyProgress: { s: { pageIndex: 7, totalPages: 9, finishedCount: 0 } } }), base);

    expect(underTest.storyProgress.s.pageIndex).toBe(7);
  });

  it('keeps stories either device has started', () => {
    const underTest = mergeChildDocuments(
      doc({ storyProgress: { a: { pageIndex: 1, totalPages: 9, finishedCount: 0 } } }),
      doc({ storyProgress: { b: { pageIndex: 2, totalPages: 9, finishedCount: 0 } } }),
      doc({ storyProgress: {} }),
    );

    expect(Object.keys(underTest.storyProgress).sort()).toEqual(['a', 'b']);
  });

  it('keeps a story this device cleared since the last sync cleared', () => {
    const started = { s: { pageIndex: 3, totalPages: 9, finishedCount: 0 } };

    const underTest = mergeChildDocuments(doc({ storyProgress: {} }), doc({ storyProgress: started }), doc({ storyProgress: started }));

    expect(underTest.storyProgress).toEqual({});
  });

  it.each([
    ['nickname', 'Local', 'Remote'],
    ['avatarId', 'fox', 'bear'],
    ['ageBucket', '4-6', '0-2'],
    ['language', 'de', 'fr'],
    ['textSizeScale', 1.4, 0.8],
  ] as const)('keeps this device\'s %s when it changed here since the last sync', (field, mine, theirs) => {
    const underTest = mergeChildDocuments(doc({ [field]: mine }), doc({ [field]: theirs }), doc());

    expect(underTest[field]).toBe(mine);
  });

  it.each([
    ['nickname', 'Remote'],
    ['avatarId', 'bear'],
    ['language', 'fr'],
  ] as const)('takes the other device\'s %s when this one did not change it', (field, theirs) => {
    const underTest = mergeChildDocuments(doc(), doc({ [field]: theirs }), doc());

    expect(underTest[field]).toBe(theirs);
  });

  it.each(['nickname', 'avatarType', 'avatarId', 'language', 'ageBucket', 'textSizeScale'] as const)(
    'never erases the account\'s %s just because this device has none',
    (field) => {
      const underTest = mergeChildDocuments(doc({ [field]: undefined }), doc(), doc());

      expect(underTest[field]).toBe(doc()[field]);
    },
  );

  it('treats a favourites list as one field: this device\'s edit wins whole', () => {
    const underTest = mergeChildDocuments(
      doc({ favorites: { stories: ['a'], activities: [], songs: [] } }),
      doc({ favorites: { stories: ['b', 'c'], activities: [], songs: [] } }),
      doc({ favorites: { stories: [], activities: [], songs: [] } }),
    );

    expect(underTest.favorites.stories).toEqual(['a']);
  });

  it('takes the other device\'s reminders when this one did not touch them', () => {
    const theirs = { screenTimeEnabled: false, smartRemindersEnabled: true, customReminders: [] };

    const underTest = mergeChildDocuments(doc(), doc({ settings: theirs }), doc());

    expect(underTest.settings).toEqual(theirs);
  });

  describe('on a device that has never synced (a reinstall, or a new phone)', () => {
    it('takes the account\'s profile and settings over this device\'s defaults', () => {
      const underTest = mergeChildDocuments(
        doc({ nickname: undefined, ageBucket: '2-4', textSizeScale: 1, settings: { customReminders: [] } }),
        doc({ nickname: 'Freya', ageBucket: '4-6', textSizeScale: 1.4, settings: { screenTimeEnabled: true, customReminders: [] } }),
        null,
      );

      expect(underTest.nickname).toBe('Freya');
      expect(underTest.ageBucket).toBe('4-6');
      expect(underTest.textSizeScale).toBe(1.4);
      expect(underTest.settings.screenTimeEnabled).toBe(true);
    });

    it('keeps a value only this device has', () => {
      const underTest = mergeChildDocuments(doc({ nickname: 'Mine' }), doc({ nickname: undefined }), null);

      expect(underTest.nickname).toBe('Mine');
    });

    it('unites the favourites, so nothing either side chose is lost', () => {
      const underTest = mergeChildDocuments(
        doc({ favorites: { stories: ['a'], activities: [], songs: ['s'] } }),
        doc({ favorites: { stories: ['b'], activities: ['x'], songs: [] } }),
        null,
      );

      expect(underTest.favorites).toEqual({ stories: ['b', 'a'], activities: ['x'], songs: ['s'] });
    });

    it('takes the account\'s place in a story both have, and keeps one only this device started', () => {
      const underTest = mergeChildDocuments(
        doc({ storyProgress: { both: { pageIndex: 1, totalPages: 9, finishedCount: 0 }, mine: { pageIndex: 2, totalPages: 9, finishedCount: 0 } } }),
        doc({ storyProgress: { both: { pageIndex: 6, totalPages: 9, finishedCount: 1 } } }),
        null,
      );

      expect(underTest.storyProgress.both.pageIndex).toBe(6);
      expect(underTest.storyProgress.mine.pageIndex).toBe(2);
    });

    it('still unites badges and finished stories', () => {
      const underTest = mergeChildDocuments(doc({ achievements: ['first-story'] }), doc({ achievements: ['x'] }), null);

      expect(underTest.achievements).toEqual(expect.arrayContaining(['first-story', 'x']));
    });
  });

  it('writes on top of the server\'s version and keeps its id', () => {
    const underTest = mergeChildDocuments(doc({ version: 1, childId: 'main' }), doc({ version: 9, childId: 'default' }), doc());

    expect(underTest.version).toBe(9);
    expect(underTest.childId).toBe('default');
  });
});
