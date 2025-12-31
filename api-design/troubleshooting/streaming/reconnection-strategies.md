# Streaming Reconnection Strategies

> **Reading Level:** Grade 12 | **Audience:** Developers implementing reliable streaming connections

This guide covers strategies for handling disconnections and implementing reliable reconnection in streaming APIs. A robust reconnection strategy is essential for production streaming applications.

---

## Quick Reference

| Scenario | Strategy | Resume Method |
|----------|----------|---------------|
| Brief network glitch | Immediate retry | Last Event ID |
| Server restart | Exponential backoff | Last Event ID + replay |
| Client went offline | Reconnect on online | Fetch missed events |
| Authentication expired | Re-authenticate first | New connection |
| Server overloaded | Long backoff + jitter | Queue locally |

---

## Detecting Disconnection

### Symptoms of Disconnection

Different streaming protocols show disconnection differently:

**SSE (Server-Sent Events):**
- `EventSource.readyState` changes to `CLOSED` (2)
- `onerror` event fires
- No more events received

**WebSocket:**
- `onclose` event fires with close code
- `onerror` event may fire first
- `readyState` changes to `CLOSED` (3)

**NDJSON/Fetch Streams:**
- ReadableStream reader returns `done: true`
- Fetch promise rejects with network error
- Response body stream closes unexpectedly

### Root Causes of Disconnection

Understanding why disconnection happened helps choose the right strategy:

| Cause | Detection Method | Typical Response |
|-------|------------------|------------------|
| Network timeout | No data for extended period | Reconnect immediately |
| Server closed | Clean close event/code | Check if intentional |
| Network change | Online/offline events | Wait for online, reconnect |
| Authentication expired | 401 status or auth error | Re-authenticate first |
| Server overload | 503 status or rate limit | Back off significantly |
| Client error | 400 status codes | Fix request, then retry |

### Solutions for Detecting Disconnection

#### Solution 1: SSE Disconnection Detection

```javascript
// SSE connection with disconnection detection
class SSEConnection {
  constructor(url) {
    this.url = url;
    this.lastEventId = null;
    this.isConnected = false;
  }

  connect() {
    // Include last event ID for resumption
    const url = this.lastEventId 
      ? `${this.url}?lastEventId=${this.lastEventId}`
      : this.url;
    
    this.eventSource = new EventSource(url);
    
    this.eventSource.onopen = () => {
      console.log('Connected');
      this.isConnected = true;
    };
    
    this.eventSource.onmessage = (event) => {
      // Track last event ID for resumption
      if (event.lastEventId) {
        this.lastEventId = event.lastEventId;
      }
      this.handleEvent(event);
    };
    
    this.eventSource.onerror = (error) => {
      this.isConnected = false;
      
      if (this.eventSource.readyState === EventSource.CLOSED) {
        console.log('Connection closed');
        this.handleDisconnection('closed');
      } else if (this.eventSource.readyState === EventSource.CONNECTING) {
        console.log('Connection lost, browser reconnecting...');
        // Browser handles reconnection automatically
      }
    };
  }
}
```

#### Solution 2: WebSocket Disconnection Detection

