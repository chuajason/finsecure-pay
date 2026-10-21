package com.finsecure.pay.api;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.finsecure.pay.validation.TransactionValidator;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.validation.Valid;

@RestController
public class ValidationController {

    private static final Logger log = LoggerFactory.getLogger(ValidationController.class);

    private final TransactionValidator validator;
    private final Counter approved;
    private final Counter rejected;

    public ValidationController(TransactionValidator validator, MeterRegistry registry) {
        this.validator = validator;
        this.approved = Counter.builder("finsecure_validations_total").tag("result", "approved")
                .description("Transactions approved").register(registry);
        this.rejected = Counter.builder("finsecure_validations_total").tag("result", "rejected")
                .description("Transactions rejected").register(registry);
    }

    @PostMapping("/validate")
    public ResponseEntity<ValidationResponse> validate(@Valid @RequestBody TransactionRequest tx) {
        List<String> reasons = validator.validate(tx);
        if (reasons.isEmpty()) {
            approved.increment();
            log.info("validation result=APPROVED txId={} account={} amount={} {}",
                    tx.transactionId(), tx.accountId(), tx.amount(), tx.currency());
            return ResponseEntity.ok(ValidationResponse.approved(tx.transactionId()));
        }
        rejected.increment();
        log.warn("validation result=REJECTED txId={} account={} reasons={}",
                tx.transactionId(), tx.accountId(), reasons);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ValidationResponse.rejected(tx.transactionId(), reasons));
    }
}
