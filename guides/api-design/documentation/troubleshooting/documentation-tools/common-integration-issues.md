# Common Integration Issues and Solutions

This guide helps you fix common documentation tool problems.

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 9 minutes | **🟢 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Troubleshooting, Documentation Tools, Integration
> 
> **📊 Complexity:** 7.2 grade level • 1.1% technical density • easy

## Swagger UI Issues

### Swagger UI Won't Load

**Problem:** You see a blank page, endless loading spinner, or CORS errors.

**What causes this:**
- Your OpenAPI spec has validation errors
- CORS headers are missing or incorrect
- File permissions block access
- CDN files fail to load

**Quick Fix:**
1. Validate your OpenAPI file first
2. Check CORS headers on your server
3. Verify file permissions allow reading
4. Test CDN file URLs in your browser

**Validation commands:**
```bash
# Check if OpenAPI spec is valid
swagger-codegen validate -i openapi.yaml

# Verify CORS headers are set
curl -I -H "Origin: http://localhost:3000" http://api.example.com/openapi.yaml

# Check file permissions
ls -la openapi.yaml
```

### Authentication Not Working

**Problem:** API calls fail with 401 or 403 errors. Authorization headers don't get sent.

**What causes this:**
- OAuth URLs are wrong or unreachable
- Security schemes don't match your API
- Scopes are missing or incorrect
- Redirect URLs are misconfigured

**Quick Fix:**
1. Open your browser's network tab
2. Watch for authentication requests
3. Check if OAuth URLs respond
4. Verify scopes match API needs

**Correct OAuth2 setup:**
```yaml
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

### Large API Spec Performance

**Problem:** The page loads slowly. Your browser freezes or runs out of memory.

**What causes this:**
- Your OpenAPI spec is too large
- All endpoints load at once
- Schemas expand recursively
- No lazy loading is enabled

**Quick Fix:**
1. Split your spec into multiple files
2. Use `$ref` to link files together
3. Enable lazy loading in Swagger UI
4. Consider switching to Redoc

**Split large specs:**
```yaml
# main.yaml
openapi: 3.1.0
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

## Redoc Issues

### Styling Conflicts

**Problem:** The layout breaks. Styles go missing. Elements overlap each other.

**What causes this:**
- Your site's CSS conflicts with Redoc
- Global styles override Redoc styles
- Multiple stylesheets clash
- No CSS isolation exists

**Quick Fix:**
1. Wrap Redoc in its own container
2. Use CSS namespacing
3. Test Redoc on a blank page first
4. Check for conflicting stylesheets

**Isolate Redoc styles:**
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

### Custom Themes Not Applied

**Problem:** Redoc shows the default theme. Your custom colors and fonts don't appear.

**What causes this:**
- Invalid JSON in theme config
- Browser cache shows old version
- Theme file doesn't load
- Config path is wrong

**Quick Fix:**
1. Validate your JSON syntax
2. Clear your browser cache
3. Check the network tab for theme file
4. Test with a simple theme first

**Custom theme config:**
```json
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

## GitHub Pages Deployment Issues

### 404 Errors After Deployment

**Problem:** The main page loads but assets return 404. Links and images break.

**What causes this:**
- Relative paths don't work on GitHub Pages
- Base URL is not configured
- Assets are in wrong directory
- Branch protection blocks deployment

**Quick Fix:**
1. Use absolute paths for all assets
2. Set the correct base URL
3. Check repository settings
4. Verify branch protection rules

**Fix base URL:**
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

### Build Fails in Actions

**Problem:** GitHub Actions workflow fails. You see permission or build errors.

**What causes this:**
- Workflow lacks proper permissions
- Node or tool versions mismatch
- Dependencies are missing
- Local build works but CI fails

**Quick Fix:**
1. Add required permissions to workflow
2. Match tool versions with local setup
3. Test your build locally first
4. Check for missing dependencies

**Add proper permissions:**
```yaml
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

## Backstage Integration Issues

### API Not Appearing in Catalog

**Problem:** You register your API but it doesn't show up. The catalog looks empty.

**What causes this:**
- YAML syntax errors in catalog file
- File paths point to wrong locations
- Required fields are missing
- Discovery process failed

**Quick Fix:**
1. Validate your YAML syntax
2. Check all file paths are correct
3. Look at Backstage logs for errors
4. Test with a minimal catalog entry first

**Correct catalog structure:**
```yaml
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

### TechDocs Not Building

**Problem:** Documentation pages return 404. MkDocs build fails.

**What causes this:**
- mkdocs.yml file is missing
- Plugin config is wrong
- Markdown links are broken
- index.md file doesn't exist

**Quick Fix:**
1. Add mkdocs.yml to your repo
2. Include techdocs-core plugin
3. Fix broken Markdown links
4. Create an index.md file

**mkdocs.yml config:**
```yaml
site_name: My API Documentation
plugins:
  - techdocs-core
theme:
  name: material
nav:
  - Home: index.md
  - API Reference: reference.md
