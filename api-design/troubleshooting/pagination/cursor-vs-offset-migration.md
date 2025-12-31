# Migrating from Offset to Cursor Pagination

> **Reading Guide**
> - **Reading Time**: 10 minutes
> - **Audience**: API developers and architects planning pagination migrations
> - **Prerequisites**: Understanding of both offset and cursor pagination
> - **Reading Level**: Grade 12 (Flesch: 32)

This guide walks you through migrating from offset-based pagination to cursor-based pagination while maintaining client compatibility.

---

## When to Migrate

### Signs You Need Cursor Pagination

Consider migrating when you observe:

| Symptom | Indicator | Priority |
|---------|-----------|----------|
| Slow deep pages | Page 100+ takes >2 seconds | High |
| Duplicate items | Users report seeing same item twice | High |
| Missing items | Items disappear between pages | High |
| Count query timeouts | Total count queries fail | Medium |
| High database load | Pagination queries cause CPU spikes | Medium |
| Real-time data | Frequent inserts/updates during browsing | Medium |

### When to Stay with Offset

Offset pagination remains appropriate when:

- Dataset is small (<10,000 records)
- Data rarely changes
- Users need to jump to specific pages
- Simple implementation is prioritized
- Legacy client compatibility is critical

### Decision Matrix

```
Dataset Size        Data Volatility      Recommendation
─────────────────────────────────────────────────────────
< 10,000            Low                  Keep offset
< 10,000            High                 Consider cursor
10,000 - 100,000    Low                  Either works
10,000 - 100,000    High                 Migrate to cursor
> 100,000           Any                  Migrate to cursor
```

---

## Migration Steps

### Phase 1: Preparation

#### Step 1.1: Audit Current Usage

Document your current pagination implementation:

```http
# Current offset-based endpoint
GET /v1/orders?page=5&size=20&sort=createdDate,desc
```

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 5,
      "size": 20,
      "totalElements": 15432,
      "totalPages": 772
    }
  }
}
```

#### Step 1.2: Identify Client Dependencies

Survey your API consumers:

- Which clients use pagination?
- Do they store page numbers?
- Do they rely on totalPages for UI?
- Do they use page jumping?

#### Step 1.3: Design Cursor Format

Choose a cursor encoding strategy:

**Option A: Opaque base64-encoded JSON**
```json
{
  "id": "ORD-12345",
  "createdDate": "2024-01-15T10:30:00Z",
  "v": 1
}
```
Encoded: `eyJpZCI6Ik9SRC0xMjM0NSIsImNyZWF0ZWREYXRlIjoiMjAyNC0wMS0xNVQxMDozMDowMFoiLCJ2IjoxfQ`

**Option B: Encrypted cursor (for sensitive data)**
```
AES256(id=ORD-12345&ts=1705318200&v=1)
```

**Option C: Simple keyset value**
```
after_id=ORD-12345
```

---

### Phase 2: Parallel Implementation

#### Step 2.1: Add Cursor Support

Implement cursor pagination alongside existing offset pagination:

```http
# Existing offset pagination (keep working)
GET /v1/orders?page=5&size=20

# New cursor pagination
GET /v1/orders?cursor=eyJpZCI6Ik9SRC0xMjM0NSJ9&size=20
```

#### Step 2.2: Update Response Format

Support both styles in responses:

**Offset-style response (backward compatible):**
```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 5,
      "size": 20,
      "totalElements": 15432,
      "totalPages": 772
    }
  }
}
```

**Cursor-style response (new format):**
```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "size": 20,
      "cursors": {
        "previous": "eyJpZCI6Ik9SRC0xMjI0NSJ9",
        "next": "eyJpZCI6Ik9SRC0xMjI2NSJ9"
      },
      "hasPrevious": true,
      "hasNext": true
    }
  }
}
```

**Hybrid response (during transition):**
```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 5,
      "size": 20,
      "totalElements": 15432,
      "totalPages": 772,
      "cursors": {
        "previous": "eyJpZCI6Ik9SRC0xMjI0NSJ9",
        "next": "eyJpZCI6Ik9SRC0xMjI2NSJ9"
      },
      "hasNext": true,
      "hasPrevious": true
    }
  }
}
```

#### Step 2.3: Add Documentation

Document both pagination methods:

```yaml
# OpenAPI specification
paths:
  /v1/orders:
    get:
      parameters:
        # Offset pagination (deprecated)
        - name: page
          in: query
          deprecated: true
          description: Page number (0-indexed). Deprecated - use cursor instead.
          schema:
            type: integer
            minimum: 0
            default: 0
        
        # Cursor pagination (recommended)
        - name: cursor
          in: query
          description: Opaque cursor for pagination. Use value from previous response.
          schema:
            type: string
        
        - name: size
          in: query
          description: Number of items per page
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
```

---

### Phase 3: Client Migration

#### Step 3.1: Communicate Changes

Notify clients about the migration:

```http
# Add deprecation header to offset responses
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 15 Jun 2025 00:00:00 GMT
Link: <https://api.example.com/docs/cursor-pagination>; rel="deprecation"

