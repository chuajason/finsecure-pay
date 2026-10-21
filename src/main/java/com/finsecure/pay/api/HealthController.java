package com.finsecure.pay.api;

import java.time.Instant;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Simple application-level health endpoint required by the brief. Kubernetes probes use
 * the Actuator liveness and readiness endpoints, which also reflect application state.
 */
@RestController
public class HealthController {

    private final String version;
    private final boolean apiKeyConfigured;
    private final Instant startedAt = Instant.now();

    public HealthController(@Value("${finsecure.version:dev}") String version,
                            @Value("${FINSECURE_API_KEY:}") String apiKey) {
        this.version = version;
        // The secret value is never exposed; health only reports that it was injected.
        this.apiKeyConfigured = apiKey != null && !apiKey.isBlank();
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "service", "finsecure-pay",
                "version", version,
                "apiKeyConfigured", apiKeyConfigured,
                "startedAt", startedAt.toString(),
                "time", Instant.now().toString());
    }
}
