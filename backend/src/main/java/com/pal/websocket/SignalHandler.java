package com.pal.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class SignalHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(SignalHandler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Map sessionId -> list of connected WebSocket sessions
    private final Map<String, CopyOnWriteArrayList<WebSocketSession>> sessionPeers = new ConcurrentHashMap<>();
    // Map webSocketSessionId -> sessionId
    private final Map<String, String> socketToSession = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("WebSocket connected: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        JsonNode jsonNode;
        try {
            jsonNode = objectMapper.readTree(payload);
        } catch (Exception e) {
            log.warn("Invalid JSON received", e);
            return;
        }

        String type = jsonNode.has("type") ? jsonNode.get("type").asText() : "";
        String sessionId = jsonNode.has("sessionId") ? jsonNode.get("sessionId").asText() : null;

        if ("JOIN".equals(type) && sessionId != null) {
            // Register this socket to the session
            socketToSession.put(session.getId(), sessionId);
            CopyOnWriteArrayList<WebSocketSession> peers = sessionPeers.computeIfAbsent(sessionId, k -> new CopyOnWriteArrayList<>());
            
            if (peers.size() >= 2) {
                // Already 2 peers, reject
                log.warn("Session {} is full", sessionId);
                session.close(CloseStatus.NOT_ACCEPTABLE);
                return;
            }
            
            peers.add(session);
            log.info("Socket {} joined session {}. Total peers: {}", session.getId(), sessionId, peers.size());

            // If 2 peers are now connected, notify both
            if (peers.size() == 2) {
                broadcastToSession(sessionId, "{\"type\":\"PEER_JOINED\"}", null);
            }
        } else {
            // Relay signaling message to other peers in the same session
            String currentSessionId = socketToSession.get(session.getId());
            if (currentSessionId != null) {
                broadcastToSession(currentSessionId, payload, session.getId());
            } else {
                log.warn("Received message from socket {} before JOIN", session.getId());
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.info("WebSocket closed: {}", session.getId());
        String sessionId = socketToSession.remove(session.getId());
        if (sessionId != null) {
            CopyOnWriteArrayList<WebSocketSession> peers = sessionPeers.get(sessionId);
            if (peers != null) {
                peers.remove(session);
                // Notify remaining peers
                broadcastToSession(sessionId, "{\"type\":\"PEER_LEFT\"}", null);
                if (peers.isEmpty()) {
                    sessionPeers.remove(sessionId);
                }
            }
        }
    }

    private void broadcastToSession(String sessionId, String message, String excludeSocketId) {
        CopyOnWriteArrayList<WebSocketSession> peers = sessionPeers.get(sessionId);
        if (peers != null) {
            TextMessage textMessage = new TextMessage(message);
            for (WebSocketSession peer : peers) {
                if (excludeSocketId == null || !peer.getId().equals(excludeSocketId)) {
                    try {
                        if (peer.isOpen()) {
                            peer.sendMessage(textMessage);
                        }
                    } catch (IOException e) {
                        log.error("Failed to send message to peer {}", peer.getId(), e);
                    }
                }
            }
        }
    }
}
