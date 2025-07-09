# Documentation Testing Tools Reference

## Validation Tools

| Tool | Purpose | Strengths | Best For |
|------|---------|-----------|----------|
| **Spectral** | OpenAPI linting | Custom rules, extensible | Schema validation, style enforcement |
| **Redocly CLI** | OpenAPI validation | Enterprise features, bundling | Multi-file specs, performance |
| **OpenAPI Diff** | Breaking change detection | Semantic versioning, impact analysis | Release management, CI/CD |
| **Swagger Parser** | Schema validation | Cross-platform, code generation | Reference resolution, compatibility |
| **Prism** | Mock server validation | Request/response testing, proxy mode | Contract testing, development |

## Testing Frameworks

| Tool | Type | Language | Integration |
|------|------|----------|-------------|
| **Postman/Newman** | API Testing | JavaScript | CI/CD, reporting |
| **Insomnia** | API Testing | JavaScript | Team collaboration |
| **Pact** | Contract Testing | Multi-language | Consumer-driven contracts |
| **Dredd** | API Testing | JavaScript | OpenAPI specification |
| **Schemathesis** | Property Testing | Python | Fuzzing, edge cases |

## Configuration Examples

### Spectral Configuration
```yaml
extends: ["@stoplight/spectral-cli/rulesets/oas"]
rules:
  operation-description: error
  operation-summary: error
  parameter-description: error
  schema-names-pascal-case: error
```

### Prism Configuration
```yaml
mock:
  dynamic: true
  errors: true
  mediaTypes:
    - application/json
    - application/xml
  validateRequest: true
  validateResponse: true
```

### Redocly Configuration
```yaml
apis:
  main:
    root: ./openapi.yaml
    theme:
      colors:
        primary:
          main: '#32329f'
```

## Quality Metrics

### Coverage Metrics
- **Endpoint Coverage**: Percentage of endpoints documented
- **Schema Coverage**: Percentage of models with examples
- **Error Coverage**: Percentage of error responses documented
- **Security Coverage**: Percentage of endpoints with security documentation

### Performance Metrics
- **Validation Time**: Time to validate full specification
- **Test Execution Time**: Time to run all documentation tests
- **Build Time Impact**: Additional time added to CI/CD pipeline
- **Resource Usage**: Memory and CPU usage during testing

## Tool Installation

### npm packages
```bash
npm install -g @stoplight/spectral-cli
npm install -g @redocly/cli
npm install -g swagger-parser
npm install -g @stoplight/prism-cli
```

### Python packages
```bash
pip install schemathesis
pip install openapi-diff
```

### Docker Images
```bash
docker pull stoplight/spectral
docker pull redocly/cli
docker pull stoplight/prism
```