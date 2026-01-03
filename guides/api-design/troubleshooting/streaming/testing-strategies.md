# Testing Strategies for Streaming APIs

## Load Testing

### Testing High-Volume Streams
```bash
# Test NDJSON streaming with curl
curl -H "Accept: application/x-ndjson" \
     -H "Authorization: Bearer token" \
     "http://localhost:8080/v1/orders/stream" | \
     while read line; do
       echo "$(date): $line"
     done
```

### Concurrent Stream Testing
```bash
# Test multiple concurrent streams
for i in {1..10}; do
  curl -H "Accept: text/event-stream" \
       "http://localhost:8080/v1/orders/events" &
done
wait
```

### Load Testing Tools
- **Apache Bench**: Basic HTTP load testing
- **wrk**: Modern HTTP benchmarking tool
- **JMeter**: GUI-based load testing
- **Custom scripts**: Language-specific testing

## Network Simulation

### Testing Network Interruptions
```bash
# Simulate network delays
tc qdisc add dev eth0 root netem delay 100ms

# Simulate packet loss
tc qdisc add dev eth0 root netem loss 1%

# Simulate bandwidth limits
tc qdisc add dev eth0 root tbf rate 1mbit burst 32kbit latency 400ms
```

### Connection Stability Tests
1. **Intermittent connectivity**: Test with on/off network
2. **High latency**: Test with network delays
3. **Packet loss**: Test with dropped packets
4. **Bandwidth limits**: Test with slow connections

## Client Behavior Testing

### SSE Reconnection Testing
```bash
# Test SSE endpoint connectivity and reconnection behavior
curl -N -H "Accept: text/event-stream" \
     http://localhost:8080/v1/orders/events

# Expected initial response:
# HTTP/1.1 200 OK
# Content-Type: text/event-stream
# Cache-Control: no-cache
# Connection: keep-alive
#
# event: connected
# data: {"status": "ready"}
#
# event: order
# data: {"id": 1, "status": "created"}
```

```bash
# Test reconnection with Last-Event-ID header
# (simulates client reconnecting after disconnect)
curl -N -H "Accept: text/event-stream" \
     -H "Last-Event-ID: 42" \
     http://localhost:8080/v1/orders/events

# Expected response resumes from event 43:
# HTTP/1.1 200 OK
# Content-Type: text/event-stream
#
# id: 43
# event: order
# data: {"id": 43, "status": "updated"}
```

```bash
# Test retry directive from server
curl -N -H "Accept: text/event-stream" \
     http://localhost:8080/v1/orders/events

# Server should send retry interval:
# retry: 5000
# event: connected
# data: {"status": "ready"}
```

### Different Client Patterns
1. **Fast consumers**: Clients that process data quickly
2. **Slow consumers**: Clients with processing delays
3. **Disconnecting clients**: Clients that disconnect frequently
4. **Failing clients**: Clients that error during processing

## Resource Monitoring

### Memory Usage Testing
```bash
# Monitor memory usage during streaming
while true; do
  ps aux | grep java | grep -v grep
  sleep 5
done
```

### Connection Monitoring
```bash
# Monitor active connections
netstat -an | grep :8080 | grep ESTABLISHED | wc -l
```

### Performance Metrics
- **CPU usage**: Monitor CPU during streaming
- **Memory usage**: Track memory consumption
- **Network I/O**: Monitor network bandwidth
- **Database connections**: Track connection pool usage

## Automated Testing

### NDJSON Format Validation Tests
```bash
# Test NDJSON stream format compliance
curl -s -H "Accept: application/x-ndjson" \
     http://localhost:8080/v1/orders/stream | head -5

# Expected response - each line is valid JSON:
# {"id":1,"status":"created","timestamp":"2024-01-15T10:00:00Z"}
# {"id":2,"status":"processing","timestamp":"2024-01-15T10:00:01Z"}
# {"id":3,"status":"completed","timestamp":"2024-01-15T10:00:02Z"}
```

```bash
# Validate each line is parseable JSON
curl -s -H "Accept: application/x-ndjson" \
     http://localhost:8080/v1/orders/stream | \
     head -10 | while read line; do
       echo "$line" | jq . > /dev/null 2>&1 && \
         echo "PASS: Valid JSON" || \
         echo "FAIL: Invalid JSON - $line"
     done

# Expected output:
# PASS: Valid JSON
# PASS: Valid JSON
# PASS: Valid JSON
```

### End-to-End Streaming Tests
```bash
# Test complete NDJSON stream with timeout
timeout 10 curl -s -H "Accept: application/x-ndjson" \
     http://localhost:8080/v1/orders/stream > /tmp/stream_output.txt

# Verify response contains data
wc -l /tmp/stream_output.txt
# Expected: at least 1 line of output

# Validate response headers
curl -s -I -H "Accept: application/x-ndjson" \
     http://localhost:8080/v1/orders/stream

# Expected headers:
# HTTP/1.1 200 OK
# Content-Type: application/x-ndjson
# Transfer-Encoding: chunked
```

```bash
# Test SSE stream end-to-end
timeout 10 curl -N -H "Accept: text/event-stream" \
     http://localhost:8080/v1/orders/events 2>&1 | \
     grep -E "^(event:|data:|id:)" | head -10

# Expected output format:
# event: connected
# data: {"status":"ready"}
# id: 1
# event: order
# data: {"id":1,"status":"created"}
```

```bash
# Test stream with authentication
curl -s -H "Accept: application/x-ndjson" \
     -H "Authorization: Bearer <token>" \
     http://localhost:8080/v1/orders/stream | head -3

# Without valid token, expect:
# HTTP/1.1 401 Unauthorized
# Content-Type: application/problem+json
#
# {"type":"about:blank","title":"Unauthorized","status":401}
```

## Performance Benchmarking

### Baseline Measurements
1. **Single stream throughput**: Records per second
2. **Multiple stream capacity**: Maximum concurrent streams
3. **Memory efficiency**: Memory per stream
4. **Response time**: Time to first byte

### Benchmark Tools
```bash
# Benchmark NDJSON streaming
wrk -t12 -c400 -d30s \
    -H "Accept: application/x-ndjson" \
    http://localhost:8080/v1/orders/stream

# Benchmark SSE streaming
wrk -t12 -c400 -d30s \
    -H "Accept: text/event-stream" \
    http://localhost:8080/v1/orders/events
```

### Performance Targets
- **Throughput**: > 1000 records/second per stream
- **Latency**: < 100ms time to first byte
- **Concurrency**: > 100 concurrent streams
- **Memory**: < 10MB per active stream