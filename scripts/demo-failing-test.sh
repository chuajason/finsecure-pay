#!/usr/bin/env bash
# Task 4 evidence: introduce a controlled failing test, push, watch Jenkins fail and NOT deploy.
# Usage: scripts/demo-failing-test.sh break   # commits the failing test
#        scripts/demo-failing-test.sh fix     # reverts it
set -euo pipefail
F=src/test/java/com/finsecure/pay/DemoFailingTest.java
case "${1:-}" in
  break)
    cat > "$F" <<'JAVA'
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
JAVA
    git add "$F"; git commit -m "demo: introduce controlled failing test (expect pipeline to fail)"; git push
    ;;
  fix)
    git rm -q "$F"; git commit -m "demo: remove controlled failing test"; git push
    ;;
  *) echo "usage: $0 break|fix"; exit 2;;
esac
