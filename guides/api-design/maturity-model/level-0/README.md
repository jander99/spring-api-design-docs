# Level 0: The Swamp of POX

## 📍 You Are Here

Your API is at Level 0 of the Richardson Maturity Model. This is often called "The Swamp of POX" (Plain Old XML/JSON).

## What This Means

### Characteristics of Level 0 APIs:
- **Single endpoint** for all operations
- **HTTP as transport only** - not using its features
- **Operations in request body** - not in URL or method
- **Custom protocols** over HTTP

### Typical Level 0 Request:
```
POST /api
Content-Type: application/json

{
  "method": "getUser",
  "params": {
    "userId": 123
  }
}
```

### Why You Might Be Here:
- Legacy system design
- RPC-style thinking
- SOAP service migration
- Quick prototype that grew

## 🎯 Current State Checklist

Your API likely has these characteristics:

- [ ] **Single URL endpoint** (e.g., `/api`, `/service`, `/endpoint`)
- [ ] **All requests use POST** (or all use one HTTP method)
- [ ] **Operation names in request body** (e.g., "method": "createUser")
- [ ] **Custom error formats** (not using HTTP status codes)
- [ ] **No concept of resources** (thinking in procedures, not things)
- [ ] **Session-based state** (not stateless)
- [ ] **Batch operations common** (multiple operations per request)

## 💡 What You Have Working:
- ✅ HTTP communication established
- ✅ Request/response pattern
- ✅ Structured data format (JSON/XML)
- ✅ Client-server architecture

## ⚠️ Current Limitations:
- ❌ Cannot leverage HTTP caching
- ❌ Difficult to use standard tools
- ❌ No standard error handling
- ❌ Hard to document and test
- ❌ Limited scalability options
- ❌ Poor separation of concerns

## 🔍 Examples in Your Current State

### Creating a User (Level 0):
```
POST /api
{
  "method": "createUser",
  "params": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Getting a User (Level 0):
```
POST /api
{
  "method": "getUser",
  "params": {
    "userId": 123
  }
}
```

### Deleting a User (Level 0):
```
POST /api
{
  "method": "deleteUser",
  "params": {
    "userId": 123
  }
}
```

## 📈 Why Move Beyond Level 0?

### Immediate Benefits of Level 1:
- Standard URL patterns
- Easier to understand and document
- Better tool support
- Improved debugging

### Long-term Benefits:
- Scalability improvements
- Standard caching strategies
- Better security models
- Easier integration

## 🚀 Ready to Level Up?

Moving to Level 1 is simpler than you think! Start with:
1. [Understanding Resources](next-steps.md)
2. [Identifying Your Resources](next-steps.md#identify-resources)
3. [Creating Resource URLs](next-steps.md#create-urls)

[→ **View Your Path to Level 1**](next-steps.md)

## 🤝 You're Not Alone

Many successful APIs started at Level 0:
- Legacy enterprise systems
- SOAP to REST migrations
- Internal RPC services

The journey to REST maturity is incremental - every step counts!