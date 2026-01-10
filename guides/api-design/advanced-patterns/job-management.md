# Job Management (Long-Running Operations)

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 14 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic HTTP knowledge  
> **🎯 Key Topics:** Data
> 
> **📊 Complexity:** 10.6 grade level • 0.8% technical density • fairly difficult

## Overview

Job management is a set of HTTP patterns for running long-running work in the background while keeping good client UX and operational safety.

A “job” is a server-side resource that represents:
- A request to do work (input)
- The current state of that work (status and progress)
- The outcome (result or error)
- Lifecycle controls (cancel, retry, expiration, cleanup)

This pattern builds on the `202 Accepted` async pattern, but goes deeper. It defines how jobs behave after acceptance: queueing, progress, cancellation, retries, and retention.

## When to Use Jobs

Use job management when an operation:
- Commonly exceeds HTTP timeouts (often > 30 seconds)
- Processes large files or datasets
- Calls slow or variable-latency dependencies
- Can be retried safely after transient failures
- Needs progress updates or status visibility
- Produces a result that should be downloaded later

Avoid jobs for work that reliably completes in a few seconds. Prefer a normal synchronous request/response in those cases.

## Core Design Goals

A production job API should make these things true:
- **No lost work**: accepted jobs are durable and discoverable.
- **Clear status**: clients can tell whether work is queued, running, done, failed, or cancelled.
- **Safe retries**: clients can submit safely even with network failures.
- **Controlled lifecycle**: clients can cancel and clean up; the server can expire and purge.
- **Operational visibility**: operators can measure queues, failure rates, and latency.

## Job Resource Model

A job is a resource with stable identity.

Recommended fields:
- `jobId`: stable identifier
- `type`: what kind of job this is (export, import, rebuildIndex)
- `status`: lifecycle state
- `createdAt`, `startedAt`, `completedAt`, `cancelledAt`, `expiresAt`: timestamps
- `progress`: optional progress snapshot
- `result`: present when complete
- `failure`: present when failed
- `links`: URLs for status, cancellation, result download

Example job representation:

```json
{
  "jobId": "job-123",
  "type": "export",
  "status": "PROCESSING",
  "createdAt": "2024-01-15T10:30:00Z",
  "startedAt": "2024-01-15T10:31:00Z",
  "progress": {
    "percentage": 45,
    "phase": "EXPORTING_RECORDS",
    "stepsCompleted": 2,
    "stepsTotal": 5,
    "itemsProcessed": 4500,
    "itemsTotal": 10000,
    "updatedAt": "2024-01-15T10:33:10Z"
  },
  "links": {
    "self": "/v1/jobs/job-123",
    "events": "/v1/jobs/job-123/events",
    "cancel": "/v1/jobs/job-123/cancel"
  }
}
```

## Job Lifecycle States

Use a small, clear state machine with explicit terminal states.

Recommended states:

| State | Meaning | Terminal | Typical Next States |
|------|---------|----------|---------------------|
| `QUEUED` | Accepted and waiting to start | No | `PROCESSING`, `CANCELLED` |
| `PROCESSING` | Work is running | No | `COMPLETED`, `FAILED`, `CANCELLING` |
| `CANCELLING` | Cancellation requested, cleanup in progress | No | `CANCELLED`, `COMPLETED`, `FAILED` |
| `CANCELLED` | Job stopped due to cancellation | Yes | None |
| `COMPLETED` | Job finished successfully | Yes | None |
| `FAILED` | Job ended in failure (after retries) | Yes | None |

Notes:
- `CANCELLING` is useful when cancellation is cooperative and not immediate.
- If a job completes while cancellation is in progress, treat `COMPLETED` as authoritative.

## Job Submission API

### Submit a Job

Use `POST` to create a job. Return `202 Accepted` with a durable job ID and a status URL.

```http
POST /v1/jobs HTTP/1.1
Content-Type: application/json
Idempotency-Key: 8d0bb8a6-0aa1-4eaf-a300-bf2b6dd7f268

{
  "type": "export",
  "params": {
    "format": "csv",
    "filters": {
      "dateRange": {
        "start": "2024-01-01",
        "end": "2024-01-31"
      }
    }
  }
}

HTTP/1.1 202 Accepted
Location: /v1/jobs/job-123
Content-Type: application/json

{
  "jobId": "job-123",
  "status": "QUEUED",
  "createdAt": "2024-01-15T10:30:00Z",
  "estimatedDuration": "PT5M",
  "links": {
    "self": "/v1/jobs/job-123",
    "cancel": "/v1/jobs/job-123/cancel",
    "events": "/v1/jobs/job-123/events"
  }
}
```

