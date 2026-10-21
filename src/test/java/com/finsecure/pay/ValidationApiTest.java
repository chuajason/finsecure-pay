package com.finsecure.pay;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.actuate.observability.AutoConfigureObservability;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.finsecure.pay.validation.TransactionValidator;

/** HTTP-level tests: status codes, JSON shape, health and metrics endpoints. */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureObservability   // tests disable metrics export by default; the Prometheus endpoint needs it on
class ValidationApiTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private TransactionValidator validator;

    @BeforeEach
    void reset() {
        validator.reset();
    }

    private static String body(String id, String amount, String ccy) {
        return """
                {"transactionId":"%s","accountId":"acc-77","amount":%s,"currency":"%s","timestamp":"%s"}
                """.formatted(id, amount, ccy, Instant.now().toString());
    }

    @Test
    void validTransactionReturns200Approved() throws Exception {
        mvc.perform(post("/validate").contentType(MediaType.APPLICATION_JSON).content(body("api-1", "99.90", "SGD")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("APPROVED")))
                .andExpect(jsonPath("$.transactionId", is("api-1")));
    }

    @Test
    void rejectedTransactionReturns422WithReasons() throws Exception {
        mvc.perform(post("/validate").contentType(MediaType.APPLICATION_JSON).content(body("api-2", "50000.00", "SGD")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status", is("REJECTED")))
                .andExpect(jsonPath("$.reasons", hasItem("AMOUNT_EXCEEDS_LIMIT")));
    }

    @Test
    void missingFieldsReturn400() throws Exception {
        mvc.perform(post("/validate").contentType(MediaType.APPLICATION_JSON).content("{\"amount\": 10}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is("REJECTED")))
                .andExpect(jsonPath("$.reasons", hasItem("FIELD_TRANSACTIONID_NOTBLANK")));
    }

    @Test
    void malformedJsonReturns400() throws Exception {
        mvc.perform(post("/validate").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.reasons", hasItem("MALFORMED_REQUEST_BODY")));
    }

    @Test
    void healthEndpointReportsUp() throws Exception {
        mvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")))
                .andExpect(jsonPath("$.service", is("finsecure-pay")));
    }

    @Test
    void actuatorProbesAndPrometheusAreExposed() throws Exception {
        mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
        mvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());
        mvc.perform(get("/actuator/prometheus")).andExpect(status().isOk());
    }
}
