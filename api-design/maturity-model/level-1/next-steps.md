# Moving from Level 1 to Level 2: HTTP Verbs & Status Codes

## 🎯 Goal: Use HTTP Properly

Transform your resource-based API to use HTTP methods and status codes correctly.

## Step 1: Map Operations to HTTP Methods

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

### 🔄 Operation Mapping Guide:

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
```javascript
// All operations through POST
app.post('/users/:id', (req, res) => {
  switch(req.body.action) {
    case 'get':
      const user = getUser(req.params.id);
      res.json({success: true, data: user});
      break;
    case 'update':
      updateUser(req.params.id, req.body.data);
      res.json({success: true});
      break;
    case 'delete':
      deleteUser(req.params.id);
      res.json({success: true});
      break;
  }
});
```

### After (Level 2):
```javascript
// GET for retrieval
app.get('/users/:id', (req, res) => {
  const user = getUser(req.params.id);
  if (!user) return res.status(404).json({error: 'User not found'});
  res.status(200).json(user);
});

// PUT for updates
app.put('/users/:id', (req, res) => {
  const updated = updateUser(req.params.id, req.body);
  if (!updated) return res.status(404).json({error: 'User not found'});
  res.status(200).json(updated);
});

// DELETE for removal
app.delete('/users/:id', (req, res) => {
  const deleted = deleteUser(req.params.id);
  if (!deleted) return res.status(404).json({error: 'User not found'});
  res.status(204).send();
});
```

## Step 4: Migration Strategy

### Phase 1: Add New Methods (Week 1-2)
```javascript
// Support both patterns
app.post('/users/:id', oldHandler);  // Keep existing
app.get('/users/:id', newHandler);   // Add new
app.put('/users/:id', newHandler);   // Add new
app.delete('/users/:id', newHandler); // Add new
```

### Phase 2: Redirect Old Calls (Week 3-4)
```javascript
app.post('/users/:id', (req, res) => {
  if (req.body.action === 'get') {
    res.setHeader('X-Deprecated', 'Use GET method instead');
    return newGetHandler(req, res);
  }
  // ... handle other actions
});
```

### Phase 3: Deprecate POST Actions (Week 5-6)
- Add deprecation warnings
- Update all documentation
- Notify clients of timeline
- Monitor usage metrics

## Step 5: Implementation Checklist

### Quick Wins First:
- [ ] Implement GET for all read operations
- [ ] Add 404 for missing resources
- [ ] Use 201 for successful creation
- [ ] Return 204 for successful deletion

### Standard Patterns:
- [ ] GET `/resources` → List all (200)
- [ ] GET `/resources/{id}` → Get one (200/404)
- [ ] POST `/resources` → Create new (201)
- [ ] PUT `/resources/{id}` → Update (200/404)
- [ ] DELETE `/resources/{id}` → Delete (204/404)

### Response Updates:
- [ ] Remove success flags (use status codes)
- [ ] Standardize error format
- [ ] Add Location header for 201
- [ ] Remove response body from 204

## 📝 Complete Transformation Example

### User Registration Flow:

**Level 1 (Current):**
```bash
POST /users
{
  "action": "create",
  "data": {
    "email": "user@example.com",
    "password": "secret"
  }
}

Response: 200 OK
{
  "success": true,
  "userId": 123
}
```

**Level 2 (Target):**
```bash
POST /users
{
  "email": "user@example.com",
  "password": "secret"
}

Response: 201 Created
Location: /users/123
{
  "id": 123,
  "email": "user@example.com"
}
```

## 🚫 Common Mistakes to Avoid

### ❌ Don't:
- Use POST for everything
- Return 200 for all responses
- Put actions in URLs (`/users/delete/123`)
- Ignore idempotency
- Mix REST levels

### ✅ Do:
- Use appropriate HTTP methods
- Return specific status codes
- Keep URLs resource-focused
- Make GET, PUT, DELETE idempotent
- Maintain consistency

## 📊 Success Metrics

You've reached Level 2 when:
- [ ] Each HTTP method has clear purpose
- [ ] Status codes accurately reflect outcomes
- [ ] No actions in request bodies
- [ ] GET requests are cacheable
- [ ] Errors use standard HTTP codes

## 🎉 Level 2 Benefits You'll Enjoy

1. **Caching**: GET requests cached automatically
2. **Tools**: Standard REST clients work perfectly
3. **Debugging**: Clear semantics in logs
4. **Security**: Method-based authorization
5. **Performance**: Optimized based on methods

## Next: Welcome to Industry Standard!

Once you implement HTTP verbs and status codes, you'll be at Level 2 - where most successful APIs live. Check the [Level 2 Guide](../level-2/) to validate your implementation!