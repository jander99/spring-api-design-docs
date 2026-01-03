# Pagination and Filtering

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge  
> **🎯 Key Topics:** Data, Architecture
> 
> **📊 Complexity:** 8.6 grade level • 0.6% technical density • fairly easy

## Why Pagination Matters

When your API returns lists of data, you face a problem. Sending all items at once can overload both the server and the client. Imagine trying to load 10,000 orders in a single response. The server would struggle to fetch all that data. The client would wait a long time for the response. The network would carry huge amounts of data.

Pagination solves this problem. It breaks large lists into smaller chunks called pages. Each page contains a manageable number of items. Clients request pages one at a time. This approach:

- Reduces server load by fetching less data per request
- Speeds up response times by sending smaller payloads
- Improves user experience with faster initial displays
- Saves network bandwidth by transferring less data

Filtering adds another layer of power. It lets clients ask for only the data they need. Want to see only active orders? Add a filter. Need orders from last week? Use a date filter. This makes your API more flexible and efficient.

## Overview

This guide shows you how to add pagination and filtering to your APIs. You will learn standard patterns that work well across different use cases. These patterns help you build APIs that handle data consistently and efficiently.

## Core Concepts

### Two Ways to Paginate

You can choose between two pagination styles:

1. **Page-based pagination**: Works like a book with page numbers. You request page 1, then page 2, and so on. Best for smaller data sets where the total size is known. Easy for users to understand and navigate.

2. **Cursor-based pagination**: Works like a bookmark. The API gives you a marker (cursor) that points to your current position. You use this marker to get the next batch of items. Best for large or constantly changing data sets. Performs better at scale.

Most APIs start with page-based pagination. It is simpler to implement and easier for clients to use.

### Standard Response Structure

