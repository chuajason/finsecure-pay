package com.finsecure.pay.config;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Validation limits. Every value here is overridable from the Kubernetes ConfigMap
 * through environment variables (for example FINSECURE_VALIDATION_MAX_AMOUNT), so the
 * same image behaves differently per environment without a rebuild.
 */
@ConfigurationProperties(prefix = "finsecure.validation")
public record ValidationProperties(
        BigDecimal maxAmount,
        List<String> allowedCurrencies,
        int maxTransactionsPerMinute,
        int clockSkewSeconds) {

    public ValidationProperties {
        if (maxAmount == null) {
            maxAmount = new BigDecimal("10000.00");
        }
        if (allowedCurrencies == null || allowedCurrencies.isEmpty()) {
            allowedCurrencies = List.of("SGD", "USD", "EUR");
        }
        if (maxTransactionsPerMinute <= 0) {
            maxTransactionsPerMinute = 5;
        }
        if (clockSkewSeconds <= 0) {
            clockSkewSeconds = 120;
        }
    }
}
