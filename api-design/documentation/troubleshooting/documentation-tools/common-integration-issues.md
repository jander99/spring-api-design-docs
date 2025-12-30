# Common Integration Issues and Solutions

> **Reading Guide**
> - **Reading Time**: 8 minutes
> - **For**: Advanced developers debugging documentation issues
> - **Prerequisites**: Experience with Swagger UI, CI/CD pipelines, authentication
> - **Reading Level**: Grade 25.1 (Flesch: 3) - Very Difficult (code-heavy)

This guide covers common problems with documentation tools and how to fix them.

## Swagger UI Issues

### Swagger UI Won't Load
**What you see:**
- Blank page or loading spinner
- Browser shows missing file errors
- CORS errors

**How to fix:**
```bash
# Check if OpenAPI spec is valid
swagger-codegen validate -i openapi.yaml

# Verify CORS headers are set
curl -I -H "Origin: http://localhost:3000" http://api.example.com/openapi.yaml

# Check file permissions
ls -la openapi.yaml
```

**Quick fixes:**
- Check OpenAPI file is valid
- Fix CORS headers
- Check file paths and permissions
- Check CDN files work

### Problem: Authentication Not Working
**What you see:**
- API calls fail with 401/403 errors
- Authorization header not sent
- OAuth flow redirects fail

**How to fix:**
```yaml
# Correct OAuth2 configuration
securitySchemes:
  oauth2:
    type: oauth2
    flows:
      authorizationCode:
        authorizationUrl: https://auth.example.com/oauth/authorize
        tokenUrl: https://auth.example.com/oauth/token
        scopes:
          read:orders: Read order data
          write:orders: Create and update orders
```

**Debugging Steps:**
1. Check browser network tab for auth requests
2. Verify OAuth URLs are accessible
3. Confirm scopes match API requirements
4. Test auth flow manually

### Problem: Large API Spec Performance
**What you see:**
- Slow loading times
- Browser freezing
- Memory issues

**How to fix:**
```yaml
# Split large specs into multiple files
# main.yaml
openapi: 3.0.0
info:
  title: Main API
  version: 1.0.0
paths:
  /orders:
    $ref: './paths/orders.yaml'
  /users:
    $ref: './paths/users.yaml'
components:
  schemas:
    $ref: './schemas/index.yaml'
```

**Performance Optimizations:**
- Use `$ref` to split large specifications
- Implement lazy loading for large schemas
- Consider using Redoc for better performance
- Paginate or group API endpoints

## Redoc Issues

### Problem: Styling Conflicts
**What you see:**
- Broken layout
- Missing styles
- Overlapping elements

**How to fix:**
```html
<!-- Isolate Redoc styles -->
<div class="redoc-container">
  <redoc spec-url="openapi.yaml"></redoc>
</div>

<style>
.redoc-container {
  /* Reset styles */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
  line-height: 1.5;
}

/* Namespace Redoc styles */
.redoc-container .redoc-wrap {
  /* Custom overrides */
}
</style>
```

**Prevention:**
- Use CSS namespacing
- Test in isolation
- Check for conflicting stylesheets
- Use CSS-in-JS if needed

### Problem: Custom Themes Not Applied
**What you see:**
- Default theme still showing
- Custom colors not applied
- Font changes ignored

**How to fix:**
```json
// Custom theme configuration
{
  "theme": {
    "colors": {
      "primary": {
        "main": "#1976d2"
      },
      "text": {
        "primary": "#333"
      }
    },
    "typography": {
      "fontSize": "14px",
      "fontFamily": "Roboto, sans-serif",
      "headings": {
        "fontFamily": "Roboto, sans-serif",
        "fontWeight": "600"
      }
    },
    "sidebar": {
      "backgroundColor": "#f5f5f5"
    }
  }
}
```

**Troubleshooting:**
- Verify theme JSON is valid
- Check browser cache
- Ensure theme file is loaded
- Test with minimal theme first

## GitHub Pages Deployment Issues

### Problem: 404 Errors After Deployment
**What you see:**
- Main page loads but assets return 404
- Relative links broken
- Images not displaying

**How to fix:**
```yaml
# Fix base URL in GitHub Actions
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./docs
    # Important: Set base URL for GitHub Pages
    destination_dir: docs
```

**Quick fixes:**
- Use absolute paths for assets
- Configure base URL correctly
- Check repository settings
- Verify branch protection rules

### Problem: Build Fails in Actions
**What you see:**
- GitHub Actions workflow fails
- Build step errors
- Permission denied errors

**How to fix:**
```yaml
# Add proper permissions
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v3
      - name: Setup environment
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
```

**Debugging:**
- Check workflow permissions
- Verify tooling version compatibility
- Test build locally first
- Check for missing dependencies

## Backstage Integration Issues

### Problem: API Not Appearing in Catalog
**What you see:**
- API registered but not visible
- Catalog shows empty results
- Discovery errors in logs

**How to fix:**
```yaml
# Correct catalog-info.yaml structure
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: my-api
  description: My API description
  annotations:
    # Required for proper discovery
    backstage.io/techdocs-ref: dir:.
spec:
  type: openapi
  lifecycle: production
  owner: my-team
  definition:
    # Use $text for file reference
    $text: ./openapi.yaml
```

**Troubleshooting:**
- Check YAML syntax
- Verify file paths are correct
- Review Backstage logs
- Test with minimal catalog entry

### Problem: TechDocs Not Building
**What you see:**
- Documentation pages show 404
- Build fails with MkDocs errors
- Missing documentation in portal