```javascript
// WebSocket connection with close code analysis
class WebSocketConnection {
  constructor(url) {
    this.url = url;
    this.isConnected = false;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('Connected');
      this.isConnected = true;
      this.startHeartbeat();
    };
    
    this.ws.onclose = (event) => {
      this.isConnected = false;
      this.stopHeartbeat();
      
      // Analyze close code to determine action
      const action = this.analyzeCloseCode(event.code);
      console.log(`Disconnected: ${event.code} ${event.reason}`);
      
      this.handleDisconnection(action, event);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      // onerror is usually followed by onclose
    };
  }
  
  analyzeCloseCode(code) {
    // Standard WebSocket close codes
    const actions = {
      1000: 'normal',      // Normal closure - may not need reconnect
      1001: 'reconnect',   // Going away - reconnect
      1002: 'error',       // Protocol error - fix and retry
      1003: 'error',       // Unsupported data - fix and retry
      1006: 'reconnect',   // Abnormal closure - reconnect
      1007: 'error',       // Invalid data - fix and retry
      1008: 'error',       // Policy violation - check permissions
      1009: 'error',       // Message too big - reduce size
      1010: 'error',       // Extension required - negotiate
      1011: 'reconnect',   // Server error - reconnect with backoff
      1012: 'reconnect',   // Service restart - reconnect
      1013: 'backoff',     // Try again later - long backoff
      1014: 'error',       // Bad gateway - check infrastructure
      1015: 'error'        // TLS handshake fail - check certs
    };
    
    return actions[code] || 'reconnect';
  }
}
```

#### Solution 3: Heartbeat-Based Detection

Detect silent failures with application-level heartbeats:

```javascript
// Heartbeat monitoring for any connection type
class HeartbeatMonitor {
  constructor(options = {}) {
    this.pingInterval = options.pingInterval || 30000;  // 30 seconds
    this.pongTimeout = options.pongTimeout || 10000;    // 10 seconds
    this.onTimeout = options.onTimeout || (() => {});
  }

  start(connection) {
    this.connection = connection;
    
    // Send ping periodically
    this.pingTimer = setInterval(() => {
      this.sendPing();
    }, this.pingInterval);
  }
  
  sendPing() {
    const pingId = Date.now().toString();
    
    // Set timeout for pong response
    this.pongTimer = setTimeout(() => {
      console.log('Pong timeout - connection may be dead');
      this.onTimeout();
    }, this.pongTimeout);
    
    // Send ping
    this.connection.send(JSON.stringify({
      type: 'ping',
      id: pingId,
      timestamp: Date.now()
    }));
  }
  
  receivePong(pongId) {
    // Clear timeout when pong received
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
    
    // Calculate latency
    const latency = Date.now() - parseInt(pongId);
    console.log(`Pong received, latency: ${latency}ms`);
  }
  
  stop() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.pongTimer) clearTimeout(this.pongTimer);
  }
}
```

---

## Exponential Backoff for Reconnect

### Why Exponential Backoff?

Reconnecting immediately and repeatedly can:
- Overwhelm a recovering server
- Waste client resources
- Create a "thundering herd" when many clients reconnect
- Get your client rate-limited or blocked

### Root Causes of Reconnection Failures

1. **Server still down** - Need to wait longer
2. **Network still unstable** - Need to wait for stability
3. **Too many clients reconnecting** - Server overloaded
4. **Rate limiting active** - Need to respect limits

### Solutions for Exponential Backoff

#### Solution 1: Basic Exponential Backoff

```javascript
// Simple exponential backoff implementation
class ExponentialBackoff {
  constructor(options = {}) {
    this.baseDelay = options.baseDelay || 1000;     // 1 second
    this.maxDelay = options.maxDelay || 60000;      // 60 seconds
    this.multiplier = options.multiplier || 2;
    this.attempt = 0;
  }

  nextDelay() {
    // Calculate delay: baseDelay * multiplier^attempt
    const delay = Math.min(
      this.baseDelay * Math.pow(this.multiplier, this.attempt),
      this.maxDelay
    );
    
    this.attempt++;
    return delay;
  }
  
  reset() {
    this.attempt = 0;
  }
}

// Usage
const backoff = new ExponentialBackoff();

function reconnect() {
  const delay = backoff.nextDelay();
  console.log(`Reconnecting in ${delay}ms (attempt ${backoff.attempt})`);
  
  setTimeout(() => {
    connect()
      .then(() => backoff.reset())  // Reset on success
      .catch(() => reconnect());     // Try again on failure
  }, delay);
}
```

