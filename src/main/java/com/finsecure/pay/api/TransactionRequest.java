package com.finsecure.pay.api;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Inbound transaction. Bean Validation catches malformed input before the rules run. */
public record TransactionRequest(
        @NotBlank String transactionId,
        @NotBlank String accountId,
        @NotNull BigDecimal amount,
        @NotBlank String currency,
        @NotNull Instant timestamp) {
}