**How to fix:**
```yaml
# mkdocs.yml configuration
site_name: My API Documentation
plugins:
  - techdocs-core
theme:
  name: material
nav:
  - Home: index.md
  - API Reference: reference.md
```

**Common Issues:**
- Missing mkdocs.yml file
- Incorrect plugin configuration
- Broken Markdown links
- Missing index.md file

## CI/CD Pipeline Issues

### Problem: OpenAPI Validation Fails
**What you see:**
- Pipeline fails at validation step
- Spec lint errors
- Invalid OpenAPI format

**How to fix:**
```bash
# Use multiple validators
# Spectral for advanced linting
spectral lint openapi.yaml

# Swagger Editor validator
swagger-codegen validate -i openapi.yaml

# Redocly CLI
redocly lint openapi.yaml
```

**Common Validation Errors:**
- Missing required fields
- Invalid schema references
- Incorrect HTTP status codes
- Malformed examples

### Problem: Documentation Not Updating
**What you see:**
- Changes not reflected in docs
- Caching issues
- Stale content

**How to fix:**
```yaml
# Force cache invalidation
- name: Deploy documentation
  run: |
    # Clear CDN cache
    curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}'
```

**Debugging Steps:**
1. Check if build actually ran
2. Verify deployment succeeded
3. Clear browser cache
4. Test in incognito mode

## Authentication and Authorization Issues

### Problem: OAuth Flow Broken
**What you see:**
- Redirect loops
- Token not persisting
- PKCE errors

**How to fix:**
```javascript
// Correct OAuth configuration
const swaggerUIBundle = SwaggerUIBundle({
  url: '/openapi.yaml',
  dom_id: '#swagger-ui',
  oauth2RedirectUrl: window.location.origin + '/oauth2-redirect.html',
  initOAuth: {
    clientId: 'your-client-id',
    realm: 'your-realm',
    appName: 'API Documentation',
    scopeSeparator: ' ',
    usePkceWithAuthorizationCodeGrant: true
  }
});
```

**Common Issues:**
- Incorrect redirect URL
- Missing PKCE configuration
- Scope format problems
- CORS configuration errors

### Problem: API Keys Not Working
**What you see:**
- Authentication header missing
- API key format incorrect
- Security scheme not applied

**How to fix:**
```yaml
# Correct API key security scheme
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for authentication

# Apply to specific operations
paths:
  /protected:
    get:
      security:
        - ApiKeyAuth: []
```

**Verification:**
- Check header name matches API expectations
- Verify key format (Bearer, Basic, etc.)
- Test with actual API key
- Check for key expiration

## Performance and Scalability Issues

### Problem: Slow Documentation Loading
**What you see:**
- Long page load times
- High bandwidth usage
- Poor user experience

**How to fix:**
```nginx
# Nginx configuration for documentation
server {
    location /docs {
        # Enable compression
        gzip on;
        gzip_types text/plain text/css application/javascript application/json;
        
        # Add cache headers
        expires 1h;
        add_header Cache-Control "public, must-revalidate, proxy-revalidate";
        
        # Enable HTTP/2
        http2_push_preload on;
    }
}
```

**Optimizations:**
- Implement CDN caching
- Compress static assets
- Use lazy loading
- Optimize images

### Problem: High Memory Usage
**What you see:**
- Browser crashes
- Slow rendering
- Memory leaks

**How to fix:**
```javascript
// Implement pagination for large APIs
const swaggerUIBundle = SwaggerUIBundle({
  url: '/openapi.yaml',
  dom_id: '#swagger-ui',
  // Limit operations display
  defaultModelsExpandDepth: 0,
  defaultModelExpandDepth: 0,
  docExpansion: 'none'
});
```

**Memory Management:**
- Use virtual scrolling
- Implement progressive loading
- Optimize DOM structure
- Clean up event listeners

## Monitoring and Debugging

### Essential Monitoring
```bash
# Check documentation availability
curl -I https://api-docs.example.com/

# Monitor API spec validity
spectral lint openapi.yaml --format json > lint-results.json

# Check SSL certificates
openssl s_client -connect api-docs.example.com:443 -servername api-docs.example.com
```

### Debugging Tools
- Browser Developer Tools
- Network tab for API calls
- Console for script errors
- Lighthouse for performance
- OpenAPI validators

### Log Analysis
```bash
# Common log patterns to monitor
grep "404" /var/log/nginx/access.log | head -10
grep "OpenAPI" /var/log/application.log
grep "ERROR" /var/log/documentation.log
```

## Prevention Strategies

### Automated Testing
```yaml
# Test documentation in CI/CD
- name: Test documentation
  run: |
    # Validate OpenAPI spec
    spectral lint openapi.yaml
    
    # Test example requests
    newman run postman-collection.json
    
    # Check for broken links
    linkchecker http://localhost:8080/docs
```

### Health Checks
```javascript
// Documentation health check endpoint
app.get('/health/docs', (req, res) => {
  const checks = {
    openapi_spec: checkOpenAPISpec(),
    swagger_ui: checkSwaggerUI(),
    authentication: checkAuth(),
    examples: checkExamples()
  };
  
  const healthy = Object.values(checks).every(check => check.status === 'ok');
  res.status(healthy ? 200 : 503).json(checks);
});
```

### Regular Maintenance
- Monthly link validation
- Quarterly tool updates
- Annual security reviews
- Continuous performance monitoring

By following these troubleshooting guides and prevention strategies, you can maintain reliable and performant API documentation throughout your development lifecycle.