# Spring Boot gRPC Distributed Tracing

> **📖 Reading Guide**
> **⏱️ Reading Time:** 6 minutes | **🎯 Level:** Intermediate
> **📋 Prerequisites:** [Metrics](metrics.md), OpenTelemetry basics
> **🎯 Key Topics:** OpenTelemetry • Zipkin • Trace propagation • Span management
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

Implement distributed tracing for gRPC services with OpenTelemetry.

---

## Dependencies

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-zipkin</artifactId>
</dependency>
```

---

## Configuration

```yaml
management:
  tracing:
    sampling:
      probability: 1.0
  zipkin:
    tracing:
      endpoint: http://localhost:9411/api/v2/spans
```

---

## Tracing Interceptor

```java
@GrpcGlobalServerInterceptor
public class TracingInterceptor implements ServerInterceptor {

    private final Tracer tracer;

    public TracingInterceptor(Tracer tracer) {
        this.tracer = tracer;
    }

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        
        Span span = tracer.spanBuilder(call.getMethodDescriptor().getFullMethodName())
            .setSpanKind(SpanKind.SERVER)
            .startSpan();
        
        try (Scope scope = span.makeCurrent()) {
            return new ForwardingServerCallListener.SimpleForwardingServerCallListener<ReqT>(
                    next.startCall(call, headers)) {
                
                @Override
                public void onComplete() {
                    span.end();
                    super.onComplete();
                }

                @Override
                public void onCancel() {
                    span.setAttribute("cancelled", true);
                    span.end();
                    super.onCancel();
                }
            };
        }
    }
}
```

---

**Navigation:** [← Metrics](metrics.md) | [Health Checks →](health-checks.md)
