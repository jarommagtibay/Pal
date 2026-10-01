package com.pal.model;

import java.time.Instant;

public class PairSession {

    public enum Status {
        WAITING, PAIRED, EXPIRED
    }

    private final String sessionId;
    private final String code;
    private final Instant createdAt;
    private volatile Status status;

    public PairSession(String sessionId, String code) {
        this.sessionId = sessionId;
        this.code = code;
        this.createdAt = Instant.now();
        this.status = Status.WAITING;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getCode() {
        return code;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }
}
