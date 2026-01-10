# Virtual Threads in Spring Boot

> **Reading Guide**
>
> **Reading Time:** 17 minutes | **Level:** Intermediate
>
> **Prerequisites:** Java 21+, Spring Boot 3.2+ basics
> **Key Topics:** Virtual threads, concurrency, performance, configuration
>
> **Complexity:** 9.4 grade level • 0.5% technical density • fairly difficult

## What Are Virtual Threads?

Virtual threads are lightweight threads managed by the JVM. They let you write simple blocking code that scales like reactive code. Java 21 introduced them as part of Project Loom (JEP 444).

**Platform threads** map one-to-one to OS threads. Creating thousands costs memory and CPU. **Virtual threads** are cheap. The JVM schedules millions of them onto a small pool of platform threads called **carrier threads**.

### How Virtual Threads Work

```
┌─────────────────────────────────────────────────────────────┐
│                        JVM Scheduler                         │
├─────────────────────────────────────────────────────────────┤
│  Virtual Thread 1  │  Virtual Thread 2  │  Virtual Thread N  │
│     (waiting)      │    (running)       │     (waiting)      │
├─────────────────────────────────────────────────────────────┤
│         Carrier Thread 1        │      Carrier Thread 2      │
│        (Platform Thread)        │      (Platform Thread)     │
├─────────────────────────────────────────────────────────────┤
│                    Operating System                          │
└─────────────────────────────────────────────────────────────┘
```

When a virtual thread blocks (database call, HTTP request, file I/O), the JVM unmounts it from its carrier thread. The carrier thread runs other virtual threads. When the I/O completes, the JVM remounts the virtual thread onto any available carrier.

This happens automatically. You write blocking code. The JVM handles the rest.

## When to Use Virtual Threads

### Use Virtual Threads When

- Your app is **I/O-bound** (database calls, HTTP clients, file operations)
- You want to scale Spring MVC without going reactive
- You need simple, familiar blocking code with massive concurrency
- Java 21+ is available in your environment
- You have many concurrent requests that spend time waiting

### Avoid Virtual Threads When

- Your workload is **CPU-intensive** (video encoding, complex calculations, ML inference)
- You need reactive features like backpressure and streaming
- You're running on Java 17-20
- Your code uses many `synchronized` blocks with blocking operations inside
- You need fine-grained thread pool control

### Virtual Threads vs Reactive

| Aspect | Virtual Threads | Reactive (WebFlux) |
|--------|-----------------|-------------------|
| **Code Style** | Blocking, imperative | Non-blocking, functional |
| **Learning Curve** | Low (familiar patterns) | High (new paradigm) |
| **Debugging** | Easy (stack traces work) | Hard (async boundaries) |
| **Backpressure** | Manual (semaphores) | Built-in |
| **Best For** | I/O-bound, request-response | Streaming, high concurrency |
| **Migration** | Drop-in for existing code | Rewrite required |

**Rule of thumb**: If your app works well with Spring MVC and you need more scale, try virtual threads first. Go reactive only if you need streaming or backpressure.

## Basic Configuration

Enable virtual threads with one property:

```yaml
# application.yml
spring:
  threads:
    virtual:
      enabled: true
```

```properties
# application.properties
spring.threads.virtual.enabled=true
```

**Requirements**:
- Java 21 or newer
- Spring Boot 3.2 or newer

When enabled, Spring Boot automatically uses virtual threads for:
- Servlet container request handling (Tomcat, Jetty)
- `@Async` methods
- Spring MVC async request processing
- `@Scheduled` tasks

### Web Server Support

| Server | Virtual Thread Support |
|--------|----------------------|
| **Tomcat** | Full support |
| **Jetty** | Full support |
| **Undertow** | Not supported in Spring Boot |

**Note**: While Undertow 2.3.10+ has virtual thread support, Spring Boot does not auto-configure virtual threads for Undertow. If you use Undertow, switch to Tomcat or Jetty to benefit from automatic virtual thread integration in Spring Boot.

## What Gets Virtualized

### Servlet Container Threads