{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 5,
      "size": 20,
      "totalElements": 15432,
      "totalPages": 772
    },
    "deprecation": {
      "message": "Offset pagination is deprecated. Please migrate to cursor pagination.",
      "documentationUrl": "https://api.example.com/docs/cursor-pagination",
      "sunsetDate": "2025-06-15"
    }
  }
}
```

#### Step 3.2: Provide Migration Guide for Clients

**Before (offset-based client):**
```javascript
// Old client code
async function loadOrders(pageNumber) {
  const response = await fetch(
    `/v1/orders?page=${pageNumber}&size=20`
  );
  const data = await response.json();
  
  // Store page number for navigation
  this.currentPage = pageNumber;
  this.totalPages = data.meta.pagination.totalPages;
  
  return data.data;
}

// Page navigation
function goToPage(pageNumber) {
  loadOrders(pageNumber);
}
```

**After (cursor-based client):**
```javascript
// New client code
async function loadOrders(cursor = null) {
  const url = cursor 
    ? `/v1/orders?cursor=${cursor}&size=20`
    : `/v1/orders?size=20`;
    
  const response = await fetch(url);
  const data = await response.json();
  
  // Store cursors for navigation
  this.previousCursor = data.meta.pagination.cursors?.previous;
  this.nextCursor = data.meta.pagination.cursors?.next;
  this.hasNext = data.meta.pagination.hasNext;
  this.hasPrevious = data.meta.pagination.hasPrevious;
  
  return data.data;
}

// Navigation
function loadNextPage() {
  if (this.nextCursor) {
    loadOrders(this.nextCursor);
  }
}

function loadPreviousPage() {
  if (this.previousCursor) {
    loadOrders(this.previousCursor);
  }
}
```

#### Step 3.3: Handle UI Changes

**Page jumping alternatives:**

| Offset Feature | Cursor Alternative |
|----------------|-------------------|
| "Go to page X" | Search/filter to narrow results |
| Page number display | "Load more" or infinite scroll |
| Total page count | "X items" or "1000+ items" |
| Direct page links | First/Previous/Next/Last links |

**Example UI transition:**

```
BEFORE (offset):
[First] [Prev] [1] [2] [3] ... [772] [Next] [Last]
"Showing page 5 of 772 (15,432 total orders)"

AFTER (cursor):
[Previous] [Next]
"Showing 20 orders"
-- or --
[Load More]
"Showing 100 of 15,000+ orders"
```

---

### Phase 4: Deprecation

#### Step 4.1: Set Deprecation Timeline

```
Timeline Example:
─────────────────────────────────────────────────────────
Month 1-2:    Add cursor support (parallel operation)
Month 3-4:    Add deprecation warnings to offset
Month 5-6:    Monitor offset usage, assist migrations
Month 7-8:    Reduce offset rate limits
Month 9-10:   Disable offset for new clients
Month 11-12:  Remove offset support entirely
```

#### Step 4.2: Monitor Migration Progress

Track adoption metrics:

```json
{
  "pagination_metrics": {
    "period": "2024-01-15",
    "offset_requests": 45000,
    "cursor_requests": 125000,
    "offset_percentage": 26.5,
    "unique_offset_clients": 12,
    "clients_migrated": 38
  }
}
```

#### Step 4.3: Final Cutover

When ready to remove offset support:

```http
GET /v1/orders?page=5&size=20

