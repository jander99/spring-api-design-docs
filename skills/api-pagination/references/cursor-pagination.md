# Cursor Pagination Deep-Dive

## How Cursors Work

A cursor encodes the position of the last item seen, enabling the next query to fetch items after (or before) that position.

### Cursor Content

Cursors contain values of sort fields plus a unique tiebreaker:

```javascript
// Sort by createdDate DESC, then by ID for uniqueness
const cursor = {
  id: "order-12345",                    // Unique tiebreaker
  createdDate: "2024-04-14T10:22:00Z"   // Primary sort field
};
```

### Why Include ID?

Two items may have identical sort values. Without a unique tiebreaker:
- Items might be skipped or duplicated
- Cursor position becomes ambiguous

Always include a unique field (usually `id`) as the final sort criterion.

## Cursor Query Logic

### Forward Pagination (Next Page)

Find items that come AFTER the cursor position:

```javascript
// Sorting by createdDate DESC, id ASC
// Cursor: {createdDate: "2024-04-14", id: "order-123"}

// Items after cursor satisfy:
// 1. createdDate < cursor.createdDate, OR
// 2. createdDate == cursor.createdDate AND id > cursor.id

const query = {
  $or: [
    { createdDate: { $lt: "2024-04-14" } },
    { 
      createdDate: "2024-04-14",
      id: { $gt: "order-123" }
    }
  ]
};
```

### Backward Pagination (Previous Page)

Find items that come BEFORE the cursor position:

```javascript
// Reverse the operators
const query = {
  $or: [
    { createdDate: { $gt: "2024-04-14" } },
    { 
      createdDate: "2024-04-14",
      id: { $lt: "order-123" }
    }
  ]
};

// Also reverse sort order, then reverse results
```

### Multi-Field Sort Cursors

For complex sorts, extend the pattern:

```javascript
// Sort: status ASC, createdDate DESC, id ASC
const cursor = {
  id: "order-123",
  status: "PROCESSING",
  createdDate: "2024-04-14"
};

// Query for next page:
const query = {
  $or: [
    { status: { $gt: cursor.status } },
    { 
      status: cursor.status,
      createdDate: { $lt: cursor.createdDate }
    },
    {
      status: cursor.status,
      createdDate: cursor.createdDate,
      id: { $gt: cursor.id }
    }
  ]
};
```

## Cursor Encoding

### Base64 Encoding

Simple and URL-safe:

```javascript
function encodeCursor(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString());
  } catch {
    throw new Error('Invalid cursor format');
  }
}
```

### URL-Safe Base64

For URLs without encoding issues:

```javascript
function encodeCursor(data) {
  return Buffer.from(JSON.stringify(data))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  // Restore standard base64
  let base64 = cursor
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) base64 += '=';
  
  return JSON.parse(Buffer.from(base64, 'base64').toString());
}
```

### Signed/Encrypted Cursors

For security (prevents cursor tampering):

```javascript
const crypto = require('crypto');

const SECRET = process.env.CURSOR_SECRET;

function encodeCursor(data) {
  const json = JSON.stringify(data);
  const hmac = crypto.createHmac('sha256', SECRET)
    .update(json)
    .digest('base64url');
  
  const payload = Buffer.from(json).toString('base64url');
  return `${payload}.${hmac}`;
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  
  const [payload, signature] = cursor.split('.');
  const json = Buffer.from(payload, 'base64url').toString();
  
  // Verify signature
  const expected = crypto.createHmac('sha256', SECRET)
    .update(json)
    .digest('base64url');
  
  if (signature !== expected) {
    throw new Error('Invalid cursor signature');
  }
  
  return JSON.parse(json);
}
```

## Determining hasNext/hasPrevious

Fetch one extra item to check if more exist:

```javascript
async function paginate(cursor, size, direction) {
  const query = buildQuery(cursor, direction);
  
  // Fetch size + 1 items
  const items = await collection
    .find(query)
    .sort(buildSort(direction))
    .limit(size + 1)
    .toArray();
  
  const hasMore = items.length > size;
  const data = hasMore ? items.slice(0, size) : items;
  
  // For backward pagination, reverse the results
  if (direction === 'prev') {
    data.reverse();
  }
  
  return {
    data,
    meta: {
      cursor: {
        current: encodeCursor(extractCursor(data[0])),
        next: hasMore && direction === 'next' 
          ? encodeCursor(extractCursor(data[data.length - 1])) 
          : null,
        previous: hasMore && direction === 'prev'
          ? encodeCursor(extractCursor(data[0]))
          : null,
        hasNext: direction === 'next' ? hasMore : true,
        hasPrevious: direction === 'prev' ? hasMore : cursor !== null
      }
    }
  };
}
```

## Cursor Expiration

Consider adding expiration to prevent stale cursors:

```javascript
function encodeCursor(data) {
  const payload = {
    ...data,
    exp: Date.now() + (3600 * 1000) // 1 hour expiry
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  
  const data = JSON.parse(Buffer.from(cursor, 'base64').toString());
  
  if (data.exp && Date.now() > data.exp) {
    throw new Error('Cursor has expired');
  }
  
  return data;
}
```

## Index Strategy

Cursor pagination requires indexes that match your sort order:

```sql
-- For sort by createdDate DESC, id ASC
CREATE INDEX idx_cursor ON orders(created_date DESC, id ASC);

-- For filtering + cursor
CREATE INDEX idx_status_cursor ON orders(status, created_date DESC, id ASC);
```

Without proper indexes, cursor pagination loses its performance advantage.

## Edge Cases

### Empty Results

```json
{
  "data": [],
  "meta": {
    "cursor": {
      "current": null,
      "next": null,
      "previous": null,
      "hasNext": false,
      "hasPrevious": false
    }
  }
}
```

### First Page (No Cursor)

```json
{
  "data": [...],
  "meta": {
    "cursor": {
      "current": "eyJpZCI6Im9yZGVyLTEifQ==",
      "next": "eyJpZCI6Im9yZGVyLTIwIn0=",
      "previous": null,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### Last Page

```json
{
  "data": [...],
  "meta": {
    "cursor": {
      "current": "eyJpZCI6Im9yZGVyLTUwIn0=",
      "next": null,
      "previous": "eyJpZCI6Im9yZGVyLTMxIn0=",
      "hasNext": false,
      "hasPrevious": true
    }
  }
}
```

## Cursor vs Offset Comparison

| Aspect | Cursor | Offset |
|--------|--------|--------|
| Performance (page 1) | O(1) | O(1) |
| Performance (page 100) | O(1) | O(n) |
| Concurrent data changes | Stable | Duplicates/gaps |
| Jump to page N | Not possible | Possible |
| Total count | Expensive | Expensive |
| Implementation | Complex | Simple |
| Client complexity | Higher | Lower |

## When NOT to Use Cursors

- User needs to jump to specific pages
- Dataset is small (<1000 items)
- Data rarely changes
- Client cannot store cursor state
- Simple admin interfaces
