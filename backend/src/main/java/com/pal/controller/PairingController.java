package com.pal.controller;

import com.pal.model.PairSession;
import com.pal.service.PairingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/pair")
public class PairingController {

    private final PairingService pairingService;

    public PairingController(PairingService pairingService) {
        this.pairingService = pairingService;
    }

    @PostMapping("/create")
    public ResponseEntity<Map<String, String>> createPairing() {
        PairSession session = pairingService.createSession();
        return ResponseEntity.ok(Map.of(
                "sessionId", session.getSessionId(),
                "code", session.getCode()
        ));
    }

    @PostMapping("/join")
    public ResponseEntity<Map<String, String>> joinPairing(@RequestBody Map<String, String> request) {
        String code = request.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Code is required"));
        }
        
        try {
            PairSession session = pairingService.joinSession(code);
            return ResponseEntity.ok(Map.of("sessionId", session.getSessionId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(410).body(Map.of("error", e.getMessage()));
        }
    }
}
