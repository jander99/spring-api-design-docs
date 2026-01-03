# Moving from Level 1 to Level 2: HTTP Verbs & Status Codes

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 3 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge  
> **🎯 Key Topics:** API Design
> 
> **📊 Complexity:** 10.9 grade level • 1.4% technical density • fairly easy

## Quick Overview

Level 2 means you use HTTP methods (GET, POST, PUT, DELETE) correctly. You also use proper status codes (200, 201, 404, etc.).

## 🎯 Goal: Use HTTP Properly

Stop putting actions in your request body. Use HTTP methods instead. Use specific status codes for different results.

## Step 1: Use HTTP Methods

### Current State (Level 1):
```
POST /users/123 with {"action": "get"}
POST /users/123 with {"action": "update"}
POST /users/123 with {"action": "delete"}
```

### Target State (Level 2):
```
GET    /users/123  → Retrieve user
PUT    /users/123  → Update user
DELETE /users/123  → Delete user
```

### How to Map Operations:

| Your Current Action | HTTP Method | Purpose |
|---------------------|-------------|---------|
| "get", "retrieve", "fetch" | **GET** | Read data |
| "create", "add", "new" | **POST** | Create new resource |
| "update", "modify", "change" | **PUT/PATCH** | Update existing |
| "delete", "remove", "destroy" | **DELETE** | Remove resource |

## Step 2: Implement Proper Status Codes

### Replace Generic 200 with Specific Codes:

| Operation | Success Code | Meaning |
|-----------|--------------|---------|
| GET | **200 OK** | Found and returned |
| POST | **201 Created** | New resource created |
| PUT | **200 OK** | Updated successfully |
| DELETE | **204 No Content** | Deleted (no body) |

### Error Code Mapping:

| Current Error | HTTP Code | When to Use |
|---------------|-----------|-------------|
| "Not found" | **404 Not Found** | Resource doesn't exist |
| "Bad request" | **400 Bad Request** | Invalid input |
| "Unauthorized" | **401 Unauthorized** | Need authentication |
| "Forbidden" | **403 Forbidden** | Not allowed |
| "Server error" | **500 Internal Server Error** | System failure |

## Step 3: Refactoring Examples

### Before (Level 1):
- All operations go through POST
- Actions specified in request body
- Generic success/error responses
- Single handler for all operations

### After (Level 2):
- GET for retrieval operations
- PUT for update operations
- DELETE for removal operations
- POST only for creation
- Specific HTTP status codes
- Separate handlers per HTTP method

## Step 4: How to Switch

### Phase 1: Add New Methods (Week 1-2)

Keep your old endpoints working. Add new endpoints that use HTTP methods. Support both patterns during the transition.

**What to do:**
- Add GET for read operations
- Add PUT for updates
- Add DELETE for removals
- Keep old POST endpoints active

### Phase 2: Redirect Old Calls (Week 3-4)

Point old endpoints to new ones. Track who still uses the old way.

**What to do:**
- Send deprecation headers from old endpoints
- Forward POST calls to new HTTP method handlers
- Log each use of old patterns
- Check migration progress daily

### Phase 3: Deprecate POST Actions (Week 5-6)

Warn clients that old endpoints will stop working. Set a shutdown date.

**What to do:**
- Add warnings to old endpoints
- Update your API docs
- Email all API users
- Track usage until it stops

## Step 5: Implementation Checklist

### Technical Changes:
- [ ] Implement GET endpoints for read operations
- [ ] Implement POST endpoints for create operations
- [ ] Implement PUT/PATCH endpoints for updates
- [ ] Implement DELETE endpoints for removal
- [ ] Add proper status code responses
- [ ] Remove action field from requests
- [ ] Update error handling

### Documentation Updates:
- [ ] Update API documentation
- [ ] Create migration guide
- [ ] Document status codes
- [ ] Update client examples

### Communication:
- [ ] Notify all API consumers
- [ ] Provide migration timeline
- [ ] Offer support during transition
- [ ] Share best practices

## Step 6: Testing Strategy

### Test Coverage Needed:
- Each HTTP method per resource
- All status code scenarios
- Error handling paths
- Backward compatibility
- Client SDK updates

### Test Scenarios:
```
✓ GET /users/123 returns 200 with user data
✓ GET /users/999 returns 404 not found
✓ POST /users returns 201 with new user
✓ PUT /users/123 returns 200 with updated user
✓ DELETE /users/123 returns 204 no content
```

## 🎉 Success Criteria

You've reached Level 2 when:
- ✅ All CRUD operations use correct HTTP methods
- ✅ Responses use appropriate status codes
- ✅ No actions in request bodies
- ✅ GET requests are safe and idempotent
- ✅ DELETE requests are idempotent
- ✅ Errors return proper HTTP status codes

## 📚 Resources

- HTTP Methods: RFC 7231
- Status Codes: RFC 7231
- REST Best Practices
- API Design Guidelines

## What to Do After Level 2

You finished Level 2. Now stabilize your API. Gather metrics. Ask users for feedback.

**Should you move to Level 3?**

Most APIs stay at Level 2. This is the industry standard. Only add hypermedia (Level 3) if clients really need it.

**Focus on these instead:**
1. Improve performance
2. Strengthen security
3. Write better documentation
4. Add monitoring

**Remember:** Level 2 works for most successful APIs!