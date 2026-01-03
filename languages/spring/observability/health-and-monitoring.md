# Health and Monitoring

## Overview

Health checks and alerts help keep systems running well. They catch problems early. This guide shows how to use health checks, alerts, Kubernetes, and dashboards.

## Health Monitoring

### Spring Boot Actuator

Configure Spring Boot Actuator for health monitoring:

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
      base-path: /actuator
  endpoint:
    health:
      show-details: when_authorized
      show-components: when_authorized
      probes:
        enabled: true
  health:
    livenessState:
      enabled: true
    readinessState:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
  info:
    env:
      enabled: true
    git:
      enabled: true
    build:
      enabled: true
```

### Custom Health Indicators

Implement custom health indicators for external dependencies:

```java
@Component
public class PaymentServiceHealthIndicator implements HealthIndicator {
    
    private final WebClient paymentServiceClient;
    
    public PaymentServiceHealthIndicator(WebClient.Builder webClientBuilder,
                                         @Value("${services.payment.url}") String baseUrl) {
        this.paymentServiceClient = webClientBuilder
            .baseUrl(baseUrl)
            .build();
    }
    
    @Override
    public Health health() {
        try {
            // Perform health check against payment service
            ResponseEntity<String> response = paymentServiceClient.get()
                .uri("/actuator/health")
                .retrieve()
                .toEntity(String.class)
                .block(Duration.ofSeconds(5));
                
            if (response.getStatusCode().is2xxSuccessful()) {
                return Health.up()
                    .withDetail("status", response.getStatusCode())
                    .build();
            } else {
                return Health.down()
                    .withDetail("status", response.getStatusCode())
                    .build();
            }
        } catch (Exception e) {
            return Health.down(e)
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

### Reactive Health Indicator

```java
@Component
public class ReactivePaymentServiceHealthIndicator implements ReactiveHealthIndicator {
    
    private final WebClient paymentServiceClient;
    
    public ReactivePaymentServiceHealthIndicator(WebClient.Builder webClientBuilder,
                                                @Value("${services.payment.url}") String baseUrl) {
        this.paymentServiceClient = webClientBuilder
            .baseUrl(baseUrl)
            .build();
    }
    
    @Override
    public Mono<Health> health() {
        return paymentServiceClient.get()
            .uri("/actuator/health")
            .retrieve()
            .toEntity(String.class)
            .timeout(Duration.ofSeconds(3))
            .map(response -> {
                if (response.getStatusCode().is2xxSuccessful()) {
                    return Health.up()
                        .withDetail("status", response.getStatusCode())
                        .build();
                } else {
                    return Health.down()
                        .withDetail("status", response.getStatusCode())
                        .build();
                }
            })
            .onErrorResume(e -> Mono.just(Health.down(e)
                .withDetail("error", e.getMessage())
                .build()));
    }
}
```

## Alerting

### Prometheus Alert Rules

Define Prometheus alert rules:

```yaml
# alert-rules.yml
groups:
- name: order-service-alerts
  rules:
  - alert: HighErrorRate
    expr: sum(rate(http_server_requests_seconds_count{status="5xx"}[5m])) / sum(rate(http_server_requests_seconds_count[5m])) > 0.05
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "High HTTP error rate"
      description: "More than 5% of requests are resulting in 5xx errors for the past 1 minute"

  - alert: SlowResponseTime
    expr: histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le)) > 0.5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Slow response time"
      description: "95th percentile of response time is above 500ms for the past 5 minutes"

  - alert: HighCPUUsage
    expr: process_cpu_usage > 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage"
      description: "CPU usage is above 80% for the past 5 minutes"
```

## Monitoring in Kubernetes

### Container Log Configuration

Configure container log handling:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    spec:
      containers:
      - name: order-service
        image: order-service:latest
        env:
        - name: JAVA_OPTS
          value: "-Xmx512m -Xms256m"
        - name: SPRING_PROFILES_ACTIVE
          value: "production"
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        volumeMounts:
        - name: log-volume
          mountPath: /app/logs
      volumes:
      - name: log-volume
        emptyDir: {}
```

### Log Collection with Fluentd

Configure log collection for Kubernetes:

```yaml
# fluentd-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/order-service-*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.order-service.*
      format json
      time_format %Y-%m-%dT%H:%M:%S.%NZ
    </source>
    
    <filter kubernetes.**>
      @type kubernetes_metadata
    </filter>
    
    <match kubernetes.order-service.**>
      @type elasticsearch
      host elasticsearch-logging
      port 9200
      logstash_format true
      logstash_prefix order-service
      include_tag_key true
    </match>
```

## Operational Dashboard Templates

### Grafana Dashboard JSON

Provide Grafana dashboard templates:

```json
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": 1,
  "links": [],
  "panels": [
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": null,
      "fieldConfig": {
        "defaults": {},
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 2,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.5.5",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "exemplar": true,
          "expr": "sum(rate(http_server_requests_seconds_count{application=\"order-service\"}[1m])) by (status)",
          "interval": "",
          "legendFormat": "{{status}}",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "HTTP Request Rate",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": null,
      "fieldConfig": {
        "defaults": {},
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 4,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.5.5",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "exemplar": true,
          "expr": "histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{application=\"order-service\"}[5m])) by (le, uri))",
          "interval": "",
          "legendFormat": "{{uri}}",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "HTTP Response Time (95th percentile)",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "s",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    }
  ],
  "refresh": "5s",
  "schemaVersion": 27,
  "style": "dark",
  "tags": [],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-1h",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "",
  "title": "Order Service Dashboard",
  "uid": "order-service-dash",
  "version": 1
}
```

## Best Practices

### Patterns to Follow

| Pattern | Example | Description |
|---------|---------|-------------|
| Health Checks | Custom indicators | Monitor dependencies |
| Liveness Probes | Kubernetes probes | Restart unhealthy containers |
| Readiness Probes | Traffic management | Control traffic routing |
| Alerting Rules | Prometheus alerts | Proactive issue detection |

### Anti-patterns to Avoid

| Anti-pattern | Example | Preferred Approach |
|--------------|---------|-------------------|
| Missing Health Checks | No dependency monitoring | Implement custom health indicators |
| Alert Fatigue | Too many alerts | Set appropriate thresholds |
| Generic Dashboards | No service-specific views | Create targeted dashboards |
| No SLO Tracking | No performance targets | Define and monitor SLOs |

## Related Documentation

### API Design Standards (Language-Agnostic)
- [API Observability Standards](../../../guides/api-design/advanced-patterns/api-observability-standards.md) - Protocol-level observability patterns and HTTP standards

### Spring Implementation  
- [Observability Configuration](../configuration/observability-configuration.md) - Configuration patterns for metrics and tracing
- [Logging Standards](./logging-standards.md) - Structured logging and correlation IDs
- [Metrics and Tracing](./metrics-and-tracing.md) - Metrics collection and distributed tracing
- [Infrastructure Testing](../testing/specialized-testing/infrastructure-testing.md) - Testing observability components
- [Error Logging and Monitoring](../error-handling/error-logging-and-monitoring.md) - Error handling observability