**Backoff progression:**
```
Attempt 1: 1 second
Attempt 2: 2 seconds
Attempt 3: 4 seconds
Attempt 4: 8 seconds
Attempt 5: 16 seconds
Attempt 6: 32 seconds
Attempt 7+: 60 seconds (capped)
```

#### Solution 2: Exponential Backoff with Jitter

Add randomness to prevent synchronized reconnection storms:

```javascript
// Exponential backoff with jitter
class JitteredBackoff {
  constructor(options = {}) {
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 60000;
    this.multiplier = options.multiplier || 2;
    this.jitterFactor = options.jitterFactor || 0.5;  // +/- 50%
    this.attempt = 0;
  }

  nextDelay() {
    // Calculate base exponential delay
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(this.multiplier, this.attempt),
      this.maxDelay
    );
    
    // Add jitter: random value between -jitter and +jitter
    const jitterRange = exponentialDelay * this.jitterFactor;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    
    const finalDelay = Math.max(0, exponentialDelay + jitter);
    
    this.attempt++;
    return Math.round(finalDelay);
  }
  
  reset() {
    this.attempt = 0;
  }
}
```

**Jittered progression example:**
```
Attempt 1: 500ms  - 1500ms  (1s ± 50%)
Attempt 2: 1000ms - 3000ms  (2s ± 50%)
Attempt 3: 2000ms - 6000ms  (4s ± 50%)
Attempt 4: 4000ms - 12000ms (8s ± 50%)
```

#### Solution 3: Decorrelated Jitter (Recommended)

More aggressive spread for better load distribution:

```javascript
// Decorrelated jitter - recommended approach
class DecorrelatedBackoff {
  constructor(options = {}) {
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 60000;
    this.lastDelay = this.baseDelay;
  }

  nextDelay() {
    // Delay is random between base and 3x last delay
    const delay = Math.min(
      this.maxDelay,
      this.randomBetween(this.baseDelay, this.lastDelay * 3)
    );
    
    this.lastDelay = delay;
    return Math.round(delay);
  }
  
  randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }
  
  reset() {
    this.lastDelay = this.baseDelay;
  }
}
```

#### Solution 4: Respect Retry-After Headers

Honor server-provided retry timing:

```javascript
// Backoff that respects Retry-After header
class ServerAwareBackoff {
  constructor(options = {}) {
    this.backoff = new JitteredBackoff(options);
  }

  getDelay(response) {
    // Check for Retry-After header
    const retryAfter = response?.headers?.get('Retry-After');
    
    if (retryAfter) {
      // Retry-After can be seconds or HTTP date
      const seconds = parseInt(retryAfter);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
      
      // Parse as HTTP date
      const date = new Date(retryAfter);
      if (!isNaN(date)) {
        return Math.max(0, date - Date.now());
      }
    }
    
    // Fall back to exponential backoff
    return this.backoff.nextDelay();
  }
  
  reset() {
    this.backoff.reset();
  }
}
```

---

## Resuming from Last Event ID

### How Event IDs Enable Resumption

SSE has built-in support for resumption using event IDs:

```http
# Server sends events with IDs
id: evt_001
data: {"type": "order", "id": 123}

id: evt_002
data: {"type": "order", "id": 124}

id: evt_003
data: {"type": "order", "id": 125}
```

When client reconnects:

```http
# Client sends Last-Event-ID header
GET /api/events HTTP/1.1
Last-Event-ID: evt_002

# Server resumes from evt_003
id: evt_003
data: {"type": "order", "id": 125}

id: evt_004
data: {"type": "order", "id": 126}
```

### Root Causes of Resume Failures

1. **Event ID not stored** - Server doesn't track event history
2. **Event expired** - Too much time passed since event
3. **Buffer overflow** - Server discarded old events
4. **Wrong event format** - ID not properly formatted

### Solutions for Event ID Resumption

#### Solution 1: Client-Side Event ID Tracking