Submission guidelines:
- Prefer `202 Accepted` for long-running jobs. Do not hold the connection open.
- Include a `Location` header pointing to the job resource.
- Consider an `Idempotency-Key` header so clients can safely retry the submission request.

### Idempotency for Safe Submission

Clients may retry `POST /v1/jobs` due to timeouts or network errors. Without idempotency, a client can create duplicate jobs.

Common approach:
- Accept `Idempotency-Key` on job submission.
- If the same key is used with the same authenticated principal and an equivalent payload within a defined window, return the original job.
- If the same key is reused with a different payload, return an error.

Example response for key reuse with a conflicting payload:

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/idempotency-key-conflict",
  "title": "Idempotency key reused with different request",
  "status": 409,
  "detail": "The Idempotency-Key was already used for a different job submission.",
  "instance": "/v1/jobs"
}
```

## Status and Progress Reporting

### Polling: Get Job Status

Clients poll the job resource to track status.

```http
GET /v1/jobs/job-123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json
Retry-After: 30

{
  "jobId": "job-123",
  "type": "export",
  "status": "PROCESSING",
  "createdAt": "2024-01-15T10:30:00Z",
  "startedAt": "2024-01-15T10:31:00Z",
  "progress": {
    "percentage": 45,
    "phase": "EXPORTING_RECORDS",
    "stepsCompleted": 2,
    "stepsTotal": 5,
    "itemsProcessed": 4500,
    "itemsTotal": 10000,
    "updatedAt": "2024-01-15T10:33:10Z"
  },
  "estimatedCompletion": "2024-01-15T10:36:00Z",
  "links": {
    "self": "/v1/jobs/job-123",
    "cancel": "/v1/jobs/job-123/cancel",
    "events": "/v1/jobs/job-123/events"
  }
}
```

Polling guidelines:
- Use `Retry-After` to recommend a minimum polling interval.
- Consider returning a `pollInterval` field if you want clients to display a countdown.
- Do not promise precise completion time. Treat `estimatedCompletion` as advisory.

### Progress Data Model

Progress can be:
- **Percentage-based** (simple progress bar)
- **Count-based** (items processed vs total)
- **Phase-based** (multi-step workflows)

Design rules:
- Always include enough information for clients to show useful UI without guessing.
- Keep progress updates monotonic when possible (avoid jumping backward).
- If total work is unknown, omit `itemsTotal` and rely on phases or messages.

### Real-Time Updates with Server-Sent Events (SSE)

SSE streams progress updates over HTTP.

```http
GET /v1/jobs/job-123/events HTTP/1.1
Accept: text/event-stream

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

id: 1
event: progress
data: {"jobId":"job-123","status":"PROCESSING","progress":{"percentage":45,"phase":"EXPORTING_RECORDS"}}

id: 2
event: progress
data: {"jobId":"job-123","status":"PROCESSING","progress":{"percentage":50,"phase":"EXPORTING_RECORDS"}}

id: 3
event: completed
data: {"jobId":"job-123","status":"COMPLETED","completedAt":"2024-01-15T10:34:22Z"}
```

SSE guidelines:
- Keep event payloads small and frequent rather than large and rare.
- Include `id` values so clients can resume after reconnects.
- Ensure the SSE endpoint is authorized the same way as `GET /v1/jobs/{jobId}`.

## Completion and Result Handling

### Completed Job with Downloadable Result

For large results, return a result object that points to a download URL.

```http
GET /v1/jobs/job-123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "jobId": "job-123",
  "type": "export",
  "status": "COMPLETED",
  "createdAt": "2024-01-15T10:30:00Z",
  "completedAt": "2024-01-15T10:34:22Z",
  "result": {
    "mediaType": "text/csv",
    "downloadUrl": "https://storage.example.com/exports/abc123",
    "sizeBytes": 1048576,
    "checksum": {
      "algorithm": "sha256",
      "value": "b1f0c2b6c3b3e5e1a2e7f8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8"
    },
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}
```

Result guidelines:
- Prefer time-limited download URLs for large files.
- Include `expiresAt` when the link is time-limited.
- Include integrity metadata (like a checksum) when clients need to verify downloads.

### Expiration Headers (For Download Responses)

When the job result is served directly by your API, include standard cache and expiry headers.

```http
GET /v1/jobs/job-123/result HTTP/1.1

