# Moving from Level 1 to Level 2: HTTP Verbs & Status Codes

## 🎯 Goal: Use HTTP Properly

Use HTTP methods and status codes the right way.

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

### Phase 1: Add New Methods
- Support both old POST-based and new HTTP verb patterns
- Keep existing endpoints operational
- Add new HTTP method handlers
- Ensure backward compatibility

### Phase 2: Redirect Old Calls (Week 3-4)
- Add deprecation headers to old endpoints
- Forward POST-based calls to appropriate HTTP method handlers
- Log usage of deprecated patterns
- Monitor migration progress

### Phase 3: Deprecate POST Actions (Week 5-6)
- Add deprecation warnings
- Update all documentation
- Notify clients of timeline
- Monitor usage metrics

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

## Next Steps

Once you've successfully implemented Level 2:
1. Stabilize your API at this level
2. Gather metrics and feedback
3. Consider if Level 3 (Hypermedia) adds value
4. Focus on other improvements (performance, security, documentation)

**Remember:** Level 2 is the industry standard. Most successful APIs operate at this level!