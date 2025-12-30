# Complete Setup Examples

> **Reading Guide**
> - **Reading Time**: 5 minutes
> - **For**: Advanced developers with strong API background
> - **Prerequisites**: Experience with documentation tools, CI/CD pipelines
> - **Reading Level**: Grade 23.2 (Flesch: -37.3) - Very Difficult (code-heavy)

This document provides detailed configuration examples for popular documentation tools and platforms.

## Swagger UI Advanced Configuration

### Multi-API Configuration
```yaml
# swagger-config.yaml
urls:
  - name: "Public API"
    url: "/openapi/public.yaml"
  - name: "Internal API"
    url: "/openapi/internal.yaml"
  - name: "Admin API"
    url: "/openapi/admin.yaml"

# Advanced configuration options
options:
  tryItOutEnabled: true
  filter: true
  deepLinking: true
  defaultModelsExpandDepth: 1
  defaultModelExpandDepth: 1
  operationsSorter: "alpha"
  tagsSorter: "alpha"
  displayRequestDuration: true
  showExtensions: true
  showCommonExtensions: true
  persistAuthorization: true
```

### Custom Styling
```html
<!-- Custom Swagger UI HTML -->
<!DOCTYPE html>
<html>
<head>
    <title>API Documentation</title>
    <link rel="stylesheet" type="text/css" href="swagger-ui-bundle.css" />
    <link rel="stylesheet" type="text/css" href="swagger-ui-standalone-preset.css" />
    <style>
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 50px 0; }
        .swagger-ui .scheme-container { background: #f7f7f7; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="swagger-ui-bundle.js"></script>
    <script src="swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            window.ui = SwaggerUIBundle({
                urls: [
                    {url: "/openapi/public.yaml", name: "Public API"},
                    {url: "/openapi/internal.yaml", name: "Internal API"}
                ],
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            });
            
            window.ui.initOAuth({
                clientId: "documentation-client",
                realm: "documentation",
                appName: "API Documentation",
                scopeSeparator: " ",
                additionalQueryStringParams: {}
            });
        };
    </script>
</body>
</html>
```

## Redoc Configuration

### Custom Theme
```yaml
# redoc-config.yaml
theme:
  colors:
    primary:
      main: '#1976d2'
    success:
      main: '#4caf50'
    warning:
      main: '#ff9800'
    error:
      main: '#f44336'
    text:
      primary: '#212121'
      secondary: '#757575'
  typography:
    fontSize: '14px'
    lineHeight: '1.5'
    fontFamily: 'Roboto, sans-serif'
    headings:
      fontFamily: 'Roboto, sans-serif'
      fontWeight: '500'
  spacing:
    unit: 8
    sectionHorizontal: 40
    sectionVertical: 40
  breakpoints:
    small: '50rem'
    medium: '85rem'
    large: '105rem'

# Features
features:
  nativeScrollbars: false
  scrollYOffset: 0
  hideDownloadButton: false
  disableSearch: false
  hideLoading: false
  expandResponses: '200,201'
  expandSingleSchemaField: true
  untrustedSpec: false
  hideSingleRequestSampleTab: false
  hideRequestPayloadSample: false
  jsonSampleExpandLevel: 2
  hideSchemaTitles: false
  simpleOneOfTypeLabel: false
  menuToggle: true
  sortPropsAlphabetically: false
  payloadSampleIdx: 0
```

### Embedded Redoc
```html
<!DOCTYPE html>
<html>
<head>
    <title>API Reference Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" rel="stylesheet">
</head>
<body>
    <redoc spec-url='/openapi.yaml'></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc/bundles/redoc.standalone.js"></script>
</body>
</html>
```

## GitHub Actions Documentation Pipeline

### Automated Documentation Build
```yaml
# .github/workflows/docs.yml
name: Documentation Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate-and-build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup tooling
        run: |
          # Install documentation validation tools
          npm install -g @redocly/openapi-cli
          npm install -g swagger-ui-dist
      
      - name: Validate OpenAPI spec
        run: |
          redocly lint openapi.yaml
      
      - name: Generate documentation
        run: |
          # Generate static documentation files
          redocly build-docs openapi.yaml --output=index.html
      
      - name: Deploy to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

## Documentation Portal Configuration

### API Portal Structure
```yaml
# portal-config.yaml
portal:
  title: "Company API Portal"
  description: "Centralized API documentation and discovery"
  logo: "/assets/logo.svg"
  favicon: "/assets/favicon.ico"
  
  features:
    - api_discovery
    - interactive_docs
    - code_generation
    - testing_tools
    - analytics
    - feedback_system
  
  authentication:
    type: oauth2
    provider: "company-sso"
    scopes: ["read:apis", "write:feedback"]
  
  apis:
    - name: "Order Service"
      version: "v1"
      openapi_url: "/services/order/openapi.yaml"
      status: "production"
      owner: "order-team"
      tags: ["e-commerce", "orders"]
      
    - name: "User Service"
      version: "v2"
      openapi_url: "/services/user/openapi.yaml"
      status: "beta"
      owner: "user-team"
      tags: ["authentication", "users"]
      
    - name: "Payment Service"
      version: "v1"
      openapi_url: "/services/payment/openapi.yaml"
      status: "production"
      owner: "payment-team"
      tags: ["e-commerce", "payments"]
  
  customization:
    theme:
      primary_color: "#1976d2"
      secondary_color: "#dc004e"
      font_family: "Roboto, sans-serif"
    
    footer:
      links:
        - text: "Support"
          url: "https://support.company.com"
        - text: "Terms of Service"
          url: "https://company.com/terms"
        - text: "Privacy Policy"
          url: "https://company.com/privacy"
```

## Client Library Generation

### OpenAPI Generator Configuration
```yaml
# generator-config.yaml
generatorName: "configurable"
outputDir: "./generated-clients"
inputSpec: "./openapi.yaml"

globalProperties:
  apiDocs: true
  apiTests: true
  modelDocs: true
  modelTests: true

additionalProperties:
  packageName: "api-client"
  packageVersion: "1.0.0"
  projectName: "API Client Library"
  projectDescription: "Auto-generated client library for our API"
  licenseText: "Internal use only"
  supportingFiles: true
  
# Customization options
customOptions:
  dateLibrary: "native"
  enumPropertyNaming: "UPPERCASE"
  usePromises: true
  useSingleRequestParameter: true
```

### Generator Automation
```yaml
# Generate client libraries as part of CI/CD
generate-clients:
  stage: build
  script:
    - openapi-generator batch generator-config.yaml
  artifacts:
    paths:
      - generated-clients/
    expire_in: 1 week
```

These examples provide comprehensive setups for various documentation tools and integration scenarios. Choose the configurations that best fit your specific requirements and customize them accordingly.