With virtual threads enabled, each incoming HTTP request runs on a virtual thread instead of a platform thread from the pool.

**Before** (platform threads):
```
Request → Thread Pool (limited) → Process → Response
         └── 200 threads max
```

**After** (virtual threads):
```
Request → Virtual Thread (unlimited) → Process → Response
         └── Millions possible
```

Your controller code stays the same. Spring handles the switch.

### @Async Methods

When you enable virtual threads, `@Async` methods automatically run on virtual threads.

**Auto-configuration**:
- Spring Boot configures a `SimpleAsyncTaskExecutor`
- This executor uses virtual threads instead of a thread pool
- Thread pool properties (`spring.task.execution.pool.*`) are ignored

```java
@Service
public class EmailService {
    
    @Async
    public CompletableFuture<Void> sendEmail(String to, String subject, String body) {
        // This runs on a virtual thread automatically
        emailClient.send(to, subject, body);
        return CompletableFuture.completedFuture(null);
    }
}
```

### Scheduled Tasks

Scheduled tasks also use virtual threads when enabled.

**Auto-configuration**:
- Spring Boot configures a `SimpleAsyncTaskScheduler`
- Scheduler pool properties are ignored
- Each scheduled execution gets its own virtual thread

```java
@Component
public class ReportGenerator {
    
    @Scheduled(cron = "0 0 2 * * *")  // 2 AM daily
    public void generateDailyReport() {
        // Runs on a virtual thread
        reportService.generate();
    }
}
```

**Important**: Virtual threads are daemon threads. Set `spring.main.keep-alive=true` to prevent the JVM from exiting if your app only runs scheduled tasks.

```yaml
spring:
  main:
    keep-alive: true
  threads:
    virtual:
      enabled: true
```

## @Async with Virtual Threads

### Automatic Configuration

With `spring.threads.virtual.enabled=true`, Spring Boot auto-configures:

```java
// Spring Boot creates this automatically
@Bean
public AsyncTaskExecutor applicationTaskExecutor() {
    return new SimpleAsyncTaskExecutorBuilder()
        .virtualThreads(true)
        .threadNamePrefix("task-")
        .build();
}
```

### Manual Configuration

For custom thread naming or concurrency limits:

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean("applicationTaskExecutor")
    public AsyncTaskExecutor applicationTaskExecutor(
            SimpleAsyncTaskExecutorBuilder builder) {
        return builder
            .virtualThreads(true)
            .threadNamePrefix("async-")
            .build();
    }
}
```

### Usage Example

```java
@Service
public class OrderService {
    
    private final PaymentClient paymentClient;
    private final InventoryClient inventoryClient;
    private final NotificationService notificationService;
    
    @Async
    public CompletableFuture<OrderResult> processOrderAsync(Order order) {
        // All blocking calls run on virtual threads
        PaymentResult payment = paymentClient.charge(order.getPaymentInfo());
        inventoryClient.reserve(order.getItems());
        notificationService.sendConfirmation(order);
        
        return CompletableFuture.completedFuture(
            new OrderResult(order.getId(), payment.getTransactionId())
        );
    }
}
```

## Scheduled Tasks with Virtual Threads

### Automatic Configuration

Spring Boot auto-configures a virtual thread scheduler:

```java
// Spring Boot creates this automatically
@Bean
public TaskScheduler taskScheduler() {
    return new SimpleAsyncTaskSchedulerBuilder()
        .virtualThreads(true)
        .build();
}
```

### Manual Configuration

```java
@Configuration
@EnableScheduling
public class SchedulingConfig {
    
    @Bean
    public TaskScheduler taskScheduler(
            SimpleAsyncTaskSchedulerBuilder builder) {
        return builder
            .virtualThreads(true)
            .threadNamePrefix("scheduled-")
            .build();
    }
}
```

### Concurrency Limits

Virtual threads don't have pool sizes. Use concurrency limits to prevent overload:

```yaml
spring:
  task:
    scheduling:
      simple:
        concurrency-limit: 10  # Max concurrent scheduled tasks
