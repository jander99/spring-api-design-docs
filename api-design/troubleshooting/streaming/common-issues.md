# Common Streaming API Issues and Solutions

> **Reading Level:** Grade 14 | **Audience:** Developers debugging streaming API problems

This guide helps you fix common streaming API problems. Each section shows symptoms, causes, and solutions with code examples.

---

## Quick Diagnosis

| Symptom | Likely Issue | Go To |
|---------|--------------|-------|
| Connection drops after 30-60 seconds | Proxy/load balancer timeout | [SSE Connection Drops](#sse-connection-drops) |
| WebSocket fails immediately | Handshake failure | [WebSocket Handshake Failures](#websocket-handshake-failures) |
| Garbled or incomplete JSON | NDJSON parsing error | [NDJSON Parsing Errors](#ndjson-parsing-errors) |
| Client falls behind, data piles up | Backpressure issue | [Backpressure Problems](#backpressure-and-flow-control-issues) |
| Server memory grows over time | Memory leak | [Memory Leaks](#memory-leaks-from-unclosed-connections) |
| Events arrive out of order | Missing flow control | [Backpressure Problems](#backpressure-and-flow-control-issues) |

---

## SSE Connection Drops

### Symptoms

- Connection closes after 30-60 seconds of no activity
- Clients get incomplete data
- Errors say "connection reset" or "timeout"
- Works locally but fails in production
- Drops happen during quiet periods

### Root Causes

1. **Proxy or load balancer timeout**
   - Most proxies close idle connections after 30-60 seconds
   - No data flowing triggers the timeout

2. **Missing keep-alive signals**
   - Server not sending heartbeat messages
   - Long gaps between events

3. **Client-side timeout**
   - Browser or HTTP client times out too fast
   - EventSource defaults may be too short

4. **Network issues**
   - Firewalls closing idle connections
   - NAT tables expiring
   - Cloud provider limits

### Solutions

#### Solution 1: Implement Server-Side Heartbeats

Send periodic heartbeat comments to keep the connection alive:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

: heartbeat

data: {"type": "message", "content": "Hello"}

: heartbeat

data: {"type": "message", "content": "World"}

: heartbeat
```

**Tip:** Send heartbeats every 15-20 seconds. Comment lines (starting with `:`) keep the connection alive but clients ignore them.

#### Solution 2: Configure Proxy Timeouts

Increase timeout settings in your infrastructure:

```nginx
# Nginx configuration
location /api/stream {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_read_timeout 3600s;  # 1 hour
    proxy_send_timeout 3600s;
}
```

```yaml
# AWS ALB target group settings
{
  "TargetGroupAttributes": [
    {
      "Key": "deregistration_delay.timeout_seconds",
      "Value": "3600"
    }
  ]
}
```

#### Solution 3: Disable Response Buffering

Ensure intermediaries don't buffer the stream:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache, no-store, must-revalidate
X-Accel-Buffering: no
Connection: keep-alive
```

#### Solution 4: Client-Side Reconnection

Implement automatic reconnection in your client:

```javascript
// Browser EventSource with reconnection
const eventSource = new EventSource('/api/events');

eventSource.onopen = () => {
  console.log('Connection established');
};

eventSource.onerror = (event) => {
  if (eventSource.readyState === EventSource.CLOSED) {
    console.log('Connection closed, reconnecting in 3 seconds');
    setTimeout(() => {
      // Create new EventSource instance
      reconnect();
    }, 3000);
  }
};
```

### Prevention

- Always implement heartbeats in SSE endpoints
- Document timeout requirements for infrastructure teams
- Test with realistic production conditions
- Monitor connection duration metrics
- Set up alerts for abnormal disconnection rates

---

## WebSocket Handshake Failures

### Symptoms

- HTTP 400 or 426 errors when connecting
- "WebSocket connection failed" in browser console
- Works over HTTP but not HTTPS
- Works locally but fails through proxy
- Random connection failures

### Root Causes

1. **Missing Upgrade headers**
   - Proxy stripping required headers
   - Server not seeing upgrade request

2. **Protocol mismatch**
   - Client using wrong WebSocket version
   - Server expects different subprotocol

3. **TLS/SSL issues**
   - Certificate problems with wss://
   - Mixed content blocking

4. **CORS or origin problems**
   - Server rejecting cross-origin requests
   - Origin header doesn't match

5. **Proxy doesn't support WebSocket**
   - Old HTTP/1.0 proxy in the path
   - Load balancer not set up for WebSocket

### Solutions

#### Solution 1: Verify Required Headers

Check that all required headers are present:

```http
# Client request (must include all these headers)
GET /ws/notifications HTTP/1.1
Host: api.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: https://app.example.com

# Server response (successful handshake)
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

#### Solution 2: Configure Proxy for WebSocket

Enable WebSocket support in your proxy:

```nginx
# Nginx WebSocket configuration
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 3600s;
}
```

```yaml
# HAProxy configuration
frontend https_front
    bind *:443 ssl crt /path/to/cert.pem
    acl is_websocket hdr(Upgrade) -i websocket
    use_backend websocket_backend if is_websocket
    default_backend http_backend

backend websocket_backend
    server ws1 127.0.0.1:8080
    timeout tunnel 3600s
```

#### Solution 3: Fix Origin Validation

Ensure server accepts legitimate origins:

```http
# Server should validate Origin header
# Allow specific origins or patterns

# Request
Origin: https://app.example.com

# Server validates against allowed list:
# - https://app.example.com
# - https://*.example.com
```

If origin is rejected, you'll see:

```
WebSocket connection to 'wss://api.example.com/ws' failed: 
Error during WebSocket handshake: Unexpected response code: 403
```

#### Solution 4: Debug Connection Issues

Use curl to test the handshake manually:

```bash
# Test WebSocket handshake
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
  -H "Sec-WebSocket-Version: 13" \
  https://api.example.com/ws/notifications

# Expected: HTTP/1.1 101 Switching Protocols
```

#### Solution 5: Handle Subprotocol Negotiation

If using subprotocols, ensure client and server agree:

```http
# Client requests specific subprotocol
Sec-WebSocket-Protocol: v1.notifications, v2.notifications

# Server must respond with one it supports
Sec-WebSocket-Protocol: v2.notifications
```

### Prevention

- Test WebSocket connections through all environments
- Document proxy requirements for operations teams
- Implement connection health checks
- Use wss:// in production (not ws://)
- Log handshake failures with full headers for debugging

---

## NDJSON Parsing Errors

### Symptoms

- JSON.parse() throws SyntaxError
- Incomplete objects at line breaks
- Special characters break parsing
- Data looks corrupted or cut off
- Works with small data but fails with large

### Root Causes

1. **Incomplete line buffering**
   - Client reads partial lines
   - Network splits JSON objects mid-line

2. **Wrong newline handling**
   - Not splitting on `\n` correctly
   - Mixed line endings (`\r\n` vs `\n`)

3. **Encoding issues**
   - UTF-8 characters split across chunks
   - Wrong encoding assumed

4. **Concurrent writes corrupt data**
   - Multiple threads write to same stream
   - Race conditions in buffer

5. **Buffer too small**
   - Large objects exceed buffer size
   - Memory limits cause data loss

### Solutions

#### Solution 1: Implement Proper Line Buffering

Buffer data until complete lines are received:

```javascript
// Proper NDJSON parser
class NDJSONParser {
  constructor() {
    this.buffer = '';
  }

  parse(chunk) {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    
    // Keep incomplete line in buffer
    this.buffer = lines.pop();
    
    const results = [];
    for (const line of lines) {
      if (line.trim()) {
        try {
          results.push(JSON.parse(line));
        } catch (e) {
          console.error('Invalid JSON line:', line);
        }
      }
    }
    return results;
  }
}
```

#### Solution 2: Handle Both Line Endings

Account for different line ending formats:

```javascript
// Handle \r\n and \n line endings
function parseNDJSON(chunk) {
  // Normalize line endings
  const normalized = chunk.replace(/\r\n/g, '\n');
  return normalized.split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}
```

#### Solution 3: Validate JSON Before Sending

Server-side validation prevents corrupt data:

```
# Server-side validation pseudocode
FUNCTION send_ndjson_event(data):
    json_string = JSON.stringify(data)
    
    # Verify it can be parsed back
    TRY:
        JSON.parse(json_string)
    CATCH error:
        LOG "Invalid JSON generated: " + error
        RETURN error
    
    # Ensure no embedded newlines
    IF json_string CONTAINS '\n':
        LOG "Warning: JSON contains newline, escaping"
        json_string = json_string.replace('\n', '\\n')
    
    WRITE json_string + '\n'
```

#### Solution 4: Handle Encoding Properly

Ensure consistent UTF-8 handling:

```http
# Always specify encoding in Content-Type
Content-Type: application/x-ndjson; charset=utf-8
```

```javascript
// Client: Use TextDecoder for proper encoding
const decoder = new TextDecoder('utf-8');

fetch('/api/stream')
  .then(response => {
    const reader = response.body.getReader();
    
    function read() {
      return reader.read().then(({ done, value }) => {
        if (done) return;
        
        // Properly decode UTF-8 bytes
        const text = decoder.decode(value, { stream: true });
        processChunk(text);
        return read();
      });
    }
    
    return read();
  });
```

#### Solution 5: Debug Parsing Issues

Log raw data to identify corruption:

```javascript
// Debug mode for NDJSON parsing
function debugParse(rawData) {
  console.log('Raw bytes:', Array.from(rawData).map(b => b.toString(16)));
  console.log('As string:', rawData);
  console.log('Length:', rawData.length);
  
  const lines = rawData.split('\n');
  lines.forEach((line, i) => {
    console.log(`Line ${i}: "${line}" (${line.length} chars)`);
    try {
      JSON.parse(line);
      console.log(`  -> Valid JSON`);
    } catch (e) {
      console.log(`  -> Invalid: ${e.message}`);
      // Show problematic characters
      console.log(`  -> Chars: ${Array.from(line).map(c => c.charCodeAt(0))}`);
    }
  });
}
```

### Prevention

- Always use a proper NDJSON parsing library
- Test with large payloads and special characters
- Validate JSON server-side before sending
- Include Content-Type with charset
- Log parsing errors with raw data for debugging

---

## Backpressure and Flow Control Issues

### Symptoms

- Events arrive out of order
- Memory grows on server or client
- Events drop without warning
- System slows under load
- Network buffers fill up

### Root Causes

1. **Fast producer, slow consumer**
   - Server sends faster than client can process
   - Client processing is CPU-bound

2. **No flow control**
   - Server pushes without checking client
   - No acknowledgment system

3. **Buffer overflow**
   - Fixed-size buffers fill up
   - No overflow strategy set

4. **Network congestion**
   - TCP window fills up
   - No app-level flow control

### Solutions

#### Solution 1: Implement Server-Side Buffering with Limits

Use bounded buffers with clear overflow strategy:

```
# Server-side bounded buffer pseudocode
CLASS StreamBuffer:
    max_size = 1000
    overflow_strategy = "drop_oldest"  # or "drop_newest", "block"
    
    FUNCTION add(event):
        IF buffer.size >= max_size:
            IF overflow_strategy == "drop_oldest":
                buffer.remove_first()
                metrics.increment("events_dropped")
            ELSE IF overflow_strategy == "drop_newest":
                metrics.increment("events_dropped")
                RETURN  # Don't add new event
            ELSE IF overflow_strategy == "block":
                WAIT UNTIL buffer.size < max_size
        
        buffer.add(event)
```

#### Solution 2: Client-Side Acknowledgments

Implement acknowledgment for critical events:

```http
# SSE with acknowledgment pattern
data: {"id": "evt_123", "type": "order", "data": {...}}

# Client sends acknowledgment via separate endpoint
POST /api/events/ack
Content-Type: application/json

{"event_id": "evt_123", "client_id": "client_456"}
```

```
# Server tracks unacknowledged events
FUNCTION send_event(client, event):
    pending_acks[event.id] = {
        "event": event,
        "sent_at": NOW(),
        "client": client
    }
    
    client.send(event)
    
    # Resend if not acknowledged within timeout
    SCHEDULE resend_check(event.id) IN 30 seconds

FUNCTION resend_check(event_id):
    IF event_id IN pending_acks:
        ack = pending_acks[event_id]
        IF NOW() - ack.sent_at > 30 seconds:
            # Resend or handle as failed
            LOG "Event not acknowledged: " + event_id
```

#### Solution 3: Implement Rate Limiting Per Client

Prevent fast clients from overwhelming slow ones:

```
# Per-client rate limiting pseudocode
CLASS ClientRateLimiter:
    events_per_second = 100
    
    FUNCTION should_send(client_id):
        current_rate = get_rate(client_id)
        IF current_rate > events_per_second:
            RETURN false
        increment_rate(client_id)
        RETURN true
    
    FUNCTION send_event(client, event):
        IF should_send(client.id):
            client.send(event)
        ELSE:
            queue_for_later(client.id, event)
```

#### Solution 4: Use Reactive Streams Backpressure

For WebSocket, implement request-based flow control:

```
# Flow control protocol
# Client sends how many events it can handle
--> {"type": "subscribe", "topic": "orders", "demand": 10}

# Server sends up to that many events
<-- {"type": "event", "data": {...}}
<-- {"type": "event", "data": {...}}
... (8 more events)

# Client requests more when ready
--> {"type": "demand", "count": 10}

# Server sends next batch
<-- {"type": "event", "data": {...}}
```

#### Solution 5: Monitor Buffer Levels

Track buffer utilization to detect problems early:

```
# Metrics to track
METRICS:
  - stream.buffer.size (gauge)
  - stream.buffer.capacity (gauge)
  - stream.events.dropped (counter)
  - stream.events.queued (counter)
  - stream.client.lag (histogram)

# Alert when buffer > 80% full
ALERT IF stream.buffer.size / stream.buffer.capacity > 0.8
```

### Prevention

- Design for backpressure from the start
- Set reasonable buffer limits
- Implement client acknowledgments for critical data
- Monitor buffer levels and drop rates
- Test with slow clients and fast producers

---

## Memory Leaks from Unclosed Connections

### Symptoms

- Server memory grows over time
- Out of memory errors after hours or days
- Performance gets worse slowly
- Connection count keeps rising
- Garbage collection takes longer

### Root Causes

1. **Connections not closed on disconnect**
   - Server doesn't detect client is gone
   - No cleanup handler set up

2. **Event listeners not removed**
   - Handlers pile up for each connection
   - Global listeners keep references

3. **Data not cleared**
   - Per-connection maps not cleaned up
   - Caches grow without limit

4. **Circular references**
   - Objects reference each other
   - Garbage collector can't free them

5. **Large objects in connection context**
   - Storing extra data per connection
   - Not releasing buffers

### Solutions

#### Solution 1: Implement Proper Connection Cleanup

Register cleanup handlers for all disconnection scenarios:

```
# Server-side cleanup pseudocode
CLASS ConnectionManager:
    active_connections = {}
    
    FUNCTION on_connect(client):
        connection = {
            "id": generate_id(),
            "client": client,
            "created_at": NOW(),
            "handlers": [],
            "buffers": []
        }
        active_connections[connection.id] = connection
        
        # Register cleanup for all disconnect scenarios
        client.on_close(LAMBDA: cleanup(connection.id))
        client.on_error(LAMBDA: cleanup(connection.id))
        client.on_timeout(LAMBDA: cleanup(connection.id))
        
        RETURN connection
    
    FUNCTION cleanup(connection_id):
        IF connection_id NOT IN active_connections:
            RETURN  # Already cleaned up
        
        connection = active_connections[connection_id]
        
        # Remove all event handlers
        FOR handler IN connection.handlers:
            remove_handler(handler)
        
        # Clear all buffers
        FOR buffer IN connection.buffers:
            buffer.clear()
        
        # Close client connection
        connection.client.close()
        
        # Remove from tracking
        DELETE active_connections[connection_id]
        
        LOG "Cleaned up connection: " + connection_id
```

#### Solution 2: Implement Connection Heartbeat and Timeout

Detect dead connections proactively:

```
# Connection health check pseudocode
FUNCTION start_health_checker():
    EVERY 30 seconds:
        FOR connection IN active_connections:
            IF NOW() - connection.last_activity > 60 seconds:
                # Try to send ping
                TRY:
                    connection.client.send({"type": "ping"})
                    connection.ping_sent_at = NOW()
                CATCH error:
                    # Connection is dead
                    cleanup(connection.id)
            
            # Check for ping timeout
            IF connection.ping_sent_at IS NOT NULL:
                IF NOW() - connection.ping_sent_at > 10 seconds:
                    # No pong received, connection is dead
                    cleanup(connection.id)
```

#### Solution 3: Use Weak References Where Appropriate

Avoid holding strong references to large objects:

```
# Use weak references for caches
CLASS ConnectionCache:
    # Weak map allows garbage collection when key is gone
    cache = WeakMap()
    
    FUNCTION store(connection, data):
        cache.set(connection, data)
    
    FUNCTION retrieve(connection):
        RETURN cache.get(connection)
    
    # When connection is garbage collected,
    # associated data is automatically freed
```

#### Solution 4: Monitor Connection Metrics

Track connection lifecycle to detect leaks:

```
# Key metrics to track
METRICS:
  - connections.active (gauge)
  - connections.total_created (counter)
  - connections.total_closed (counter)
  - connections.duration (histogram)
  - memory.heap_used (gauge)
  - memory.heap_total (gauge)

# Leak detection
# If active connections keep growing while requests are stable,
# you have a leak

ALERT IF:
  connections.active > 10000 AND
  rate(connections.total_created) == rate(connections.total_closed)
```

#### Solution 5: Implement Connection Limits

Protect against unbounded connection growth:

```
# Connection limit pseudocode
CLASS ConnectionLimiter:
    max_connections = 10000
    max_per_client = 100
    
    FUNCTION allow_connection(client_ip):
        IF active_connections.count >= max_connections:
            RETURN false, "Server at capacity"
        
        client_count = count_connections_by_ip(client_ip)
        IF client_count >= max_per_client:
            RETURN false, "Too many connections from this IP"
        
        RETURN true, NULL
    
    FUNCTION on_limit_reached():
        # Close oldest connections to make room
        oldest = get_oldest_connections(count=100)
        FOR connection IN oldest:
            connection.send({"type": "reconnect_required"})
            cleanup(connection.id)
```

#### Solution 6: Regular Memory Profiling

Schedule periodic memory analysis:

```bash
# Take heap snapshot periodically (Node.js example)
# Compare snapshots to find growing objects

# Manual heap dump trigger endpoint
GET /debug/heapdump
# Returns: heapdump file for analysis

# Memory trend monitoring
GET /debug/memory
{
  "heap_used_mb": 256,
  "heap_total_mb": 512,
  "external_mb": 32,
  "connections": 1523,
  "uptime_hours": 48
}
```

### Prevention

- Always register cleanup handlers at connection time
- Implement heartbeat/ping-pong for connection health
- Set maximum connection limits
- Use weak references for caches
- Profile memory regularly in production
- Set up alerts for memory growth patterns
- Restart services periodically if leaks are suspected

---

## Debugging Tips

### General Debugging Approach

1. **Reproduce the issue** - Create a minimal test case
2. **Gather data** - Logs, metrics, network traces
3. **Isolate the layer** - Client, network, or server?
4. **Test components separately** - Use curl, wscat, or simple clients
5. **Check infrastructure** - Proxies, load balancers, firewalls

### Useful Commands

```bash
# Test SSE endpoint
curl -N -H "Accept: text/event-stream" https://api.example.com/events

# Test WebSocket with wscat
wscat -c wss://api.example.com/ws

# Monitor TCP connections
netstat -an | grep ESTABLISHED | wc -l

# Watch memory usage
watch -n 1 'ps aux | grep your-server'

# Network packet capture
tcpdump -i any port 443 -w capture.pcap
```

### Log Checklist

When debugging, ensure you have logs for:

- [ ] Connection established (with client ID)
- [ ] Connection closed (with reason)
- [ ] Errors during connection lifecycle
- [ ] Events sent (with count and timing)
- [ ] Backpressure events (buffer full, events dropped)
- [ ] Heartbeats sent and received
- [ ] Authentication/authorization failures

---

## Related Resources

- [Reconnection Strategies](reconnection-strategies.md)
- [Streaming Testing Strategies](testing-strategies.md)
- [HTTP Streaming Patterns](../../advanced-patterns/http-streaming-patterns.md)
- [Performance Issues](../performance-issues.md)
- [Flow Control Reference](../../reference/streaming/flow-control.md)
