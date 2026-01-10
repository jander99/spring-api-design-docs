# File Upload and Download Patterns

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, REST API design  
> **🎯 Key Topics:** Multipart uploads, resumable protocols, pre-signed URLs, streaming
> 
> **📊 Complexity:** 8.6 grade level • 1.5% technical density • fairly difficult

## Overview

File handling is a fundamental requirement for many APIs, yet it presents unique challenges compared to standard JSON data. Improper file handling can lead to security vulnerabilities, resource exhaustion, and poor user experience.

This guide outlines standard patterns for managing file uploads and downloads in REST APIs. It covers simple multipart uploads, complex resumable protocols for large files, and direct storage access via pre-signed URLs.

## Upload Patterns

### 1. Simple Multipart Upload

The most common way to upload files is using `multipart/form-data` (RFC 7578). This is best for small to medium files (typically < 50MB) and when you need to send metadata along with the file.

#### Request Structure

```http
POST /v1/files HTTP/1.1
Content-Type: multipart/form-data; boundary=----Boundary123
Content-Length: 12450

------Boundary123
Content-Disposition: form-data; name="metadata"
Content-Type: application/json

{
  "title": "Project Proposal",
  "category": "documents",
  "tags": ["planning", "2024"]
}
------Boundary123
Content-Disposition: form-data; name="file"; filename="proposal.pdf"
Content-Type: application/pdf

[binary data]
------Boundary123--
```

**Key Requirements:**
- **Boundary**: A unique string used to separate parts.
- **Content-Disposition**: Must include `name` (the field name) and `filename`.
- **Content-Type**: Should be specified for each part.

### 2. Resumable Uploads (tus Protocol)

