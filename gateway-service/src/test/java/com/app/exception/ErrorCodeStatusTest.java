package com.app.exception;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ErrorCodeStatusTest {

    @ParameterizedTest
    @CsvSource({
            "ACCOUNT_DELETION_FAILED, 500",
            "PROFILE_UPDATE_FAILED, 500",
            "ACCOUNT_DELETION_IN_PROGRESS, 409",
            "USER_NOT_FOUND, 404",
            "PROFILE_NOT_FOUND, 404",
            "DATABASE_ERROR, 500",
            "INVALID_NICKNAME, 400",
            "UNAUTHORIZED_ACCESS, 401",
            "SUBSCRIPTION_REQUIRED, 403",
            "DOWNLOAD_LIMIT_REACHED, 403",
            "CHILD_VERSION_CONFLICT, 409"
    })
    void mapsEachCodeToTheStatusThatDescribesIt(ErrorCode code, int status) {
        assertEquals(status, code.getHttpStatusCode());
    }
}