HTTP/1.1 200 OK
Content-Type: text/csv
Cache-Control: private, max-age=86400
Expires: Tue, 16 Jan 2024 10:30:00 GMT

id,amount,currency
...
```

### Job Not Found vs Expired

If a job never existed (or the caller is not authorized), return `404 Not Found`.

```http
GET /v1/jobs/job-999 HTTP/1.1

HTTP/1.1 404 Not Found
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/job-not-found",
  "title": "Job not found",
  "status": 404,
  "detail": "No job with id 'job-999' was found.",
  "instance": "/v1/jobs/job-999"
}
```

If a job existed but was removed due to retention policy, return `410 Gone`.

```http
GET /v1/jobs/job-123 HTTP/1.1

HTTP/1.1 410 Gone
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/job-expired",
  "title": "Job expired",
  "status": 410,
  "detail": "This job is no longer available. Job metadata is retained for 24 hours.",
  "instance": "/v1/jobs/job-123",
  "expiredAt": "2024-01-16T10:30:00Z"
}
```

## Cancellation API

Cancellation should be safe to call multiple times.

### Request Cancellation

```http
POST /v1/jobs/job-123/cancel HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "jobId": "job-123",
  "status": "CANCELLING",
  "message": "Cancellation requested",
  "cancelRequestedAt": "2024-01-15T10:33:00Z"
}
```

Cancellation guidelines:
- If the job is `QUEUED`, cancellation may be immediate.
- If the job is `PROCESSING`, cancellation is often cooperative and may take time.
- If the job is already in a terminal state, return the current state (idempotent behavior).

### Confirm Cancellation

```http
GET /v1/jobs/job-123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "jobId": "job-123",
  "status": "CANCELLED",
  "cancelledAt": "2024-01-15T10:33:12Z",
  "cancelledBy": "user-456"
}
```

## Retries, Failures, and Dead Letter Handling

Long-running jobs fail for many reasons: transient network errors, timeouts, resource limits, or invalid inputs. Your API should make failure visible and predictable.

### Failed Job Representation

Include:
- A stable status (`FAILED`)
- Attempt metadata (`attempts`, `maxAttempts`)
- A structured error payload
- Whether a retry is allowed

```json
{
  "jobId": "job-123",
  "type": "export",
  "status": "FAILED",
  "createdAt": "2024-01-15T10:30:00Z",
  "failedAt": "2024-01-15T10:35:00Z",
  "attempts": 3,
  "maxAttempts": 3,
  "canRetry": true,
  "failure": {
    "type": "https://api.example.com/problems/job-failed",
    "title": "Export failed",
    "status": 500,
    "detail": "Unable to generate export due to a database timeout.",
    "instance": "/v1/jobs/job-123"
  }
}
```

### Retry API

A retry request should be explicit. Do not automatically retry forever.

```http
POST /v1/jobs/job-123/retry HTTP/1.1

HTTP/1.1 202 Accepted
Location: /v1/jobs/job-123
Content-Type: application/json

{
  "jobId": "job-123",
  "status": "QUEUED",
  "message": "Retry accepted",
  "attempts": 3,
  "maxAttempts": 3,
  "retryRequestedAt": "2024-01-15T10:36:10Z"
}
```

Retry guidelines:
- If you keep the same `jobId`, track attempt history (at least attempt count and timestamps).
- If you create a new `jobId` for each retry, return both the new job ID and a link to the prior job for audit.
- Reject retries when the job is not retryable (for example, input validation errors).

### Dead Letter Queue (DLQ) Handling

Most job runners are at-least-once delivery systems. When a job fails permanently, the work item typically moves to a dead letter store for inspection.

API-level behaviors to support DLQ operations:
- Expose `attempts` and `maxAttempts` so clients can understand what happened.
- Provide a stable error payload in the job status.
- Provide a retry endpoint (manual intervention) for jobs that can be retried.
- Keep job metadata for a retention window so operators can investigate.

## Result Expiration and Retention

Jobs and their results should not live forever.

Recommended approach:
- Define a retention policy for job metadata (for example, 24 hours or 7 days).
- Define a retention policy for results (often shorter than metadata).
- Return `expiresAt` in the job payload when clients need to act before expiration.

If results expire before job metadata:
- Keep the job resource visible.
- Remove the download link or return a clear error when clients request the result.

Example: completed job with expired result link:

```json
{
  "jobId": "job-123",
  "status": "COMPLETED",
  "completedAt": "2024-01-15T10:34:22Z",
  "result": {
    "state": "EXPIRED",
    "expiredAt": "2024-01-16T10:30:00Z"
  }
}
```

## Resource Cleanup

### Automatic Cleanup

Servers should perform automatic cleanup to avoid resource leaks:
- Delete expired results (files, temporary objects, intermediate artifacts).
- Purge job metadata after the retention window.
- Clean up orphaned resources if a worker crashes mid-job.

### Manual Cleanup

If clients need explicit cleanup (for privacy, storage, or compliance), support deletion.

```http
DELETE /v1/jobs/job-123 HTTP/1.1