```javascript
// SSE client with automatic resumption
class ResumableSSEClient {
  constructor(url, options = {}) {
    this.baseUrl = url;
    this.lastEventId = options.lastEventId || null;
    this.onEvent = options.onEvent || (() => {});
    this.onReconnect = options.onReconnect || (() => {});
    
    // Persist last event ID to survive page refresh
    this.storageKey = `sse_last_event_${url}`;
    this.loadLastEventId();
  }

  connect() {
    // Build URL with last event ID if available
    let url = this.baseUrl;
    if (this.lastEventId) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}lastEventId=${encodeURIComponent(this.lastEventId)}`;
    }
    
    this.eventSource = new EventSource(url);
    
    this.eventSource.onmessage = (event) => {
      // Update last event ID
      if (event.lastEventId) {
        this.lastEventId = event.lastEventId;
        this.saveLastEventId();
      }
      
      this.onEvent(JSON.parse(event.data), event.lastEventId);
    };
    
    this.eventSource.onerror = () => {
      if (this.eventSource.readyState === EventSource.CLOSED) {
        this.onReconnect(this.lastEventId);
        // Browser auto-reconnects with Last-Event-ID header
      }
    };
  }
  
  loadLastEventId() {
    try {
      this.lastEventId = localStorage.getItem(this.storageKey);
    } catch (e) {
      // localStorage not available
    }
  }
  
  saveLastEventId() {
    try {
      localStorage.setItem(this.storageKey, this.lastEventId);
    } catch (e) {
      // localStorage not available
    }
  }
}
```

#### Solution 2: Server-Side Event Buffer

```
# Server pseudocode for event buffering
CLASS EventBuffer:
    max_events = 1000
    max_age_seconds = 3600  # 1 hour
    events = []
    
    FUNCTION add_event(event):
        event.id = generate_sequential_id()
        event.timestamp = NOW()
        events.append(event)
        
        # Remove old events
        cleanup_old_events()
    
    FUNCTION cleanup_old_events():
        # Remove events older than max_age
        cutoff = NOW() - max_age_seconds
        events = [e FOR e IN events IF e.timestamp > cutoff]
        
        # Keep only last max_events
        IF events.length > max_events:
            events = events[-max_events:]
    
    FUNCTION get_events_after(last_event_id):
        IF last_event_id IS NULL:
            RETURN []  # No resumption, start fresh
        
        # Find position of last event
        FOR i, event IN enumerate(events):
            IF event.id == last_event_id:
                RETURN events[i+1:]  # Return all events after this one
        
        # Event not found - too old or invalid
        RETURN NULL  # Signal that replay is not possible

FUNCTION handle_sse_connection(request, response):
    last_event_id = request.headers.get('Last-Event-ID')
    
    IF last_event_id:
        missed_events = event_buffer.get_events_after(last_event_id)
        
        IF missed_events IS NULL:
            # Can't resume - client needs full sync
            response.write("event: resync_required\ndata: {}\n\n")
        ELSE:
            # Replay missed events
            FOR event IN missed_events:
                response.write(format_sse_event(event))
    
    # Continue with live events...