For large files (GBs) or unstable connections, resumable uploads are essential. We recommend following the [tus protocol](https://tus.io/), an open standard for resumable file uploads.

#### Initialization

The client first creates the upload resource.

```http
POST /v1/files/resumable HTTP/1.1
Tus-Resumable: 1.0.0
Upload-Length: 1073741824
Upload-Metadata: filename cHJvcG9zYWwucGRm,content-type YXBwbGljYXRpb24vcGRm

HTTP/1.1 201 Created
Location: /v1/files/resumable/abc-123-xyz
Tus-Resumable: 1.0.0
```

#### Uploading Data (PATCH)

The client sends chunks using `PATCH` and tracks the offset.

```http
PATCH /v1/files/resumable/abc-123-xyz HTTP/1.1
Tus-Resumable: 1.0.0
Content-Type: application/offset+octet-stream
Upload-Offset: 0
Content-Length: 5242880

[binary data for first 5MB]

HTTP/1.1 204 No Content
Tus-Resumable: 1.0.0
Upload-Offset: 5242880
```

#### Resuming an Upload

If the connection drops, the client checks the current offset with `HEAD`.

```http
HEAD /v1/files/resumable/abc-123-xyz HTTP/1.1
Tus-Resumable: 1.0.0

HTTP/1.1 200 OK
Upload-Offset: 5242880
Upload-Length: 1073741824
```

### 3. Pre-Signed URLs

Pre-signed URLs allow clients to upload or download files directly from object storage (like S3, GCS, or Azure Blob) without passing data through your application server. This reduces latency and server load.

#### Requesting an Upload URL

```http
POST /v1/files:requestUploadUrl HTTP/1.1
Content-Type: application/json

{
  "filename": "video-export.mp4",
  "contentType": "video/mp4",
  "size": 524288000
}

HTTP/1.1 200 OK
{
  "uploadUrl": "https://storage.example.com/bucket/path/video.mp4?signature=xyz...",
  "fileId": "file-789",
  "expiresAt": "2024-07-15T15:00:00Z"
}
```

#### Client Uploading Directly

```http
PUT https://storage.example.com/bucket/path/video.mp4?signature=xyz... HTTP/1.1
Content-Type: video/mp4
Content-Length: 524288000

[binary data]
```

## Download Patterns

### 1. Simple Download

Standard downloads use the `Content-Disposition` header to control browser behavior.

```http
GET /v1/files/file-123/content HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Length: 12345
Content-Disposition: attachment; filename="document.pdf"; filename*=UTF-8''document.pdf

[binary data]
```

- **attachment**: Forces a "Save As" dialog.
- **inline**: Attempts to display the file in the browser (e.g., PDF, Image).
- **filename***: RFC 5987 standard for supporting non-ASCII characters in filenames.

### 2. Range Requests (Resumable Downloads)

Range requests allow clients to download specific portions of a file. This is useful for resuming failed downloads or for media players to stream video.

#### Server Advertising Support

```http
HEAD /v1/files/large-video.mp4/content HTTP/1.1

HTTP/1.1 200 OK
Accept-Ranges: bytes
Content-Length: 1073741824
```

#### Client Requesting a Range

```http
GET /v1/files/large-video.mp4/content HTTP/1.1
Range: bytes=0-1048575

HTTP/1.1 206 Partial Content
Content-Range: bytes 0-1048575/1073741824
Content-Length: 1048576

[first 1MB of binary data]
```

## Security and Processing

### 1. Virus and Malware Scanning

Directly exposing uploaded files is dangerous. Implement an asynchronous scanning workflow.

1. **Upload**: File is stored in a temporary "quarantine" area.
2. **Scan**: An async process scans the file for malware.
3. **Release**: If clean, the file is moved to permanent storage and the status is updated.

```http
GET /v1/files/file-123 HTTP/1.1

HTTP/1.1 200 OK
{
  "id": "file-123",
  "status": "SCANNING",
  "security": {
    "scanned": false,
    "result": "PENDING"
  }
}
```

### 2. Input Validation

- **File Type**: Validate both the `Content-Type` header and the actual file magic numbers (header bytes). Never rely solely on the extension.
- **File Size**: Enforce strict `Content-Length` limits at the load balancer or API gateway level.
- **Filenames**: Sanitize filenames to prevent path traversal attacks (e.g., removing `../`).

### 3. Memory Efficient Streaming

When processing files on the server:
- **Never load the whole file into memory**.
- Use streaming buffers to pipe the input directly to storage or the next process.
- For downloads, stream data from the source to the HTTP response output.

## Metadata Management

Decouple file metadata from the raw file content.

| Aspect | Metadata Endpoint | Content Endpoint |
|--------|-------------------|------------------|
| **URL** | `/v1/files/{id}` | `/v1/files/{id}/content` |
| **Format** | JSON | Binary |
| **Method** | GET, PATCH, DELETE | GET, PUT |
| **Fields** | filename, size, checksum, status | Raw octets |

## Best Practices

### Design Guidelines

1. **Use UUIDs**: Don't use sequential IDs or original filenames as primary keys.
2. **Checksums**: Provide and verify MD5 or SHA-256 hashes (via `Content-MD5` or custom headers) to ensure integrity.
3. **MIME Sniffing**: Send `X-Content-Type-Options: nosniff` to prevent browsers from executing malicious file content.
4. **Versioning**: If files can be updated, treat them as immutable and use versioning or unique paths for each iteration.

### Operational Limits

- **Maximum Size**: Document and enforce limits (e.g., 100MB for multipart, 5GB for resumable).
- **Timeouts**: Increase timeouts for file endpoints, but set a maximum reasonable limit to prevent resource hogging.
- **Cleanup**: Automatically delete expired pre-signed URLs and abandoned resumable upload sessions.

## Related Documentation

- [Content Types and Structure](../request-response/content-types-and-structure.md)
- [Asynchronous Operations](./async-operations.md)
- [Input Validation Standards](../security/input-validation.md)
- [HTTP Streaming Patterns](./http-streaming-patterns.md)
