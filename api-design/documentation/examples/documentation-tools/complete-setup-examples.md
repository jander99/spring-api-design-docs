# Complete Setup Examples

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
        const ui = SwaggerUIBundle({
            url: '/openapi.yaml',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
            ],
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
            onComplete: function() {
                // Custom JavaScript after load
                console.log('Swagger UI loaded');
            }
        });
    </script>
</body>
</html>
```

## Backstage API Catalog Setup

### Catalog Registration
```yaml
# catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: order-api
  description: Order management API
  annotations:
    backstage.io/techdocs-ref: dir:.
    backstage.io/owner: order-team
    backstage.io/api-lifecycle: production
    backstage.io/kubernetes-id: order-service
spec:
  type: openapi
  lifecycle: production
  owner: order-team
  system: e-commerce
  definition:
    $text: ./openapi.yaml
---
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: order-service
  description: Order processing microservice
  annotations:
    backstage.io/techdocs-ref: dir:.
    backstage.io/kubernetes-id: order-service
spec:
  type: service
  lifecycle: production
  owner: order-team
  system: e-commerce
  providesApis:
    - order-api
  dependsOn:
    - payment-api
    - inventory-api
```

### TechDocs Integration
```yaml
# mkdocs.yml
site_name: Order API Documentation
site_description: Comprehensive documentation for the Order API

nav:
  - Home: index.md
  - API Reference: api-reference.md
  - Getting Started: getting-started.md
  - Examples: examples.md
  - Troubleshooting: troubleshooting.md

plugins:
  - techdocs-core

theme:
  name: material
  palette:
    primary: blue
    accent: blue
```

## CI/CD Automation Examples

### GitHub Actions Pipeline
```yaml
# .github/workflows/docs.yml
name: Generate and Deploy Documentation
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install -g @redocly/openapi-cli
          npm install -g swagger-ui-dist
      
      - name: Validate OpenAPI spec
        run: |
          redocly lint openapi.yaml
      
      - name: Generate documentation
        run: |
          # Generate Swagger UI
          mkdir -p docs/swagger-ui
          cp -r node_modules/swagger-ui-dist/* docs/swagger-ui/
          
          # Generate Redoc
          redocly build-docs openapi.yaml -o docs/redoc.html
          
          # Generate multi-format docs
          redocly build-docs openapi.yaml -o docs/api-reference.html
          
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        if: github.ref == 'refs/heads/main'
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
          cname: api-docs.example.com
```

### GitLab CI Pipeline
```yaml
# .gitlab-ci.yml
stages:
  - validate
  - build
  - deploy

variables:
  DOCKER_IMAGE: redocly/cli:latest

validate_openapi:
  stage: validate
  image: $DOCKER_IMAGE
  script:
    - redocly lint openapi.yaml
    - redocly bundle openapi.yaml -o bundled-openapi.yaml
  artifacts:
    paths:
      - bundled-openapi.yaml
    expire_in: 1 hour

build_docs:
  stage: build
  image: $DOCKER_IMAGE
  script:
    - mkdir -p public
    - redocly build-docs bundled-openapi.yaml -o public/index.html
    - redocly build-docs bundled-openapi.yaml -o public/api-reference.html --theme=openapi
  artifacts:
    paths:
      - public
    expire_in: 1 hour

deploy_docs:
  stage: deploy
  script:
    - echo "Documentation deployed to GitLab Pages"
  artifacts:
    paths:
      - public
  only:
    - main
```

## Client Library Generation

### OpenAPI Generator Setup
```bash
#!/bin/bash
# generate-clients.sh

OPENAPI_SPEC="openapi.yaml"
OUTPUT_DIR="generated-clients"

# Create output directory
mkdir -p $OUTPUT_DIR

# Generate TypeScript client
openapi-generator generate \
  -i $OPENAPI_SPEC \
  -g typescript-axios \
  -o $OUTPUT_DIR/typescript \
  --additional-properties=npmName=@company/api-client,npmVersion=1.0.0

# Generate Java client
openapi-generator generate \
  -i $OPENAPI_SPEC \
  -g java \
  -o $OUTPUT_DIR/java \
  --additional-properties=packageName=com.company.api.client,artifactId=api-client,groupId=com.company

# Generate Python client
openapi-generator generate \
  -i $OPENAPI_SPEC \
  -g python \
  -o $OUTPUT_DIR/python \
  --additional-properties=packageName=company_api_client,projectName=company-api-client

# Generate C# client
openapi-generator generate \
  -i $OPENAPI_SPEC \
  -g csharp-netcore \
  -o $OUTPUT_DIR/csharp \
  --additional-properties=packageName=Company.Api.Client,clientPackage=Company.Api.Client

echo "Client libraries generated successfully!"
```

### Custom Templates
```mustache
{{! Custom template for TypeScript client }}
{{>licenseInfo}}
/* tslint:disable */
/* eslint-disable */
{{#models}}
{{#model}}
/**
 * {{description}}
 */
export interface {{classname}} {
{{#vars}}
    /**
     * {{description}}
     */
    {{name}}{{^required}}?{{/required}}: {{datatype}};
{{/vars}}
}
{{/model}}
{{/models}}
```

## Custom Portal Development

### API Portal Configuration
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

### React Portal Component
```jsx
// APIPortal.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container } from '@mui/material';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import APIList from './components/APIList';
import APIDetails from './components/APIDetails';
import SearchResults from './components/SearchResults';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function APIPortal() {
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAPIs();
  }, []);

  const fetchAPIs = async () => {
    try {
      const response = await fetch('/api/catalog');
      const data = await response.json();
      setApis(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching APIs:', error);
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const filteredApis = apis.filter(api =>
    api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="api-portal">
          <Header onSearch={handleSearch} />
          <Container maxWidth="xl">
            <div className="portal-content">
              <Sidebar apis={apis} />
              <main className="main-content">
                <Routes>
                  <Route 
                    path="/" 
                    element={
                      <APIList 
                        apis={filteredApis} 
                        loading={loading} 
                        searchQuery={searchQuery}
                      />
                    } 
                  />
                  <Route 
                    path="/api/:apiId" 
                    element={<APIDetails />} 
                  />
                  <Route 
                    path="/search" 
                    element={
                      <SearchResults 
                        apis={filteredApis} 
                        query={searchQuery} 
                      />
                    } 
                  />
                </Routes>
              </main>
            </div>
          </Container>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default APIPortal;
```

These examples provide comprehensive setups for various documentation tools and integration scenarios. Choose the configurations that best fit your specific requirements and customize them accordingly.