```

## Custom Executor for Specific Use Cases

### Direct Virtual Thread Executor

For fine-grained control, create executors directly:

```java
@Configuration
public class ExecutorConfig {
    
    @Bean("virtualThreadExecutor")
    public ExecutorService virtualThreadExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}
```

### Usage with Qualifier

```java
@Service
public class BatchProcessor {
    
    private final ExecutorService executor;
    
    public BatchProcessor(
            @Qualifier("virtualThreadExecutor") ExecutorService executor) {
        this.executor = executor;
    }
    
    public void processBatch(List<Task> tasks) {
        List<Future<?>> futures = tasks.stream()
            .map(task -> executor.submit(() -> process(task)))
            .toList();
        
        // Wait for all to complete
        for (Future<?> future : futures) {
            try {
                future.get();
            } catch (ExecutionException e) {
                handleError(e.getCause());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Batch interrupted", e);
            }
        }
    }
    
    private void process(Task task) {
        // Process individual task
    }
    
    private void handleError(Throwable cause) {
        // Handle error
    }
}
```

### Conditional Bean for Virtual Threads

Use `@ConditionalOnThreading` to create beans only when virtual threads are active:

```java
@Configuration
public class ConditionalConfig {
    
    @Bean
    @ConditionalOnThreading(Threading.VIRTUAL)
    public MyService virtualThreadOptimizedService() {
        return new MyService(/* virtual thread optimized config */);
    }
    
    @Bean
    @ConditionalOnThreading(Threading.PLATFORM)
    public MyService platformThreadService() {
        return new MyService(/* platform thread config */);
    }
}
```

## Structured Concurrency (Preview)

Structured Concurrency (JEP 453) groups related tasks as a single unit. It ensures child tasks complete before the parent continues. This prevents thread leaks and simplifies error handling.

**Status**: Preview feature in Java 21-24. Requires `--enable-preview` flag.

### Basic Pattern

```java
// Requires: --enable-preview
import java.util.concurrent.StructuredTaskScope;

public class OrderService {
    
    public OrderDetails fetchOrderDetails(Long orderId) throws Exception {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            
            // Fork subtasks - each runs on its own virtual thread
            Supplier<Order> orderTask = scope.fork(
                () -> orderRepository.findById(orderId));
            Supplier<Customer> customerTask = scope.fork(
                () -> customerService.getCustomer(orderId));
            Supplier<List<Item>> itemsTask = scope.fork(
                () -> itemService.getItems(orderId));
            
            // Wait for all tasks
            scope.join();
            
            // Propagate any exceptions
            scope.throwIfFailed();
            
            // All succeeded - combine results
            return new OrderDetails(
                orderTask.get(),
                customerTask.get(),
                itemsTask.get()
            );
        }
    }
}
```

### ShutdownOnSuccess Pattern

Cancel remaining tasks when one succeeds:

```java
public String fetchFromFastestMirror(String resource) throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnSuccess<String>()) {
        
        scope.fork(() -> mirrorA.fetch(resource));
        scope.fork(() -> mirrorB.fetch(resource));
        scope.fork(() -> mirrorC.fetch(resource));
        
        scope.join();
        
        // Returns first successful result, cancels others
        return scope.result();
    }
}
```

### Spring Boot Integration

Structured concurrency works in Spring services:

```java
@Service
public class AggregationService {
    
    private final UserService userService;
    private final OrderService orderService;
    private final RecommendationService recommendationService;
    
