# Common Documentation Testing Issues

## Schema Validation Problems

### Issue: Examples don't match schema
**Symptoms**: Spectral reports schema validation errors
**Solution**: 
```bash
# Find mismatched examples
spectral lint openapi.yaml --format json | jq '.[] | select(.code == "invalid-example")'
```

### Issue: Circular references in schemas
**Symptoms**: Validation tools hang or crash
**Solution**: Use `allOf` instead of circular `$ref`

### Issue: Missing required properties
**Symptoms**: OpenAPI validation fails
**Solution**: Add all required properties to schema definitions

## CI/CD Pipeline Issues

### Issue: Tests fail intermittently
**Symptoms**: Random test failures in CI/CD
**Solution**: Add retry logic and timeouts
```yaml
retry:
  max: 3
  when:
    - unknown_failure
    - api_failure
```

### Issue: Mock server port conflicts
**Symptoms**: "Port already in use" errors
**Solution**: Use dynamic port allocation
```bash
PORT=$(python -c 'import socket; s=socket.socket(); s.bind(("", 0)); print(s.getsockname()[1]); s.close()')
prism mock openapi.yaml --port $PORT
```

## Tool-Specific Issues

### Spectral Issues
- **Custom rules not loading**: Check `.spectral.yaml` syntax
- **Performance issues**: Use `--skip-rule` for expensive rules
- **Memory errors**: Increase Node.js memory with `--max-old-space-size`

### Prism Issues
- **Mock responses incorrect**: Verify OpenAPI examples are valid
- **CORS errors**: Add `--cors` flag when testing web apps
- **SSL issues**: Use `--insecure` for self-signed certificates

### Contract Testing Issues
- **Pact verification fails**: Check provider state setup
- **Consumer tests flaky**: Use appropriate matchers (like, term)
- **Version compatibility**: Ensure Pact versions match across services

## Performance Problems

### Issue: Validation takes too long
**Solutions**:
- Use `--skip-rule` for non-critical rules
- Split large OpenAPI specs into smaller files
- Run validation in parallel for multiple files

### Issue: CI/CD pipeline timeout
**Solutions**:
- Increase timeout values
- Cache validation results
- Use faster validation tools for quick checks

## Quick Fixes

### Reset validation cache
```bash
rm -rf ~/.spectral
spectral lint openapi.yaml
```

### Debug failing examples
```bash
# Extract and test specific examples
yq '.paths.*.*.examples' openapi.yaml > examples.yaml
curl -X POST -d @examples.yaml $API_URL/test
```

### Check OpenAPI spec validity
```bash
swagger-parser validate openapi.yaml
```