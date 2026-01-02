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

### Browser Testing
```javascript
// Test EventSource reconnection
const eventSource = new EventSource('/v1/orders/events');
let reconnectCount = 0;

eventSource.addEventListener('error', function(event) {
  if (eventSource.readyState === EventSource.CLOSED) {
    reconnectCount++;
    console.log(`Reconnection attempt ${reconnectCount}`);
    
    setTimeout(() => {
      // Reconnect logic
    }, 5000);
  }
});
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

### Unit Tests
```javascript
// Test streaming response parsing
test('should parse NDJSON stream', () => {
  const stream = '{"id":1}\n{"id":2}\n{"id":3}\n';
  const lines = stream.split('\n').filter(line => line.trim());
  const objects = lines.map(line => JSON.parse(line));
  
  expect(objects).toHaveLength(3);
  expect(objects[0].id).toBe(1);
});
```

### Integration Tests
```javascript
// Test end-to-end streaming
test('should stream orders', async () => {
  const response = await fetch('/v1/orders/stream', {
    headers: { 'Accept': 'application/x-ndjson' }
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
  }
  
  const lines = result.split('\n').filter(line => line.trim());
  expect(lines.length).toBeGreaterThan(0);
});
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