```

## CI/CD Pipeline Issues

### OpenAPI Validation Fails

**Problem:** Your pipeline fails at the validation step. You see lint errors.

**What causes this:**
- Required fields are missing
- Schema references are invalid
- HTTP status codes are wrong
- Examples are malformed

**Quick Fix:**
1. Run validators locally first
2. Fix one error type at a time
3. Check schema references carefully
4. Validate all examples

**Run multiple validators:**
```bash
# Spectral for advanced linting
spectral lint openapi.yaml

# Swagger Editor validator
swagger-codegen validate -i openapi.yaml

# Redocly CLI
redocly lint openapi.yaml
```

### Documentation Not Updating

**Problem:** You make changes but the docs stay the same. Content looks stale.

**What causes this:**
- CDN cache holds old version
- Build didn't actually run
- Deployment failed silently
- Browser cache is active

**Quick Fix:**
1. Check if the build ran
2. Verify deployment succeeded
3. Clear your browser cache
4. Test in incognito mode
5. Purge CDN cache if needed

**Force cache clear:**
```yaml
- name: Deploy documentation
  run: |
    # Clear CDN cache
    curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}'
```

## Authentication and Authorization Issues

### OAuth Flow Broken

**Problem:** OAuth creates redirect loops. Tokens don't persist. PKCE fails.

**What causes this:**
- Redirect URL doesn't match config
- PKCE is not enabled
- Scope separator is wrong
- CORS blocks the auth flow

**Quick Fix:**
1. Check redirect URL matches exactly
2. Enable PKCE in your config
3. Use space as scope separator
4. Fix CORS to allow auth domain

**Correct OAuth setup:**
```javascript
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

### API Keys Not Working

**Problem:** Headers don't include your API key. Auth fails for all requests.

**What causes this:**
- Header name doesn't match API
- Key format is wrong (Bearer vs plain)
- Security scheme isn't applied
- API key has expired

**Quick Fix:**
1. Check header name matches your API
2. Verify key format (Bearer, Basic, plain)
3. Apply security to operations
4. Test with a valid, non-expired key

**Correct API key setup:**
```yaml
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

## Performance and Scalability Issues

### Slow Documentation Loading

**Problem:** Pages take too long to load. Users experience poor performance.

**What causes this:**
- No compression is enabled
- Cache headers are missing
- Assets are not on a CDN
- Images are too large

**Quick Fix:**
1. Enable gzip compression
2. Add cache headers
3. Use a CDN for static files
4. Optimize or lazy-load images

**Nginx config:**
```nginx
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

### High Memory Usage

**Problem:** The browser crashes or slows down. Memory usage keeps growing.

**What causes this:**
- All models expand at once
- DOM grows too large
- Event listeners never clean up
- No virtual scrolling exists

**Quick Fix:**
1. Collapse models by default
2. Disable auto-expansion
3. Use virtual scrolling
4. Clean up event listeners

**Limit memory usage:**
```javascript
const swaggerUIBundle = SwaggerUIBundle({
  url: '/openapi.yaml',
  dom_id: '#swagger-ui',
  // Limit operations display
  defaultModelsExpandDepth: 0,
  defaultModelExpandDepth: 0,
  docExpansion: 'none'
});
```

## Monitoring and Debugging

### Essential Monitoring

**Check these regularly:**

1. **Documentation availability** - Test if docs load
2. **Spec validity** - Run validators daily
3. **SSL certificates** - Check expiration dates
4. **Error logs** - Watch for 404s and errors

**Monitoring commands:**
```bash
# Check documentation availability
curl -I https://api-docs.example.com/

# Monitor API spec validity
spectral lint openapi.yaml --format json > lint-results.json

# Check SSL certificates
openssl s_client -connect api-docs.example.com:443 -servername api-docs.example.com
```

### Debugging Tools

**Use these tools to debug issues:**
- Browser Developer Tools (F12)
- Network tab for request inspection
- Console for JavaScript errors
- Lighthouse for performance audits
- OpenAPI validators for spec issues

### Log Analysis

**Watch for these patterns:**
```bash
# Find 404 errors
grep "404" /var/log/nginx/access.log | head -10

# Find OpenAPI issues
grep "OpenAPI" /var/log/application.log

# Find general errors
grep "ERROR" /var/log/documentation.log
```

## Prevention Strategies

### Automated Testing

**Test your docs in CI/CD:**

1. Validate OpenAPI spec
2. Test example requests
3. Check for broken links
4. Verify authentication flows

**CI/CD test example:**
```yaml
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

**Monitor docs health continuously:**

Add a health check endpoint that tests key components. Return 200 if healthy, 503 if not.

**Health check endpoint:**
```javascript
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

**Keep your docs healthy:**
- **Monthly:** Validate all links
- **Quarterly:** Update tools and dependencies
- **Annually:** Review security settings
- **Continuously:** Monitor performance metrics

These strategies help you maintain reliable docs throughout your development lifecycle.