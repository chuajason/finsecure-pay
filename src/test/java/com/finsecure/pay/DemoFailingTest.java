package com.finsecure.pay;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Deliberately failing test used to demonstrate that a red build never deploys. */
class DemoFailingTest {
    @Test
    void controlledFailure() {
        assertThat("pipeline-gate").isEqualTo("this test is meant to fail");
    }
}
