# Survey ZK Platform — Phase 4

## Phase 4 status

The participant-flow application layer is complete:

- private demographic form stays in browser state
- browser proof generation boundary is used
- proof is sent to `/surveys/:id/verify`
- backend checks survey + eligibility binding
- successful verification issues a 10-minute eligibility token
- answers are submitted with the token + survey-specific nullifier
- raw demographic values are never included in the response payload
- duplicate submissions are blocked by the database unique constraint
- token is cleared from client state after successful submission

## Important Midnight note

The cryptographic proof generator/verifier remains behind the Phase 3 Midnight runtime adapter. The current environment used to assemble this ZIP does not include the Compact compiler, generated contract artifacts, or a running Midnight proof server, so this ZIP does not claim an end-to-end cryptographic proof run.

Before demoing, initialize the generated Midnight contract/proof-provider runtime and configure `configureMidnightProofGenerator(...)` and `configureMidnightVerifier(...)` with the real generated bindings.

Midnight's current documentation is the source of truth for the SDK/provider APIs and current network/tool versions.
