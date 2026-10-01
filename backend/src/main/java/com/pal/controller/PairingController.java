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
            return ResponseEntity.badRequest().build();
        }
        
        PairSession session = pairingService.joinSession(code);
        if (session == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Invalid or expired code"));
        }
        
        return ResponseEntity.ok(Map.of(
                "sessionId", session.getSessionId()
        ));
    }
}