All paginated responses follow this structure:

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    }
  }
}
```

The response has two main parts:

- **data**: Contains the actual items for this page
- **meta**: Contains information about the pagination itself

The meta section tells clients:
- What page they are viewing
- How many items are on this page
- How many total items exist
- How many total pages are available

## Simple Example First

Let's see pagination in action with a real request and response.

**Request:**
```
GET /api/orders?page=0&size=20&sort=createdDate,desc
```

**Response:**
```json
{
  "data": [
    {
      "id": "order-12346",
      "customerId": "cust-67890",
      "total": 149.50,
      "status": "PROCESSING"
    }
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    }
  }
}
```

This request asks for the first page of orders. It wants 20 items per page. It wants them sorted by creation date with newest first.

## Basic Pagination

### Query Parameters

Use these URL parameters to control pagination:

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `page` | Which page to get (starts at 0) | 0 | `?page=2` |
| `size` | How many items per page | 20 | `?size=50` |
| `sort` | How to sort the items | none | `?sort=createdDate,desc` |

### Standards to Follow

- Start counting pages from 0 (not 1)
- Use 20 items per page as your default
- Set a maximum of 100 items per page
- Always tell clients the total count of items

## Basic Filtering

### Common Filter Patterns

Filters let clients narrow down results. Here are the most common patterns:

| Filter Type | Parameter Pattern | Example | What It Does |
|-------------|-------------------|---------|--------------|
| Exact match | `field=value` | `?status=ACTIVE` | Find items with exact value |
| Date range | `field[After/Before]=date` | `?createdAfter=2024-01-01` | Find items after or before a date |
| Number range | `field[Gt/Lt]=number` | `?totalGt=100` | Find items greater or less than a number |
| Multiple values | `field=value1,value2` | `?status=ACTIVE,PENDING` | Find items matching any value |
| Text search | `search=text` | `?search=customer+name` | Search across text fields |

### Filter Response

Always show clients which filters were applied:

```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "filters": {
      "status": "ACTIVE",
      "createdAfter": "2024-01-01"
    }
  }
}
```

This helps clients confirm their filters worked correctly. It also helps with debugging when results look unexpected.

## Implementation Steps

Follow these steps to add pagination to your API:

### Step 1: Accept Query Parameters

Allow clients to send these parameters in the URL:
- `page` - Which page they want (number)
- `size` - How many items per page (number)
- `sort` - How to sort results (text)

Check that the values make sense. For example, page numbers should not be negative. Page sizes should not exceed your maximum limit.

Set good defaults. Use page 0 and size 20 if clients do not specify values.

### Step 2: Apply Filters

Read any filter parameters from the URL. Check that filter values are valid. For example, if a client filters by status, make sure the status value is one you support.

Combine multiple filters using AND logic. If a client filters by status and date, return only items that match both conditions.

### Step 3: Build the Response

Put the actual data items in a `data` array. Add pagination details to a `meta.pagination` object. Include the filters you applied in a `meta.filters` object.

Calculate the total number of pages based on total items and page size.

### Step 4: Handle Edge Cases

Return an empty array when no items match the filters. Do not return an error. This is a valid result.

Check if the requested page number is too high. If a client asks for page 100 but only 3 pages exist, return an error with a clear message.

Give helpful error messages when parameters are invalid. Tell clients what went wrong and what values are acceptable.

## Common Mistakes

Avoid these common errors when implementing pagination:

### Forgetting Total Counts

Always include `totalElements` and `totalPages` in your response. Clients need this information to build navigation controls. Without it, users cannot jump to the last page or see how many results exist.

### Using 1-Based Page Numbers

Start page counting from 0, not 1. This matches how most programming languages index arrays. It prevents confusion between page numbers and array indexes.

### Allowing Unlimited Page Sizes

Set a maximum page size (like 100 items). Without a limit, clients could request huge pages that slow down your server and database.

### Not Validating Filters

Check filter values before using them in queries. Invalid values can cause errors or security issues. Tell clients which filter values are valid.

### Changing Results Between Pages

Keep results stable while a client pages through them. If new items appear or old items disappear, clients might see duplicates or miss items. Use cursors or timestamps for changing data sets.

## Essential Response Format

Here is a complete example showing all the pieces together:

```json
{
  "data": [
    {
      "id": "order-12346",
      "customerId": "cust-67890",
      "total": 149.50,
      "status": "PROCESSING",
      "createdDate": "2024-04-14T10:22:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 2,
      "totalElements": 54,
      "totalPages": 27
    },
    "filters": {
      "status": "PROCESSING"
    },
    "sort": [
      {"field": "createdDate", "direction": "DESC"}
    ]
  }
}
```

## Performance Tips

Make your pagination fast and efficient:

- Use cursor-based pagination when you have large data sets (thousands of items)
- Add database indexes to fields used for filtering and sorting
- Make total counts optional for very large data sets (counting can be slow)
- Set a maximum page size to prevent clients from requesting too much data at once

## Related Documentation

### Detailed Examples
- [Complete Examples](examples/pagination/complete-examples.md) - Full code examples and use cases
- [Framework Integration](examples/pagination/framework-integration.md) - Implementation patterns for specific frameworks

### Advanced Patterns
- [Complex Filtering](reference/pagination/advanced-patterns.md) - Advanced query operators and search patterns
- [Cursor Pagination](reference/pagination/cursor-pagination.md) - High-performance pagination for large datasets

### Troubleshooting
- [Common Issues](troubleshooting/pagination/common-issues.md) - Error handling and edge cases
- [Performance Problems](troubleshooting/pagination/performance-problems.md) - Optimization strategies

### API Design Standards
- [Content Types and Structure](content-types-and-structure.md) - Basic request/response patterns
- [Performance Standards](../advanced-patterns/performance-standards.md) - Pagination performance patterns and optimization strategies
- [Error Response Standards](error-response-standards.md) - Error handling patterns
- [Streaming APIs](streaming-apis.md) - Alternative patterns for large datasets