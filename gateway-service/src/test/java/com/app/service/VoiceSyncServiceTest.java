package com.app.service;

import com.app.dto.VoiceUploadRequest;
import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.model.Consent;
import com.app.model.VoiceOverRecord;
import com.app.repository.ConsentRepository;
import com.app.repository.VoiceOverRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class VoiceSyncServiceTest {

    private static final String USER = "user-1";
    private static final long MB = 1024L * 1024;

    private final Map<String, VoiceOverRecord> records = new LinkedHashMap<>();
    private final List<String> deletedPrefixes = new ArrayList<>();
    private final List<String> signedUploads = new ArrayList<>();
    private final ConsentRepository consents = mock(ConsentRepository.class);
    private VoiceSyncService underTest;

    private final VoiceStorage storage = new VoiceStorage() {
        @Override
        public boolean configured() {
            return true;
        }

        @Override
        public String signedUpload(String objectName, String contentType, long maxBytes, Duration ttl) {
            signedUploads.add(objectName + "|" + contentType + "|" + maxBytes);
            return "https://upload/" + objectName;
        }

        @Override
        public String signedDownload(String objectName, Duration ttl) {
            return "https://download/" + objectName;
        }

        @Override
        public int deletePrefix(String prefix) {
            deletedPrefixes.add(prefix);
            return 1;
        }
    };

    private final VoiceOverRepository repository = new VoiceOverRepository() {
        @Override
        public CompletableFuture<List<VoiceOverRecord>> findAll(String userId) {
            return CompletableFuture.completedFuture(new ArrayList<>(records.values()));
        }

        @Override
        public CompletableFuture<Optional<VoiceOverRecord>> find(String userId, String voiceOverId) {
            return CompletableFuture.completedFuture(Optional.ofNullable(records.get(voiceOverId)));
        }

        @Override
        public CompletableFuture<VoiceOverRecord> save(String userId, VoiceOverRecord record) {
            records.put(record.getId(), record);
            return CompletableFuture.completedFuture(record);
        }

        @Override
        public CompletableFuture<Void> delete(String userId, String voiceOverId) {
            records.remove(voiceOverId);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public CompletableFuture<Integer> deleteAll(String userId) {
            int n = records.size();
            records.clear();
            return CompletableFuture.completedFuture(n);
        }
    };

    @BeforeEach
    void setUp() {
        underTest = new VoiceSyncService(storage, repository, consents);
        consented("voiceSync");
    }

    private void consented(String... scopes) {
        List<Consent> given = new ArrayList<>();
        for (String scope : scopes) {
            Consent consent = new Consent();
            consent.setScope(scope);
            given.add(consent);
        }
        when(consents.findAll(USER)).thenReturn(CompletableFuture.completedFuture(given));
    }

    private static VoiceUploadRequest request(String storyId, long... pageBytes) {
        List<VoiceUploadRequest.Page> pages = new ArrayList<>();
        for (int i = 0; i < pageBytes.length; i++) {
            pages.add(new VoiceUploadRequest.Page(i + 1, pageBytes[i]));
        }
        return new VoiceUploadRequest(storyId, "Mum", pages);
    }

    @Test
    void signsOneUploadPerPage_underTheAccountsOwnPrefix_limitedToTheSizeDeclared() {
        VoiceSyncService.UploadPlan plan = underTest.prepareUpload(USER, "vo_1", request("snowy", 3 * MB, 2 * MB));

        assertEquals(List.of("voice/user-1/vo_1/1.m4a|audio/mp4|" + 3 * MB, "voice/user-1/vo_1/2.m4a|audio/mp4|" + 2 * MB), signedUploads);
        assertEquals(2, plan.uploads().size());
        assertEquals(1, plan.uploads().get(0).pageIndex());
        assertEquals("https://upload/voice/user-1/vo_1/1.m4a", plan.uploads().get(0).url());
        assertEquals(5 * MB, plan.usedBytes());
        assertEquals(200 * MB, plan.limitBytes());
    }

    @Test
    void remembersTheVoiceOverWithoutTheRecordingsThemselves() {
        underTest.prepareUpload(USER, "vo_1", request("snowy", 3 * MB));

        VoiceOverRecord stored = records.get("vo_1");
        assertEquals("snowy", stored.getStoryId());
        assertEquals("Mum", stored.getLabel());
        assertEquals(Map.of("1", 3 * MB), stored.getPages());
    }

    @Test
    void addsPagesToAVoiceOverAlreadyStarted_andReplacesAPageRecordedAgain() {
        underTest.prepareUpload(USER, "vo_1", request("snowy", 3 * MB, 2 * MB));

        underTest.prepareUpload(USER, "vo_1", new VoiceUploadRequest("snowy", "Mum", List.of(new VoiceUploadRequest.Page(2, MB), new VoiceUploadRequest.Page(3, MB))));

        assertEquals(Map.of("1", 3 * MB, "2", MB, "3", MB), records.get("vo_1").getPages());
    }

    @Test
    void refusesAnUploadThatWouldTakeTheAccountPast200MB() {
        underTest.prepareUpload(USER, "vo_1", request("snowy", 9 * MB, 9 * MB, 9 * MB, 9 * MB, 9 * MB, 9 * MB, 9 * MB, 9 * MB, 9 * MB, 9 * MB));
        underTest.prepareUpload(USER, "vo_2", request("owl", 9 * MB, 9 * MB, 9 * MB, 9 * MB, 9 * MB, 9 * MB, 9 * MB, 9 * MB, 9 * MB, 9 * MB));
        signedUploads.clear();

        GatewayException refused = assertThrows(GatewayException.class,
                () -> underTest.prepareUpload(USER, "vo_3", request("bear", 9 * MB, 9 * MB, 3 * MB)));

        assertEquals(ErrorCode.VOICE_QUOTA_EXCEEDED, refused.getErrorCode());
        assertTrue(signedUploads.isEmpty());
        assertFalse(records.containsKey("vo_3"));
    }

    @Test
    void allowsAnUploadThatFillsTheAccountExactly() {
        underTest.prepareUpload(USER, "vo_1", request("snowy", 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB));
        underTest.prepareUpload(USER, "vo_2", request("owl", 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB));

        VoiceSyncService.UploadPlan plan = underTest.prepareUpload(USER, "vo_3", request("bear", 10 * MB));

        assertEquals(200 * MB, plan.usedBytes());
    }

    @Test
    void countsAReplacedPageOnceTowardsTheLimit() {
        underTest.prepareUpload(USER, "vo_1", request("snowy", 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB));
        underTest.prepareUpload(USER, "vo_2", request("owl", 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB, 10 * MB));

        VoiceSyncService.UploadPlan plan = underTest.prepareUpload(USER, "vo_2", request("owl", 10 * MB));

        assertEquals(200 * MB, plan.usedBytes());
    }

    @Test
    void refusesWithoutTheParentsConsentToKeepRecordingsOnline() {
        consented("core");

        GatewayException refused = assertThrows(GatewayException.class, () -> underTest.prepareUpload(USER, "vo_1", request("snowy", MB)));

        assertEquals(ErrorCode.VOICE_SYNC_NOT_CONSENTED, refused.getErrorCode());
        assertTrue(signedUploads.isEmpty());
    }

    @Test
    void listsEachVoiceOverWithShortLivedLinksToItsPages() {
        underTest.prepareUpload(USER, "vo_1", request("snowy", MB, MB));

        List<VoiceSyncService.VoiceOverListing> listing = underTest.list(USER);

        assertEquals(1, listing.size());
        assertEquals("snowy", listing.get(0).storyId());
        assertEquals("Mum", listing.get(0).label());
        assertEquals(List.of(1, 2), listing.get(0).pages().stream().map(VoiceSyncService.PageLink::pageIndex).toList());
        assertEquals("https://download/voice/user-1/vo_1/2.m4a", listing.get(0).pages().get(1).url());
    }

    @Test
    void listingNeedsConsentToo() {
        consented();

        assertThrows(GatewayException.class, () -> underTest.list(USER));
    }

    @Test
    void deletesAVoiceOversRecordingsAndItsRecord() {
        underTest.prepareUpload(USER, "vo_1", request("snowy", MB));

        underTest.delete(USER, "vo_1");

        assertEquals(List.of("voice/user-1/vo_1/"), deletedPrefixes);
        assertFalse(records.containsKey("vo_1"));
    }

    @Test
    void deletesEverythingWhenSyncIsTurnedOff_evenAfterConsentWasWithdrawn() {
        underTest.prepareUpload(USER, "vo_1", request("snowy", MB));
        consented();

        underTest.deleteAll(USER);

        assertEquals(List.of("voice/user-1/"), deletedPrefixes);
        assertTrue(records.isEmpty());
    }

    @Test
    void refusesIdsThatCouldEscapeTheAccountsPrefix() {
        assertThrows(GatewayException.class, () -> underTest.prepareUpload(USER, "../other", request("snowy", MB)));
        assertThrows(GatewayException.class, () -> underTest.delete(USER, "vo_1/../../x"));
    }

    @Test
    void refusesAPageLargerThanARecordingCanBe() {
        GatewayException refused = assertThrows(GatewayException.class, () -> underTest.prepareUpload(USER, "vo_1", request("snowy", 11 * MB)));

        assertEquals(ErrorCode.INVALID_REQUEST, refused.getErrorCode());
    }

    @Test
    void summarisesTheRecordsForAnExport_withoutLinks() {
        underTest.prepareUpload(USER, "vo_1", request("snowy", MB, MB));

        List<Map<String, Object>> exported = underTest.exportSummary(USER);

        assertEquals(List.of(Map.of("id", "vo_1", "storyId", "snowy", "label", "Mum", "pages", 2, "bytes", 2 * MB)), exported);
    }

    @Test
    void anAccountWithNoVoiceSyncHasNothingToExport() {
        assertEquals(List.of(), underTest.exportSummary(USER));
    }

    @Test
    void listsPagesInReadingOrder() {
        HashMap<String, Long> unordered = new HashMap<>(Map.of("10", MB, "2", MB, "1", MB));
        VoiceOverRecord record = new VoiceOverRecord();
        record.setId("vo_9");
        record.setStoryId("snowy");
        record.setLabel("Dad");
        record.setPages(unordered);
        records.put("vo_9", record);

        assertEquals(List.of(1, 2, 10), underTest.list(USER).get(0).pages().stream().map(VoiceSyncService.PageLink::pageIndex).toList());
    }
}