```

#### Solution 3: WebSocket Event ID Protocol

WebSocket doesn't have built-in event IDs, so implement your own:

```javascript
// WebSocket client with event ID tracking
class ResumableWebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.lastEventId = options.lastEventId || '0';
    this.pendingEvents = new Map();  // Track unacknowledged events
  }

  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      // Subscribe with last event ID for resumption
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        lastEventId: this.lastEventId
      }));
    };
    
    this.ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      
      switch (data.type) {
        case 'event':
          this.handleEvent(data);
          break;
        case 'replay_complete':
          console.log(`Replayed ${data.count} missed events`);
          break;
        case 'replay_failed':
          console.log('Cannot replay - full sync needed');
          this.requestFullSync();
          break;
      }
    };
  }
  
  handleEvent(data) {
    // Update last event ID
    if (data.id && data.id > this.lastEventId) {
      this.lastEventId = data.id;
    }
    
    // Acknowledge receipt
    this.ws.send(JSON.stringify({
      type: 'ack',
      eventId: data.id
    }));
    
    // Process the event
    this.onEvent(data);
  }
  
  requestFullSync() {
    this.ws.send(JSON.stringify({
      type: 'full_sync_request'
    }));
  }
}
```

#### Solution 4: Handling Resume Failures

When resumption isn't possible:

```javascript
// Handle cases where resume fails
class RobustStreamClient {
  handleResumeFailure(reason) {
    switch (reason) {
      case 'event_expired':
        // Events too old, need full sync
        console.log('Events expired, requesting full sync');
        this.requestFullSync();
        break;
        
      case 'buffer_overflow':
        // Too many events missed
        console.log('Too many events missed, requesting delta sync');
        this.requestDeltaSync();
        break;
        
      case 'invalid_event_id':
        // Event ID not recognized
        console.log('Invalid event ID, starting fresh');
        this.lastEventId = null;
        this.connect();
        break;
        
      default:
        // Unknown error, start fresh
        console.log('Unknown resume error, starting fresh');
        this.lastEventId = null;
        this.connect();
    }
  }
  
  requestFullSync() {
    // Fetch current state via REST API
    fetch('/api/current-state')
      .then(r => r.json())
      .then(state => {
        this.applyFullState(state);
        this.lastEventId = state.lastEventId;
        this.connect();  // Now connect for live updates
      });
  }
  
  requestDeltaSync() {
    // Fetch changes since a known checkpoint
    const checkpoint = this.getLastKnownCheckpoint();
    fetch(`/api/changes?since=${checkpoint}`)
      .then(r => r.json())
      .then(changes => {
        this.applyChanges(changes);
        this.lastEventId = changes.lastEventId;
        this.connect();
      });
  }
}
```

---

## Handling Missed Events

### Why Events Get Missed

Events can be missed during disconnection:
- Server continued sending while client was offline
- Network buffered and dropped events
- Server restarted and lost in-memory events

### Root Causes

1. **No event persistence** - Events only in memory
2. **Buffer too small** - Old events discarded
3. **Long disconnection** - Exceeded retention period
4. **Network packet loss** - Events never arrived

### Solutions for Handling Missed Events

#### Solution 1: Event Replay on Reconnection

```
# Server-side event replay pseudocode
FUNCTION handle_reconnection(client, last_event_id):
    # Get all events after last_event_id
    missed_events = event_store.get_events_after(last_event_id)
    
    IF missed_events IS NULL:
        # Can't determine missed events
        SEND client {"type": "full_sync_required"}
        RETURN
    
    IF missed_events.length > 0:
        # Send replay start marker
        SEND client {
            "type": "replay_start",
            "count": missed_events.length,
            "from_id": last_event_id,
            "to_id": missed_events[-1].id
        }
        
        # Replay each missed event
        FOR event IN missed_events:
            SEND client {
                "type": "replay_event",
                "original_timestamp": event.timestamp,
                "data": event.data
            }
        
        # Send replay end marker
        SEND client {
            "type": "replay_complete",
            "count": missed_events.length
        }
    
    # Now send live events
    subscribe_to_live_events(client)
```

#### Solution 2: Sequence Numbers for Gap Detection

```javascript
// Client-side gap detection
class GapDetector {
  constructor() {
    this.lastSequence = 0;
    this.gaps = [];
  }

  checkEvent(event) {
    const sequence = event.sequence;
    
    if (this.lastSequence > 0 && sequence > this.lastSequence + 1) {
      // Gap detected!
      const gap = {
        from: this.lastSequence + 1,
        to: sequence - 1,
        detected_at: Date.now()
      };
      
      this.gaps.push(gap);
      this.requestMissingEvents(gap);
    }
    
    this.lastSequence = sequence;
  }
  
