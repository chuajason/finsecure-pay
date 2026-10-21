package com.finsecure.pay;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.finsecure.pay.api.TransactionRequest;
import com.finsecure.pay.config.ValidationProperties;
import com.finsecure.pay.validation.TransactionValidator;

/** Unit tests for the rules themselves, with a fixed clock so results are deterministic. */
class TransactionValidatorTest {

    private static final Instant NOW = Instant.parse("2026-10-21T10:00:00Z");

    private TransactionValidator validator;

    @BeforeEach
    void setUp() {
        ValidationProperties props = new ValidationProperties(
                new BigDecimal("10000.00"), List.of("SGD", "USD", "EUR"), 3, 120);
        validator = new TransactionValidator(props, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static TransactionRequest tx(String id, String account, String amount, String ccy, Instant ts) {
        return new TransactionRequest(id, account, new BigDecimal(amount), ccy, ts);
    }

    @Test
    @DisplayName("A well-formed transaction within limits is approved")
    void approvesValidTransaction() {
        assertThat(validator.validate(tx("t-1", "acc-1", "250.00", "SGD", NOW))).isEmpty();
    }

    @Test
    @DisplayName("Amount above the configured limit is rejected")
    void rejectsAmountOverLimit() {
        assertThat(validator.validate(tx("t-2", "acc-1", "10000.01", "SGD", NOW)))
                .containsExactly("AMOUNT_EXCEEDS_LIMIT");
    }

    @Test
    @DisplayName("Boundary: exactly the limit is still approved")
    void approvesAmountAtLimit() {
        assertThat(validator.validate(tx("t-3", "acc-1", "10000.00", "SGD", NOW))).isEmpty();
    }

    @Test
    @DisplayName("Zero and negative amounts are rejected")
    void rejectsNonPositiveAmount() {
        assertThat(validator.validate(tx("t-4", "acc-1", "0.00", "SGD", NOW))).contains("AMOUNT_NOT_POSITIVE");
        assertThat(validator.validate(tx("t-5", "acc-1", "-5.00", "SGD", NOW))).contains("AMOUNT_NOT_POSITIVE");
    }

    @Test
    @DisplayName("Unsupported currency is rejected, supported currency is case-insensitive")
    void checksCurrency() {
        assertThat(validator.validate(tx("t-6", "acc-1", "10.00", "JPY", NOW))).containsExactly("CURRENCY_NOT_SUPPORTED");
        assertThat(validator.validate(tx("t-7", "acc-1", "10.00", "usd", NOW))).isEmpty();
    }

    @Test
    @DisplayName("Timestamps in the future or older than a day are rejected")
    void checksTimestamp() {
        assertThat(validator.validate(tx("t-8", "acc-1", "10.00", "SGD", NOW.plusSeconds(600))))
                .containsExactly("TIMESTAMP_IN_FUTURE");
        assertThat(validator.validate(tx("t-9", "acc-1", "10.00", "SGD", NOW.minusSeconds(90_000))))
                .containsExactly("TIMESTAMP_TOO_OLD");
        assertThat(validator.validate(tx("t-10", "acc-1", "10.00", "SGD", NOW.plusSeconds(60)))).isEmpty();
    }

    @Test
    @DisplayName("A transaction id that was already approved is rejected as a duplicate")
    void rejectsDuplicate() {
        assertThat(validator.validate(tx("t-11", "acc-1", "10.00", "SGD", NOW))).isEmpty();
        assertThat(validator.validate(tx("t-11", "acc-1", "10.00", "SGD", NOW))).containsExactly("DUPLICATE_TRANSACTION_ID");
    }

    @Test
    @DisplayName("More than the allowed transactions per minute for one account is rejected")
    void rejectsVelocity() {
        for (int i = 0; i < 3; i++) {
            assertThat(validator.validate(tx("v-" + i, "acc-9", "1.00", "SGD", NOW))).isEmpty();
        }
        assertThat(validator.validate(tx("v-4", "acc-9", "1.00", "SGD", NOW))).containsExactly("VELOCITY_LIMIT_EXCEEDED");
        // a different account is unaffected
        assertThat(validator.validate(tx("v-5", "acc-10", "1.00", "SGD", NOW))).isEmpty();
    }

    @Test
    @DisplayName("Several problems are all reported together")
    void reportsAllReasons() {
        List<String> reasons = validator.validate(tx("t-12", "acc-1", "20000.00", "XXX", NOW.plusSeconds(600)));
        assertThat(reasons).containsExactlyInAnyOrder("AMOUNT_EXCEEDS_LIMIT", "CURRENCY_NOT_SUPPORTED", "TIMESTAMP_IN_FUTURE");
    }
}
