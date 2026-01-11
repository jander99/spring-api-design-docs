# Spring Boot Deployment

This section covers deployment strategies for Spring Boot applications, from containerization to native compilation.

## Topics

### Native Image Compilation

- **[GraalVM Native Image](graalvm-native.md)** - Compile Spring Boot applications to native executables using GraalVM. Covers Maven and Gradle configuration, AOT processing, reflection hints, testing, and production deployment.

## Coming Soon

Future deployment topics planned for this section:

- **Docker Containerization** - Building optimized Docker images for Spring Boot
- **Kubernetes Deployment** - Deploying Spring Boot to Kubernetes clusters
- **Cloud Platform Deployment** - AWS, Azure, and GCP deployment strategies
- **Health Checks and Readiness** - Configuring probes for container orchestration

## Quick Start

For most production deployments, start with [GraalVM Native Image](graalvm-native.md) if you need:
- Fast startup times (milliseconds instead of seconds)
- Reduced memory footprint (up to 5x less RAM)
- Smaller container images
- Serverless or edge deployment scenarios

## Related Topics

- [Configuration Management](../configuration/) - Application configuration and profiles
- [Observability](../observability/) - Monitoring and metrics for deployed applications
- [Testing](../testing/) - Testing strategies including native image testing