  requestMissingEvents(gap) {
    console.log(`Gap detected: ${gap.from} to ${gap.to}`);
    
    // Request missing events
    fetch(`/api/events?from=${gap.from}&to=${gap.to}`)
      .then(r => r.json())
      .then(events => {
        events.forEach(e => this.processEvent(e));
        this.removeGap(gap);
      })
      .catch(error => {
        console.error('Failed to fetch missing events:', error);
        // Keep gap in list for retry
      });
  }
}
```

#### Solution 3: Checkpoint-Based Sync

For systems where individual event replay isn't practical:

```javascript
// Checkpoint-based synchronization
class CheckpointSync {
  constructor(options = {}) {
    this.checkpointInterval = options.checkpointInterval || 60000;  // 1 minute
    this.lastCheckpoint = null;
  }

  start() {
    // Save checkpoints periodically
    setInterval(() => {
      this.saveCheckpoint();
    }, this.checkpointInterval);
  }
  
  saveCheckpoint() {
    this.lastCheckpoint = {
      timestamp: Date.now(),
      state: this.getCurrentState(),
      lastEventId: this.lastEventId
    };
    
    // Persist checkpoint
    localStorage.setItem('checkpoint', JSON.stringify(this.lastCheckpoint));
  }
  
  async reconnect() {
    // Load last checkpoint
    const saved = localStorage.getItem('checkpoint');
    if (saved) {
      this.lastCheckpoint = JSON.parse(saved);
    }
    
    if (this.lastCheckpoint) {
      // Try to get events since checkpoint
      try {
        const response = await fetch(
          `/api/events?since=${this.lastCheckpoint.lastEventId}`
        );
        
        if (response.ok) {
          const events = await response.json();
          this.applyEvents(events);
          return;
        }
      } catch (e) {
        console.log('Event replay failed, using checkpoint state');
      }
      
      // Fall back to checkpoint state
      this.restoreState(this.lastCheckpoint.state);
    }
    
    // Connect for live events
    this.connect();
  }
}
```

#### Solution 4: Hybrid REST + Streaming Approach

Combine REST API for missed data with streaming for live updates:

```javascript
// Hybrid synchronization
class HybridSync {
  async initialize() {
    // Step 1: Get current state via REST
    const currentState = await fetch('/api/state').then(r => r.json());
    this.applyState(currentState);
    this.lastEventId = currentState.lastEventId;
    
    // Step 2: Connect to stream
    this.connectStream();
  }
  
  connectStream() {
    const url = `/api/events/stream?lastEventId=${this.lastEventId}`;
    this.eventSource = new EventSource(url);
    
    this.eventSource.addEventListener('event', (e) => {
      const event = JSON.parse(e.data);
      this.applyEvent(event);
      this.lastEventId = event.id;
    });
    
    this.eventSource.addEventListener('sync_required', async () => {
      // Too far behind, need REST sync
      console.log('Sync required - fetching state via REST');
      this.eventSource.close();
      await this.initialize();  // Start over
    });
    
    this.eventSource.onerror = () => {
      if (this.eventSource.readyState === EventSource.CLOSED) {
        // Reconnect after delay
        setTimeout(() => this.reconnect(), 5000);
      }
    };
  }
  
  async reconnect() {
    // Check if we're too far behind
    const status = await fetch('/api/events/status').then(r => r.json());
    
    if (status.oldestEventId > this.lastEventId) {
      // We've missed events that are no longer available
      console.log('Missed events expired, full sync required');
      await this.initialize();
    } else {
      // Can resume normally
      this.connectStream();
    }
  }
}
```

---

## Complete Reconnection Example

Here's a production-ready reconnection implementation:

```javascript
// Complete reconnection manager
class StreamReconnectionManager {
  constructor(options) {
    this.url = options.url;
    this.onEvent = options.onEvent;
    this.onStateChange = options.onStateChange || (() => {});
    
    // Backoff configuration
    this.backoff = new DecorrelatedBackoff({
      baseDelay: 1000,
      maxDelay: 60000
    });
    
    // State tracking
    this.state = 'disconnected';
    this.lastEventId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    
    // Connection reference
    this.eventSource = null;
  }

