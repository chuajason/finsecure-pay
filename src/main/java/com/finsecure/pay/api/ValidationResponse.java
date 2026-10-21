package com.finsecure.pay.api;

import java.util.List;

public record ValidationResponse(String transactionId, String status, List<String> reasons) {

    public static ValidationResponse approved(String transactionId) {
        return new ValidationResponse(transactionId, "APPROVED", List.of());
    }

    public static ValidationResponse rejected(String transactionId, List<String> reasons) {
        return new ValidationResponse(transactionId, "REJECTED", reasons);
    }
}
