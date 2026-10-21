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
    private final Instant startedAt = Instant.now();

    public HealthController(@Value("${finsecure.version:dev}") String version) {
        this.version = version;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "service", "finsecure-pay",
                "version", version,
                "startedAt", startedAt.toString(),
                "time", Instant.now().toString());
    }
}
