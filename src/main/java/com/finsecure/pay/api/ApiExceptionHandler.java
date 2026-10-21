package com.finsecure.pay.api;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Malformed input is a 400 with field-level reasons, never a stack trace. */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationResponse> onInvalid(MethodArgumentNotValidException ex) {
        List<String> reasons = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> "FIELD_" + e.getField().toUpperCase() + "_" + describe(e.getCode()))
                .sorted()
                .toList();
        return ResponseEntity.badRequest().body(ValidationResponse.rejected("unknown", reasons));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ValidationResponse> onUnreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ValidationResponse.rejected("unknown", List.of("MALFORMED_REQUEST_BODY")));
    }

    private static String describe(String code) {
        return code == null ? "INVALID" : code.toUpperCase();
    }
}
