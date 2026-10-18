package com.app.service;

public enum Tier {
    FREE(2),
    BASIC(50),
    PREMIUM(125);

    private final int downloadLimit;

    Tier(int downloadLimit) {
        this.downloadLimit = downloadLimit;
    }

    public int downloadLimit() {
        return downloadLimit;
    }

    public boolean isPaid() {
        return this != FREE;
    }
}
