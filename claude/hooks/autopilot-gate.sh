#!/bin/bash

# Autopilot Gate Hook
# Checks phase gate criteria before allowing certain operations

set -e

AUTOPILOT_FILE=".sisyphus/autopilot.json"

# Skip if no autopilot is active
if [ ! -f "$AUTOPILOT_FILE" ]; then
    exit 0
fi

# Read autopilot state
AUTOPILOT_STATUS=$(cat "$AUTOPILOT_FILE" | jq -r '.status')
CURRENT_PHASE=$(cat "$AUTOPILOT_FILE" | jq -r '.current_phase')
PHASE_STATUS=$(cat "$AUTOPILOT_FILE" | jq -r ".phases[\"$CURRENT_PHASE\"].status")

# Skip if autopilot is not running
if [ "$AUTOPILOT_STATUS" != "running" ]; then
    exit 0
fi

# Function to check if we should block
check_phase_gate() {
    local phase=$1

    case $phase in
        0)
            # Expansion phase - Metis should create spec
            local spec_output=$(cat "$AUTOPILOT_FILE" | jq -r '.phases["0"].output')
            if [ "$spec_output" = "null" ] || [ -z "$spec_output" ]; then
                echo "WARNING: Autopilot Phase 0 (Expansion) in progress. Waiting for spec file."
            fi
            ;;
        1)
            # Planning phase - Prometheus should create plan
            local plan_output=$(cat "$AUTOPILOT_FILE" | jq -r '.phases["1"].output')
            if [ "$plan_output" = "null" ] || [ -z "$plan_output" ]; then
                echo "WARNING: Autopilot Phase 1 (Planning) in progress. Waiting for plan file."
            fi
            ;;
        2)
            # Execution phase - tasks should be completed
            local done=$(cat "$AUTOPILOT_FILE" | jq -r '.phases["2"].progress.done // 0')
            local total=$(cat "$AUTOPILOT_FILE" | jq -r '.phases["2"].progress.total // 0')
            if [ "$total" -gt 0 ] && [ "$done" -lt "$total" ]; then
                echo "INFO: Autopilot Phase 2 (Execution) in progress. $done/$total tasks completed."
            fi
            ;;
        3)
            # QA phase - build/lint/tests should pass
            local build=$(cat "$AUTOPILOT_FILE" | jq -r '.phases["3"].results.build // false')
            local lint=$(cat "$AUTOPILOT_FILE" | jq -r '.phases["3"].results.lint // false')
            local tests=$(cat "$AUTOPILOT_FILE" | jq -r '.phases["3"].results.tests // false')
            if [ "$build" != "true" ] || [ "$lint" != "true" ] || [ "$tests" != "true" ]; then
                echo "INFO: Autopilot Phase 3 (QA) in progress. build=$build lint=$lint tests=$tests"
            fi
            ;;
        4)
            # Validation phase - Oracle review
            local blocking=$(cat "$AUTOPILOT_FILE" | jq -r '.phases["4"].findings.blocking_issues // -1')
            if [ "$blocking" = "-1" ]; then
                echo "INFO: Autopilot Phase 4 (Validation) in progress. Waiting for Oracle review."
            elif [ "$blocking" -gt 0 ]; then
                echo "WARNING: Autopilot Phase 4 has $blocking blocking issues."
            fi
            ;;
    esac
}

# Run check
check_phase_gate "$CURRENT_PHASE"

# Always allow (this is informational only)
exit 0