    public DashboardData getDashboard(Long userId) {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            
            var userTask = scope.fork(() -> userService.getProfile(userId));
            var ordersTask = scope.fork(() -> orderService.getRecent(userId));
            var recsTask = scope.fork(() -> recommendationService.getFor(userId));
            
            scope.join();
            scope.throwIfFailed();
            
            return new DashboardData(
                userTask.get(),
                ordersTask.get(),
                recsTask.get()
            );
            
        } catch (Exception e) {
            throw new ServiceException("Failed to load dashboard", e);
        }
    }
}
```

## Performance Considerations

### Best Practices

1. **Don't pool virtual threads** - Create new ones per task
2. **Avoid `synchronized` blocks with blocking operations** - Use `ReentrantLock` instead
3. **Size connection pools appropriately** - They become the bottleneck
4. **Monitor carrier threads** - Use JFR events
5. **Use semaphores for resource limiting** - Virtual threads ignore pool sizes

### Thread Pool Properties Are Ignored

When virtual threads are enabled, these properties have no effect:

| Property | Status |
|----------|--------|
| `spring.task.execution.pool.core-size` | Ignored |
| `spring.task.execution.pool.max-size` | Ignored |
| `spring.task.execution.pool.queue-capacity` | Ignored |
| `spring.task.scheduling.pool.size` | Ignored |

**Why**: Virtual threads don't use pools. The JVM manages them on carrier threads.

### Properties That Still Work

| Property | Purpose |
|----------|---------|
| `spring.task.execution.thread-name-prefix` | Names for debugging |
| `spring.task.execution.simple.concurrency-limit` | Max concurrent tasks |
| `spring.task.scheduling.simple.concurrency-limit` | Max concurrent scheduled |

### Connection Pool Sizing

Virtual threads can create thousands of concurrent database calls. Your connection pool becomes the bottleneck.

**Problem**:
```
1000 virtual threads → 1000 concurrent queries → 10 connections available
= 990 threads waiting for connections
```

**Solutions**:

1. **Increase pool size** (within database limits):
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 50  # Up from default 10
```

2. **Use semaphores to limit concurrency**:
```java
@Component
public class DatabaseAccessor {
    
    private final Semaphore dbSemaphore = new Semaphore(50);
    private final JdbcTemplate jdbcTemplate;
    
    public List<Data> queryWithLimit(String sql) {
        boolean acquired = false;
        try {
            dbSemaphore.acquire();
            acquired = true;
            return jdbcTemplate.query(sql, (rs, rowNum) -> {
                Data data = new Data();
                data.setId(rs.getLong("id"));
                data.setValue(rs.getString("value"));
                return data;
            });
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted waiting for DB", e);
        } finally {
            if (acquired) {
                dbSemaphore.release();
            }
        }
    }
}
```

## Monitoring and Debugging

### Check if Running on Virtual Thread

```java
@RestController
public class DiagnosticController {
    
    @GetMapping("/thread-info")
    public Map<String, Object> getThreadInfo() {
        Thread current = Thread.currentThread();
        return Map.of(
            "threadName", current.getName(),
            "isVirtual", current.isVirtual(),
            "threadId", current.threadId()
        );
    }
}
```

### JFR Events for Virtual Threads

Java Flight Recorder captures virtual thread events:

| Event | Purpose |
|-------|---------|
| `jdk.VirtualThreadStart` | Thread created |
| `jdk.VirtualThreadEnd` | Thread terminated |
| `jdk.VirtualThreadPinned` | Thread pinned to carrier (problem!) |
| `jdk.VirtualThreadSubmitFailed` | Scheduling failed |

**Enable JFR recording**:
```bash
java -XX:StartFlightRecording:filename=recording.jfr,duration=60s \
     -jar myapp.jar
```

**Enable pinned thread warnings**:
```bash
java -Djdk.tracePinnedThreads=full -jar myapp.jar
```

### Micrometer Metrics

Add virtual thread metrics with Micrometer:

```java
@Configuration
public class MetricsConfig {
    
    @Bean
    @ConditionalOnClass(name = 
        "io.micrometer.java21.instrument.binder.jdk.VirtualThreadMetrics")
    public MeterBinder virtualThreadMetrics() {
        return new VirtualThreadMetrics();
    }
}
```

**Metrics provided**:
- `jvm.threads.virtual.pinned` - Count of pinned events
- `jvm.threads.virtual.submit.failed` - Failed submissions
- `jvm.threads.virtual.live` - Active virtual threads

## Testing with Virtual Threads

### Enable Virtual Threads in Tests