  connect() {
    if (this.state === 'connecting' || this.state === 'connected') {
      return;
    }
    
    this.setState('connecting');
    
    // Build URL with last event ID
    let url = this.url;
    if (this.lastEventId) {
      url += `${url.includes('?') ? '&' : '?'}lastEventId=${this.lastEventId}`;
    }
    
    this.eventSource = new EventSource(url);
    
    this.eventSource.onopen = () => {
      this.setState('connected');
      this.backoff.reset();
      this.reconnectAttempts = 0;
      console.log('Stream connected');
    };
    
    this.eventSource.onmessage = (event) => {
      if (event.lastEventId) {
        this.lastEventId = event.lastEventId;
      }
      
      try {
        const data = JSON.parse(event.data);
        this.onEvent(data, event.lastEventId);
      } catch (e) {
        console.error('Failed to parse event:', e);
      }
    };
    
    this.eventSource.onerror = () => {
      if (this.eventSource.readyState === EventSource.CLOSED) {
        this.handleDisconnection();
      }
    };
  }

  handleDisconnection() {
    this.setState('disconnected');
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState('failed');
      console.error('Max reconnection attempts reached');
      return;
    }
    
    const delay = this.backoff.nextDelay();
    this.reconnectAttempts++;
    
    console.log(
      `Reconnecting in ${delay}ms ` +
      `(attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );
    
    this.setState('reconnecting');
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setState('disconnected');
  }

  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.onStateChange(newState, oldState);
  }

  // Get current status for monitoring
  getStatus() {
    return {
      state: this.state,
      lastEventId: this.lastEventId,
      reconnectAttempts: this.reconnectAttempts,
      url: this.url
    };
  }
}

// Usage example
const stream = new StreamReconnectionManager({
  url: 'https://api.example.com/events',
  maxReconnectAttempts: 10,
  
  onEvent: (data, eventId) => {
    console.log('Received event:', eventId, data);
    updateUI(data);
  },
  
  onStateChange: (newState, oldState) => {
    console.log(`State changed: ${oldState} -> ${newState}`);
    updateConnectionIndicator(newState);
  }
});

// Start connection
stream.connect();

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Reconnect when page becomes visible
    if (stream.state === 'disconnected' || stream.state === 'failed') {
      stream.backoff.reset();
      stream.reconnectAttempts = 0;
      stream.connect();
    }
  }
});

// Handle online/offline events
window.addEventListener('online', () => {
  console.log('Network online, reconnecting...');
  stream.connect();
});

window.addEventListener('offline', () => {
  console.log('Network offline');
  stream.disconnect();
});
```

---

## Prevention Tips

### Design for Disconnection

1. **Use event IDs from the start** - Add them even if not needed yet
2. **Buffer events server-side** - Keep history for replay
3. **Implement heartbeats** - Detect silent failures early
4. **Test disconnection scenarios** - Simulate network issues

### Monitor Connection Health

Track these metrics:
- Connection duration
- Reconnection frequency
- Event replay requests
- Failed reconnection attempts
- Missed event count

### Client Best Practices

- Persist last event ID across page refreshes
- Handle visibility change events
- Implement offline detection
- Show connection state to users
- Queue user actions during disconnection

---

## Related Resources

- [Common Streaming Issues](common-issues.md)
- [Streaming Testing Strategies](testing-strategies.md)
- [HTTP Streaming Patterns](../../advanced-patterns/http-streaming-patterns.md)
- [Event-Driven Architecture](../../advanced-patterns/event-driven-architecture.md)
