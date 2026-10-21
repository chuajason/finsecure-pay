package com.finsecure.pay.validation;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ArrayDeque;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.finsecure.pay.api.TransactionRequest;
import com.finsecure.pay.config.ValidationProperties;

/**
 * The business rules. Each rule appends a reason; a transaction is approved only when
 * no rule objected. State (seen ids, per-account history) is in memory, which is fine
 * for a single demo replica set and is called out as a limitation in the design doc.
 */
@Service
public class TransactionValidator {

    private final ValidationProperties props;
    private final Clock clock;
    private final Set<String> seenTransactionIds = ConcurrentHashMap.newKeySet();
    private final Map<String, Deque<Instant>> recentByAccount = new ConcurrentHashMap<>();

    public TransactionValidator(ValidationProperties props, Clock clock) {
        this.props = props;
        this.clock = clock;
    }

    public List<String> validate(TransactionRequest tx) {
        List<String> reasons = new ArrayList<>();
        Instant now = clock.instant();

        if (tx.amount().compareTo(BigDecimal.ZERO) <= 0) {
            reasons.add("AMOUNT_NOT_POSITIVE");
        } else if (tx.amount().compareTo(props.maxAmount()) > 0) {
            reasons.add("AMOUNT_EXCEEDS_LIMIT");
        }
        if (tx.amount().scale() > 2) {
            reasons.add("AMOUNT_TOO_MANY_DECIMALS");
        }
        if (!props.allowedCurrencies().contains(tx.currency().toUpperCase())) {
            reasons.add("CURRENCY_NOT_SUPPORTED");
        }
        if (tx.timestamp().isAfter(now.plusSeconds(props.clockSkewSeconds()))) {
            reasons.add("TIMESTAMP_IN_FUTURE");
        }
        if (tx.timestamp().isBefore(now.minus(Duration.ofDays(1)))) {
            reasons.add("TIMESTAMP_TOO_OLD");
        }
        if (seenTransactionIds.contains(tx.transactionId())) {
            reasons.add("DUPLICATE_TRANSACTION_ID");
        }
        if (exceedsVelocity(tx.accountId(), now)) {
            reasons.add("VELOCITY_LIMIT_EXCEEDED");
        }

        if (reasons.isEmpty()) {
            seenTransactionIds.add(tx.transactionId());
            recordForVelocity(tx.accountId(), now);
        }
        return reasons;
    }

    private boolean exceedsVelocity(String accountId, Instant now) {
        Deque<Instant> history = recentByAccount.get(accountId);
        if (history == null) {
            return false;
        }
        Instant windowStart = now.minusSeconds(60);
        synchronized (history) {
            while (!history.isEmpty() && history.peekFirst().isBefore(windowStart)) {
                history.pollFirst();
            }
            return history.size() >= props.maxTransactionsPerMinute();
        }
    }

    private void recordForVelocity(String accountId, Instant now) {
        Deque<Instant> history = recentByAccount.computeIfAbsent(accountId, k -> new ArrayDeque<>());
        synchronized (history) {
            history.addLast(now);
        }
    }

    /** Test and operations hook: clears in-memory state. */
    public void reset() {
        seenTransactionIds.clear();
        recentByAccount.clear();
    }
}
