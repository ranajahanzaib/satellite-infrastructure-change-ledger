# Human Verification Workflow & State Machine

Human analyst verification is a core requirement of the ledger. Automated inferences never overwrite or silently mutate the registry.

```mermaid
stateDiagram-v2
    [*] --> detected: Automated Ensemble Pipeline Run
    detected --> under_review: Analyst Opens Review Workbench
    under_review --> verified: Analyst Confirms (Reason + Category)
    under_review --> rejected: Analyst Rejects (e.g. Seasonal/Shadow)
    under_review --> needs_more_evidence: Insufficient Resolution / Need More Dates
    needs_more_evidence --> under_review: Subsequent Imagery Acquired
    verified --> superseded: Later Structural Expansion Revision
```

## Concurrency Control

Every verification decision requires sending `concurrency_version` matching the candidate's current `revision_number`. If another analyst modified or verified the candidate concurrently, the API returns `409 Conflict`, preventing silent overwrites.

## Immutable Revisions

When a candidate is verified or rejected:

1. The candidate's `revision_number` increments.
2. An immutable `ChangeRevision` is written recording previous status, new status, decision reason, corrected category, and analyst notes.
3. An `AuditEvent` is written with analyst ID, action type, and IP address.