HTTP/1.1 410 Gone
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/offset-pagination-removed",
  "title": "Offset Pagination Removed",
  "status": 410,
  "detail": "Offset-based pagination has been removed. Please use cursor-based pagination.",
  "instance": "/v1/orders",
  "migration": {
    "documentationUrl": "https://api.example.com/docs/cursor-pagination",
    "example": "GET /v1/orders?size=20 for first page, then use cursor from response"
  }
}
```

---

## Client Compatibility

### Supporting Both Pagination Types

During migration, detect which type the client is using:

```http
# Client using offset (legacy)
GET /v1/orders?page=5&size=20
→ Return offset-style response with deprecation warning

# Client using cursor (modern)
GET /v1/orders?cursor=abc123&size=20
→ Return cursor-style response

# Client using neither (first page)
GET /v1/orders?size=20
→ Return hybrid response with both cursors and page info
```

### Handling Mixed Usage

If a client sends both parameters:

```http
GET /v1/orders?page=5&cursor=abc123&size=20
```

**Option A: Cursor takes precedence**
```json
{
  "meta": {
    "pagination": {
      "size": 20,
      "cursors": {...},
      "ignored": {
        "page": "Ignored because cursor was provided"
      }
    }
  }
}
```

**Option B: Return error**
```http
HTTP/1.1 400 Bad Request

{
  "type": "https://api.example.com/problems/conflicting-pagination",
  "title": "Conflicting Pagination Parameters",
  "status": 400,
  "detail": "Cannot use both 'page' and 'cursor' parameters. Use one or the other."
}
```

---

## Rollback Strategies

### When to Rollback

Consider rollback if:

- Critical clients cannot migrate in time
- Performance issues with cursor implementation
- Data consistency problems emerge
- Unexpected cursor encoding issues

### Rollback Plan

#### Level 1: Extend Deprecation Period

```http
# Update sunset date
Sunset: Sat, 15 Dec 2025 00:00:00 GMT
```

#### Level 2: Re-enable Offset Without Warnings

```http
# Remove deprecation headers temporarily
# Keep cursor support active
```

#### Level 3: Full Rollback

```http
# Disable cursor endpoints
# Return to offset-only
# Document the change
```

### Rollback Communication

```json
{
  "announcement": {
    "type": "rollback",
    "date": "2024-06-01",
    "message": "Cursor pagination temporarily disabled due to performance issues. Offset pagination fully supported. We will communicate when cursor pagination returns.",
    "status": "investigating",
    "eta": "2024-07-01"
  }
}
```

---

## Testing the Migration

### Test Scenarios

1. **Basic functionality**
   - First page without cursor
   - Next page with cursor
   - Previous page navigation
   - Edge of dataset

2. **Consistency**
   - No duplicates during forward navigation
   - No missing items during backward navigation
   - Consistent results with concurrent modifications

3. **Error handling**
   - Invalid cursor format
   - Expired cursor
   - Tampered cursor

4. **Performance**
   - Response time for deep pagination
   - Memory usage under load
   - Database query performance

### Example Test Cases

```http
# Test 1: First page
GET /v1/orders?size=3
Expected: 3 items, no previous cursor, has next cursor

# Test 2: Next page
GET /v1/orders?cursor={next_cursor}&size=3
Expected: Next 3 items, has previous cursor

# Test 3: Invalid cursor
GET /v1/orders?cursor=invalid&size=3
Expected: 400 Bad Request with helpful error

# Test 4: Empty result
GET /v1/orders?cursor={last_page_cursor}&size=3
Expected: Empty data array, no next cursor
```

---

## Related Documentation

- [Pagination and Filtering Guide](../../request-response/pagination-and-filtering.md)
- [Common Pagination Issues](common-issues.md)
- [Cursor Pagination Reference](../../request-response/reference/pagination/cursor-pagination.md)
- [API Version Strategy](../../foundations/api-version-strategy.md)