HTTP/1.1 204 No Content
```

Deletion guidelines:
- Define what deletion means (metadata only, results only, or both).
- Consider allowing deletion only for terminal states.
- Treat deletion as idempotent.

## Job Listing and History

For user experience and support tooling, consider listing a caller’s recent jobs.

```http
GET /v1/jobs?status=COMPLETED&limit=10 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "jobId": "job-123",
      "type": "export",
      "status": "COMPLETED",
      "createdAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:34:22Z"
    },
    {
      "jobId": "job-124",
      "type": "export",
      "status": "FAILED",
      "createdAt": "2024-01-15T11:00:00Z",
      "failedAt": "2024-01-15T11:05:00Z"
    }
  ],
  "page": {
    "limit": 10,
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1VDExOjAwOjAwWiIsImpvYklkIjoiam9iLTEyNCJ9"
  }
}
```

Guidelines:
- Prefer cursor pagination for stability on frequently changing lists.
- Ensure listing is scoped to the authenticated principal.

## Batch Job Patterns

Sometimes a client needs to submit many jobs at once (for example, multiple exports). This is different from a single “batch operation” that processes many items inside one job.

### Batch Job Submission

```http
POST /v1/jobs/batch HTTP/1.1
Content-Type: application/json
Idempotency-Key: 61b5c5a4-48df-4b77-8c48-7bb7a8f86c3b

{
  "jobs": [
    {
      "type": "export",
      "params": {
        "format": "csv",
        "filters": {"dateRange": {"start": "2024-01-01", "end": "2024-01-31"}}
      }
    },
    {
      "type": "export",
      "params": {
        "format": "csv",
        "filters": {"dateRange": {"start": "2024-02-01", "end": "2024-02-29"}}
      }
    }
  ]
}

HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "batchId": "batch-789",
  "createdAt": "2024-01-15T10:30:00Z",
  "jobs": [
    {"jobId": "job-123", "status": "QUEUED"},
    {"jobId": "job-124", "status": "QUEUED"}
  ]
}
```

Batch submission guidelines:
- Support a maximum number of jobs per request.
- Return per-job IDs so clients can track each job independently.
- Consider partial acceptance rules (some jobs accepted, others rejected) and document them.

## Queue Integration (Conceptual)

Job APIs are typically backed by a queue or scheduler. The HTTP layer should not expose internal queue details, but the design should reflect queue realities.

Common queue patterns:
- **Message queue**: worker processes messages; at-least-once delivery is common.
- **Task queue**: jobs have explicit retries, backoff, scheduling, and visibility controls.
- **Stream processing**: jobs are driven by append-only logs and consumer groups.

Practical implications for your API:
- Assume jobs can be delivered more than once to workers. Design job execution to be idempotent.
- Treat “accepted” as “durably recorded” (a job exists even if workers are unavailable).
- Track attempts and failures explicitly.
- Provide backpressure: reject or rate-limit submissions when the system is overloaded.

## Security and Access Control

Jobs often contain sensitive inputs and produce sensitive outputs.

Minimum expectations:
- A caller can only read, cancel, retry, or delete jobs they are authorized to access.
- Job result downloads should be protected (authorization, time-limited URLs, or both).
- Avoid leaking job existence across tenants. Many systems choose `404 Not Found` instead of `403 Forbidden` for unauthorized access.

## Example End-to-End Flow

1. Client submits a job (`POST /v1/jobs`) and receives `202 Accepted` with a job ID.
2. Client polls `GET /v1/jobs/{jobId}` or opens an SSE stream.
3. Client shows progress updates.
4. Job completes.
5. Client downloads the result.
6. Result expires after TTL.
7. Job metadata is cleaned up automatically (or deleted explicitly).

## Industry Examples (Non-Normative)

Many platforms expose similar concepts under different names:
- Managed workflow/orchestration services
- Managed task queues
- Durable function frameworks
- General-purpose job libraries

These can help validate the concepts, but the HTTP patterns in this document are designed to work with any implementation.
