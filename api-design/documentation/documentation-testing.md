# Documentation Testing

## Overview

Test API documentation to ensure accuracy and reliability. Use automated tools to validate schemas, examples, and detect breaking changes.

## Core Validation

### Essential Checks
- **Schema Validation**: Examples match OpenAPI schemas
- **Breaking Changes**: Detect incompatible API changes
- **Coverage**: All endpoints documented
- **Links**: No broken internal/external links

### Required Tools
- **spectral**: OpenAPI linting and custom rules
- **openapi-diff**: Breaking change detection
- **prism**: Mock server for validation

## Testing Strategy

### Automated Testing
1. **Schema Tests**: Validate all examples against schemas
2. **Contract Tests**: Ensure API matches documentation
3. **Link Tests**: Check all documentation links work
4. **Example Tests**: Run all code examples successfully

### CI/CD Integration
```yaml
validate-docs:
  script:
    - spectral lint openapi.yaml
    - openapi-diff baseline.yaml current.yaml --fail-on-incompatible
    - markdown-link-check docs/**/*.md
```

## Quality Assurance

### Review Process
1. **Technical Review**: Accuracy and completeness
2. **Clarity Review**: High school reading level
3. **Example Review**: All examples work correctly
4. **Coverage Review**: No missing endpoints

### Success Metrics
- 100% schema validation pass rate
- Zero broken links
- All examples execute successfully
- No undocumented endpoints

## Related Resources

- **[Testing Examples](../../examples/testing/)** - Complete CI/CD setups and test scripts
- **[Tool Reference](../../reference/testing/)** - Detailed tool comparisons and configurations
- **[Troubleshooting](../../troubleshooting/testing/)** - Common issues and solutions

## Quick Start

1. Install spectral: `npm install -g @stoplight/spectral-cli`
2. Create `.spectral.yaml` with validation rules
3. Run validation: `spectral lint openapi.yaml`
4. Add to CI/CD pipeline for continuous validation