```java
@SpringBootTest
@TestPropertySource(properties = "spring.threads.virtual.enabled=true")
class VirtualThreadIntegrationTest {
    
    @Autowired
    private MyService myService;
    
    @Test
    void shouldProcessOnVirtualThread() {
        // Service methods run on virtual threads
        var result = myService.process();
        assertThat(result).isNotNull();
    }
}
```

### Verify Virtual Thread Usage

```java
@SpringBootTest
@TestPropertySource(properties = "spring.threads.virtual.enabled=true")
class VirtualThreadVerificationTest {
    
    @Autowired
    private AsyncTaskExecutor taskExecutor;
    
    @Test
    void shouldUseVirtualThreads() throws Exception {
        var future = taskExecutor.submit(() -> {
            return Thread.currentThread().isVirtual();
        });
        
        assertThat(future.get()).isTrue();
    }
}
```

### Test with Explicit Executor

```java
@Test
void shouldRunTaskOnVirtualThread() throws Exception {
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
        var future = executor.submit(() -> {
            assertThat(Thread.currentThread().isVirtual()).isTrue();
            return "completed";
        });
        
        assertThat(future.get()).isEqualTo("completed");
    }
}
```

### Load Testing Considerations

When load testing virtual thread applications:

1. **Don't measure thread pool saturation** - It doesn't apply
2. **Monitor connection pools** - They become the bottleneck
3. **Watch for pinning events** - Check JFR recordings
4. **Measure response times** - Should improve under load
5. **Test with realistic I/O** - Virtual threads shine with blocking I/O

## Migration from Thread Pools

### Before: Platform Thread Pool

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean
    public ThreadPoolTaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        return executor;
    }
}
```

### After: Virtual Threads

**Option 1**: Just enable the property (recommended)

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

Remove your custom executor bean. Spring Boot auto-configures one.

**Option 2**: Custom executor with virtual threads

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean("applicationTaskExecutor")
    public AsyncTaskExecutor taskExecutor(
            SimpleAsyncTaskExecutorBuilder builder) {
        return builder
            .virtualThreads(true)
            .threadNamePrefix("async-")
            .build();
    }
}
```

### Migration Checklist

- [ ] Upgrade to Java 21+
- [ ] Upgrade to Spring Boot 3.2+
- [ ] Add `spring.threads.virtual.enabled=true`
- [ ] Remove thread pool configuration (optional)
- [ ] Replace `synchronized` with `ReentrantLock` where blocking occurs
- [ ] Size connection pools for expected concurrency
- [ ] Add JFR monitoring for pinning detection
- [ ] Load test to verify improvement
- [ ] Monitor in production before full rollout

## Common Pitfalls

### 1. Thread Pinning

Virtual threads get "pinned" to carrier threads when blocked inside `synchronized` blocks. This negates their benefits.

**Problem**:
```java
// Bad - causes pinning
public class CacheService {
    private final Map<String, Data> cache = new HashMap<>();
    
    public synchronized Data get(String key) {
        if (!cache.containsKey(key)) {
            // Blocking I/O inside synchronized = PINNED
            cache.put(key, database.fetch(key));
        }
        return cache.get(key);
    }
}
```

**Solution**: Use `ReentrantLock` instead:
```java
// Good - no pinning
public class CacheService {
    private final Map<String, Data> cache = new HashMap<>();
    private final ReentrantLock lock = new ReentrantLock();
    
    public Data get(String key) {
        lock.lock();
        try {
            if (!cache.containsKey(key)) {
                // Virtual thread unmounts while waiting for I/O
                cache.put(key, database.fetch(key));
            }
            return cache.get(key);
        } finally {
            lock.unlock();
        }
    }
}
```

**Detect pinning**:
```bash
java -Djdk.tracePinnedThreads=full -jar myapp.jar
```

### 2. Connection Pool Exhaustion

Virtual threads can overwhelm limited resources like database connections.

**Problem**:
```
10,000 virtual threads → 10,000 concurrent DB calls → Pool exhausted
```

