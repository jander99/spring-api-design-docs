# API Maturity Assessment Tool

## 5-Minute Quick Assessment

Answer these questions to determine your API's Richardson Maturity Model level.

### Question 1: How many endpoints does your API have?

- [ ] **A)** One endpoint that handles everything
- [ ] **B)** Multiple endpoints for different resources
- [ ] **C)** Multiple endpoints with proper resource hierarchy
- [ ] **D)** Multiple endpoints with discoverable links between them

### Question 2: Which HTTP methods does your API use?

- [ ] **A)** Only POST (or only one method)
- [ ] **B)** Mostly POST, sometimes GET
- [ ] **C)** GET, POST, PUT/PATCH, DELETE appropriately
- [ ] **D)** All appropriate methods plus OPTIONS for discovery

### Question 3: How do you specify what operation to perform?

- [ ] **A)** Operation name in the request body
- [ ] **B)** Different URLs for different operations
- [ ] **C)** HTTP method determines the operation
- [ ] **D)** HTTP method plus discoverable actions in responses

### Question 4: What do your API responses include?

- [ ] **A)** Just the data requested
- [ ] **B)** Data with some metadata
- [ ] **C)** Data with proper status codes and headers
- [ ] **D)** Data with links to related resources and actions

### Question 5: How do clients know what they can do next?

- [ ] **A)** They read our documentation
- [ ] **B)** They know the URL patterns
- [ ] **C)** They understand REST conventions
- [ ] **D)** The API tells them via hypermedia links

## 📊 Scoring Your API

Count your answers:

### Mostly A's → **Level 0: The Swamp of POX**
Your API uses HTTP as a transport mechanism only. Time to start thinking in resources!
- [📍 Your Current State](level-0/)
- [🚀 How to Reach Level 1](level-0/next-steps.md)

### Mostly B's → **Level 1: Resources**
You're thinking in resources but not fully utilizing HTTP. Good progress!
- [📍 Your Current State](level-1/)
- [🚀 How to Reach Level 2](level-1/next-steps.md)

### Mostly C's → **Level 2: HTTP Verbs**
Congratulations! You're at a widely-adopted maturity level. Consider if Level 3 benefits your use case.
- [📍 Your Current State](level-2/)
- [🚀 How to Reach Level 3](level-2/next-steps.md)

### Mostly D's → **Level 3: Hypermedia Controls**
You've reached the highest RMM level! Focus on maintaining and optimizing.
- [📍 Your Current State](level-3/)
- [✨ Best Practices](level-3/best-practices.md)

## Detailed Assessment Checklist

### Level 0 Indicators
- [ ] Single endpoint (e.g., `/api` or `/service`)
- [ ] All requests use same HTTP method
- [ ] Operation specified in request body
- [ ] Custom error formats
- [ ] No resource concept

### Level 1 Indicators
- [ ] Multiple endpoints for different entities
- [ ] Resources have identifiers in URLs
- [ ] Still mostly using POST
- [ ] Beginning to think in nouns (resources)
- [ ] Some URL hierarchy

### Level 2 Indicators
- [ ] GET for reading, POST for creating
- [ ] PUT/PATCH for updating, DELETE for removing
- [ ] Proper HTTP status codes (200, 201, 404, etc.)
- [ ] Resources accessed via standard patterns
- [ ] Request/response headers used correctly

### Level 3 Indicators
- [ ] Responses include `_links` or similar
- [ ] Links indicate available actions
- [ ] Clients can discover API capabilities
- [ ] Self-descriptive messages
- [ ] HATEOAS principles followed

## 🎯 Not Sure? Try These Tests

### Test 1: The New Developer Test
Give your API to a developer who's never seen it. If they need extensive documentation to do basic operations, you're likely Level 0-1.

### Test 2: The Generic Client Test
Can a generic REST client (like Postman) interact with your API using just HTTP conventions? If yes, you're at least Level 2.

### Test 3: The Discovery Test
Can a client discover what actions are available without hardcoding URLs? If yes, you're Level 3.

## 📈 What's Your Goal?

Not every API needs to be Level 3! Consider:

- **Internal APIs**: Level 2 is usually perfect
- **Public APIs**: Level 3 helps with longevity
- **Microservices**: Level 2 with good documentation
- **Legacy Migration**: Aim for Level 1, plan for Level 2

## Next Steps

Based on your assessment:
1. Review your current level's documentation
2. Identify gaps using the checklists
3. Follow the step-by-step migration guide
4. Implement changes incrementally

Remember: **Progress over perfection!** Moving from Level 0 to Level 1 is more valuable than perfecting Level 3.