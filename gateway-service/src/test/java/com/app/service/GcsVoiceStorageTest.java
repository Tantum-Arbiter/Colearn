package com.app.service;

import com.google.api.gax.paging.Page;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.net.URL;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GcsVoiceStorageTest {

    private final Storage storage = mock(Storage.class);

    @Test
    void isOffWithoutABucket() {
        assertFalse(new GcsVoiceStorage(storage, " ").configured());
        assertTrue(new GcsVoiceStorage(storage, "voice-bucket").configured());
    }

    @Test
    void signsAnUploadForTheObjectInTheVoiceBucket_withItsContentType_forTheTimeAsked() throws Exception {
        when(storage.signUrl(any(BlobInfo.class), anyLong(), any(TimeUnit.class), any(Storage.SignUrlOption[].class)))
                .thenReturn(new URL("https://signed.example/upload"));

        String url = new GcsVoiceStorage(storage, "voice-bucket").signedUpload("voice/u/vo_1/1.m4a", "audio/mp4", 1000, Duration.ofMinutes(15));

        ArgumentCaptor<BlobInfo> blob = ArgumentCaptor.forClass(BlobInfo.class);
        verify(storage).signUrl(blob.capture(), eq(900L), eq(TimeUnit.SECONDS), any(Storage.SignUrlOption[].class));
        assertEquals(BlobId.of("voice-bucket", "voice/u/vo_1/1.m4a"), blob.getValue().getBlobId());
        assertEquals("audio/mp4", blob.getValue().getContentType());
        assertEquals("https://signed.example/upload", url);
    }

    @Test
    void signsADownloadForTheObjectInTheVoiceBucket() throws Exception {
        when(storage.signUrl(any(BlobInfo.class), anyLong(), any(TimeUnit.class), any(Storage.SignUrlOption[].class)))
                .thenReturn(new URL("https://signed.example/download"));

        String url = new GcsVoiceStorage(storage, "voice-bucket").signedDownload("voice/u/vo_1/1.m4a", Duration.ofMinutes(15));

        ArgumentCaptor<BlobInfo> blob = ArgumentCaptor.forClass(BlobInfo.class);
        verify(storage).signUrl(blob.capture(), eq(900L), eq(TimeUnit.SECONDS), any(Storage.SignUrlOption[].class));
        assertEquals(BlobId.of("voice-bucket", "voice/u/vo_1/1.m4a"), blob.getValue().getBlobId());
        assertEquals("https://signed.example/download", url);
    }

    @Test
    @SuppressWarnings("unchecked")
    void deletesEveryObjectUnderThePrefix() {
        Blob first = mock(Blob.class);
        Blob second = mock(Blob.class);
        when(first.getBlobId()).thenReturn(BlobId.of("voice-bucket", "voice/u/vo_1/1.m4a"));
        when(second.getBlobId()).thenReturn(BlobId.of("voice-bucket", "voice/u/vo_1/2.m4a"));
        Page<Blob> page = mock(Page.class);
        when(page.iterateAll()).thenReturn(List.of(first, second));
        when(storage.list(eq("voice-bucket"), any(Storage.BlobListOption[].class))).thenReturn(page);
        when(storage.delete(any(BlobId.class))).thenReturn(true);

        int deleted = new GcsVoiceStorage(storage, "voice-bucket").deletePrefix("voice/u/");

        assertEquals(2, deleted);
        verify(storage).delete(BlobId.of("voice-bucket", "voice/u/vo_1/1.m4a"));
        verify(storage).delete(BlobId.of("voice-bucket", "voice/u/vo_1/2.m4a"));
    }
}
