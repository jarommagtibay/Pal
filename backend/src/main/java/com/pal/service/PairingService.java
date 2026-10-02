package com.pal.service;

import com.pal.model.PairSession;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class PairingService {

    // Excludes ambiguous characters: 0/O, 1/I/L
    private static final String CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 6;
    private static final Duration EXPIRY = Duration.ofMinutes(5);

    private final Map<String, PairSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, String> codeToSessionId = new ConcurrentHashMap<>();

    public PairSession createSession() {
        String sessionId = UUID.randomUUID().toString();
        String code = generateCode();
        PairSession session = new PairSession(sessionId, code);
        sessions.put(sessionId, session);
        codeToSessionId.put(code, sessionId);
        return session;
    }

    public PairSession joinSession(String code) {
        String normalized = code.toUpperCase().trim();
        String sessionId = codeToSessionId.get(normalized);
        if (sessionId == null) {
            throw new IllegalArgumentException("Wrong code");
        }
        PairSession session = sessions.get(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("Wrong code");
        }
        if (session.getStatus() == PairSession.Status.EXPIRED) {
            throw new IllegalStateException("Code expired");
        }
        if (session.getStatus() != PairSession.Status.WAITING) {
            throw new IllegalStateException("Code already used");
        }
        session.setStatus(PairSession.Status.PAIRED);
        return session;
    }

    public PairSession getSession(String sessionId) {
        return sessions.get(sessionId);
    }

    @Scheduled(fixedRate = 30_000)
    public void expireOldSessions() {
        Instant cutoff = Instant.now().minus(EXPIRY);
        Instant purgeCutoff = Instant.now().minus(Duration.ofMinutes(60));
        sessions.entrySet().removeIf(entry -> {
            PairSession s = entry.getValue();
            if (s.getCreatedAt().isBefore(purgeCutoff)) {
                codeToSessionId.remove(s.getCode());
                return true;
            }
            if (s.getCreatedAt().isBefore(cutoff) && s.getStatus() == PairSession.Status.WAITING) {
                s.setStatus(PairSession.Status.EXPIRED);
            }
            return false;
        });
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        ThreadLocalRandom rng = ThreadLocalRandom.current();
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_CHARS.charAt(rng.nextInt(CODE_CHARS.length())));
        }
        String code = sb.toString();
        if (codeToSessionId.containsKey(code)) {
            return generateCode();
        }
        return code;
    }
}