**Solution**: Use semaphores to limit concurrency:
```java
@Service
public class DataService {
    
    // Allow max 50 concurrent database operations
    private final Semaphore dbSemaphore = new Semaphore(50);
    private final DataRepository repository;
    
    public Data fetchData(Long id) {
        boolean acquired = false;
        try {
            dbSemaphore.acquire();
            acquired = true;
            return repository.findById(id).orElseThrow();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ServiceException("Interrupted", e);
        } finally {
            if (acquired) {
                dbSemaphore.release();
            }
        }
    }
}
```

### 3. CPU-Bound Work

Virtual threads don't help CPU-intensive operations. They may even hurt performance due to scheduling overhead.

**Don't use virtual threads for**:
- Image/video processing
- Complex calculations
- Encryption/decryption of large data
- Machine learning inference
- Compression

**Use platform threads for CPU work**:
```java
@Bean("cpuIntensiveExecutor")
public ExecutorService cpuIntensiveExecutor() {
    // Use platform threads for CPU-bound work
    return Executors.newFixedThreadPool(
        Runtime.getRuntime().availableProcessors()
    );
}
```

### 4. ThreadLocal Misuse

`ThreadLocal` works with virtual threads but can cause memory issues with millions of threads.

**Problem**:
```java
// Each virtual thread gets its own copy
private static final ThreadLocal<ExpensiveObject> context = 
    ThreadLocal.withInitial(ExpensiveObject::new);
```

**Solutions**:
1. Use scoped values (preview in Java 21):
```java
private static final ScopedValue<RequestContext> CONTEXT = 
    ScopedValue.newInstance();
```

2. Pass context explicitly:
```java
public void process(RequestContext context, Data data) {
    // Context passed as parameter
}
```

### 5. Forgetting keep-alive for Scheduled Tasks

Virtual threads are daemon threads. If your app only runs scheduled tasks, the JVM may exit.

**Problem**:
```yaml
spring:
  threads:
    virtual:
      enabled: true
# JVM exits because all threads are daemon threads
```

**Solution**:
```yaml
spring:
  main:
    keep-alive: true  # Prevents JVM exit
  threads:
    virtual:
      enabled: true
```

## Quick Reference

### Configuration Properties

```yaml
spring:
  main:
    keep-alive: true                    # Prevent JVM exit with daemon threads
  threads:
    virtual:
      enabled: true                     # Enable virtual threads
  task:
    execution:
      thread-name-prefix: "async-"      # Thread name prefix
      simple:
        concurrency-limit: 100          # Max concurrent async tasks
    scheduling:
      thread-name-prefix: "sched-"      # Scheduler thread prefix
      simple:
        concurrency-limit: 10           # Max concurrent scheduled tasks
```

### JVM Flags

```bash
# Enable pinning warnings (development)
-Djdk.tracePinnedThreads=full

# JFR recording
-XX:StartFlightRecording:filename=app.jfr,duration=60s

# Carrier thread pool size (advanced tuning)
-Djdk.virtualThreadScheduler.parallelism=4
-Djdk.virtualThreadScheduler.maxPoolSize=8
```

### Useful Code Patterns

```java
// Check if virtual thread
Thread.currentThread().isVirtual()

// Create virtual thread directly
Thread.startVirtualThread(() -> doWork());

// Virtual thread executor
Executors.newVirtualThreadPerTaskExecutor()

// Semaphore for resource limiting
new Semaphore(maxConcurrent)

// ReentrantLock instead of synchronized
new ReentrantLock()
```

## Related Topics

- **[Configuration Principles](configuration-principles.md)**: Core configuration patterns
- **[External Services](external-services.md)**: HTTP client configuration
- **[Observability Configuration](observability-configuration.md)**: Monitoring setup
- **[Testing](../testing/)**: Testing strategies for Spring Boot

## References

- [Spring Boot Virtual Threads Documentation](https://docs.spring.io/spring-boot/reference/features/task-execution-and-scheduling.html#features.task-execution-and-scheduling.virtual-threads)
- [JEP 444: Virtual Threads](https://openjdk.org/jeps/444)
- [JEP 453: Structured Concurrency](https://openjdk.org/jeps/453)
- [Oracle Virtual Threads Guide](https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html)
