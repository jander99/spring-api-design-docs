# GraalVM Native Image with Spring Boot

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 20 minutes | **🟡 Level:** College Freshman  
> **📋 Prerequisites:** Spring Boot 3.x, basic Docker knowledge  
> **🎯 Key Topics:** Native compilation, AOT processing, production deployment  
> **📊 Complexity:** College Freshman level • 0.8% technical density • fairly difficult

## Why Native Images?

GraalVM Native Image compiles your Spring Boot application ahead-of-time into a standalone executable. This provides dramatic improvements in startup time and memory usage, making it ideal for cloud-native deployments.

### JVM vs Native Image Comparison

| Metric | Traditional JVM | Native Image |
|--------|----------------|--------------|
| **Startup Time** | 2-10 seconds | 50-200ms |
| **Memory Usage** | 200-500MB | 50-100MB |
| **Peak Performance** | Excellent | Good |
| **Build Time** | Fast (seconds) | Slow (3-10 minutes) |
| **Image Size** | Larger (with JRE) | Smaller (standalone) |
| **CPU at Startup** | High (JIT warmup) | Low (pre-compiled) |

### When to Use Native Images

**Use native images when:**
- **Serverless deployments**: AWS Lambda, Azure Functions, Google Cloud Functions
- **Kubernetes autoscaling**: Frequent pod starts benefit from fast startup
- **CLI tools**: Command-line utilities need instant startup
- **Resource-constrained environments**: Limited memory or CPU available
- **Cold start matters**: Applications with intermittent traffic patterns
- **Cost optimization**: Lower memory = lower cloud costs

**Consider JVM when:**
- **Long-running services**: Startup time doesn't matter after initial boot
- **Maximum throughput needed**: JIT can optimize hot paths better over time
- **Heavy reflection/dynamic features**: Lots of runtime class loading
- **Development iteration**: Faster build-test cycles during development
- **Library compatibility**: Using libraries without native image support

## Prerequisites

### Required Software

- **Java 17+**: Any distribution (GraalVM not required for buildpacks approach)
- **Spring Boot 3.0+**: Native image support is built-in
- **Maven 3.8+** or **Gradle 7.5+**
- **Docker**: Required for Cloud Native Buildpacks approach

### Optional: Install GraalVM

GraalVM is only required if building locally with the native Maven/Gradle plugin. Not needed for buildpacks.

#### Using SDKMAN

```bash
# Install SDKMAN if not already installed
curl -s "https://get.sdkman.io" | bash

# Install GraalVM
sdk install java 21.0.2-graal

# Verify installation
java -version
native-image --version
```

#### Using Homebrew (macOS)

```bash
brew install --cask graalvm-jdk

# Add to PATH
export PATH="/Library/Java/JavaVirtualMachines/graalvm-jdk-21/Contents/Home/bin:$PATH"

# Verify
native-image --version
```

#### Manual Installation

1. Download GraalVM from https://www.graalvm.org/downloads/
2. Extract to your preferred location
3. Set `JAVA_HOME` to the GraalVM directory
4. Add `$JAVA_HOME/bin` to your `PATH`

## Maven Configuration

Spring Boot 3.x includes the native build tools plugin in the parent POM. You just need to enable it.

### Basic Configuration

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>
    
    <groupId>com.example</groupId>
    <artifactId>my-app</artifactId>
    <version>1.0.0</version>
    
    <properties>
        <java.version>21</java.version>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.graalvm.buildtools</groupId>
                <artifactId>native-maven-plugin</artifactId>
            </plugin>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

### Advanced Native Build Options

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.graalvm.buildtools</groupId>
            <artifactId>native-maven-plugin</artifactId>
            <configuration>
                <imageName>${project.artifactId}</imageName>
                <mainClass>com.example.MyApplication</mainClass>
                <buildArgs>
                    <buildArg>--verbose</buildArg>
                    <buildArg>-H:+ReportExceptionStackTraces</buildArg>
                    <buildArg>--initialize-at-build-time=org.slf4j</buildArg>
                </buildArgs>
            </configuration>
        </plugin>
    </plugins>
</build>
```

### Profile for Native Builds

```xml
<profiles>
    <profile>
        <id>native</id>
        <build>
            <plugins>
                <plugin>
                    <groupId>org.graalvm.buildtools</groupId>
                    <artifactId>native-maven-plugin</artifactId>
                    <executions>
                        <execution>
                            <id>build-native</id>
                            <goals>
                                <goal>compile-no-fork</goal>
                            </goals>
                            <phase>package</phase>
                        </execution>
                    </executions>
                </plugin>
            </plugins>
        </build>
    </profile>
</profiles>
```

## Gradle Configuration

### Kotlin DSL

```kotlin
plugins {
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
    id("org.graalvm.buildtools.native") version "0.9.28"
    kotlin("jvm") version "1.9.22"
    kotlin("plugin.spring") version "1.9.22"
}

group = "com.example"
version = "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_21
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

graalvmNative {
    binaries {
        named("main") {
            imageName.set("my-app")
            mainClass.set("com.example.MyApplicationKt")
            buildArgs.add("--verbose")
            buildArgs.add("-H:+ReportExceptionStackTraces")
        }
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

### Groovy DSL

```groovy
plugins {
    id 'org.springframework.boot' version '3.2.0'
    id 'io.spring.dependency-management' version '1.1.4'
    id 'org.graalvm.buildtools.native' version '0.9.28'
    id 'java'
}

group = 'com.example'
version = '1.0.0'
sourceCompatibility = '21'

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

graalvmNative {
    binaries {
        main {
            imageName = 'my-app'
            mainClass = 'com.example.MyApplication'
            buildArgs.add '--verbose'
        }
    }
}

test {
    useJUnitPlatform()
}
```

## Building Native Images

Spring Boot provides three approaches to build native images. Choose based on your environment and needs.

### Option 1: Native Build Tools Plugin (Requires GraalVM)

Build a native executable directly on your machine. Requires GraalVM installed locally.

#### Maven

```bash
# Build native executable
mvn -Pnative native:compile

# The executable is created in target/
./target/my-app

# Clean and rebuild
mvn clean -Pnative native:compile

# Skip tests for faster builds
mvn -Pnative native:compile -DskipTests
```

#### Gradle

```bash
# Build native executable
./gradlew nativeCompile

# The executable is created in build/native/nativeCompile/
./build/native/nativeCompile/my-app

# Clean and rebuild
./gradlew clean nativeCompile

# Skip tests
./gradlew nativeCompile -x test
```

**When to use:** Local development, CI/CD with GraalVM installed

### Option 2: Cloud Native Buildpacks (No GraalVM Required)

Build a Docker container image with native executable. No GraalVM installation needed.

#### Maven

```bash
# Build container image
mvn -Pnative spring-boot:build-image

# With custom image name
mvn -Pnative spring-boot:build-image \
  -Dspring-boot.build-image.imageName=myregistry.io/my-app:1.0.0

# Run the container
docker run --rm -p 8080:8080 my-app:latest

# Check container size
docker images my-app
```

#### Gradle

```bash
# Build container image
./gradlew bootBuildImage

# With custom image name
./gradlew bootBuildImage \
  --imageName=myregistry.io/my-app:1.0.0

# Run the container
docker run --rm -p 8080:8080 my-app:latest
```

**Configuration in Maven:**

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <image>
            <name>myregistry.io/${project.artifactId}:${project.version}</name>
            <builder>paketobuildpacks/builder:tiny</builder>
            <env>
                <BP_NATIVE_IMAGE>true</BP_NATIVE_IMAGE>
                <BP_JVM_VERSION>21</BP_JVM_VERSION>
            </env>
        </image>
    </configuration>
</plugin>
```

**When to use:** Production deployments, CI/CD without GraalVM, consistent builds

### Option 3: Multi-Stage Dockerfile

Build native image in Docker with full control over the build environment.

```dockerfile
# Stage 1: Build native image
FROM ghcr.io/graalvm/native-image-community:21 AS builder

WORKDIR /app

# Copy Maven wrapper and pom.xml
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Download dependencies (cached layer)
RUN ./mvnw dependency:go-offline

# Copy source code
COPY src src

# Build native executable
RUN ./mvnw -Pnative native:compile -DskipTests

# Stage 2: Create runtime image
FROM gcr.io/distroless/base-debian12

WORKDIR /app

# Copy the native executable from builder stage
COPY --from=builder /app/target/my-app /app/my-app

# Expose port
EXPOSE 8080

# Run the native executable
ENTRYPOINT ["/app/my-app"]
```

**Build and run:**

```bash
# Build the Docker image
docker build -t my-app:native .

# Run the container
docker run --rm -p 8080:8080 my-app:native

# For ARM64 (Apple Silicon)
docker buildx build --platform linux/amd64 -t my-app:native .
```

**When to use:** Custom build configurations, specific base images, advanced scenarios

## Ahead-of-Time (AOT) Processing

Spring Boot 3.x performs AOT processing at build time to prepare your application for native compilation. This happens automatically but understanding it helps with troubleshooting.

### How AOT Works

1. **Build-Time Analysis**: Spring scans your application and generates:
   - Bean definitions
   - Configuration classes
   - Reflection hints
   - Resource hints
   - Proxy hints

2. **Generated Code**: AOT creates Java source files in `target/spring-aot/` (Maven) or `build/generated/aot/` (Gradle)

3. **Compilation**: Generated code is compiled and included in the native image

### AOT and Bean Configuration

Most Spring configurations work automatically with AOT:

```java
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {
    
    // AOT automatically detects this bean
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
    
    // Conditional beans work too
    @Bean
    @ConditionalOnProperty(name = "feature.enabled", havingValue = "true")
    public MyFeature myFeature() {
        return new MyFeature();
    }
}
```

### What AOT Cannot Handle

AOT cannot detect classes loaded dynamically at runtime:

```java
// ✗ This won't work in native image without hints
Class<?> clazz = Class.forName("com.example.DynamicClass");
Object instance = clazz.getDeclaredConstructor().newInstance();

// ✓ Use compile-time references instead
DynamicClass instance = new DynamicClass();
```

### Inspecting Generated AOT Code

```bash
# Maven - generated code location
ls target/spring-aot/main/sources/

# Gradle - generated code location
ls build/generated/aotSources/

# View generated application initializer
cat target/spring-aot/main/sources/com/example/MyApplication__ApplicationContextInitializer.java
```

## Reflection Hints

Native images require compile-time knowledge of all reflection usage. Spring Boot automatically handles most cases, but you may need to register hints for external libraries or dynamic scenarios.

### @RegisterReflectionForBinding

Use this for simple cases where you just need to register classes:

```java
import org.springframework.aot.hint.annotation.RegisterReflectionForBinding;
import org.springframework.context.annotation.Configuration;

@Configuration
@RegisterReflectionForBinding({
    ExternalApiResponse.class,
    ThirdPartyDto.class,
    AnotherClass.class
})
public class ReflectionConfig {
}
```

This registers the classes for:
- Constructor invocation
- Field access
- Method invocation

### RuntimeHintsRegistrar for Advanced Cases

For more control, implement `RuntimeHintsRegistrar`:

```java
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.aot.hint.MemberCategory;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;

@Configuration
@ImportRuntimeHints(MyRuntimeHints.class)
public class AppConfig {
}

public class MyRuntimeHints implements RuntimeHintsRegistrar {
    
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        // Register classes for reflection
        hints.reflection()
            .registerType(ExternalApiResponse.class, 
                MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
                MemberCategory.INVOKE_DECLARED_METHODS,
                MemberCategory.DECLARED_FIELDS);
        
        // Register specific methods
        hints.reflection()
            .registerType(ThirdPartyService.class, builder -> 
                builder.withMethod("processData", List.of(String.class), hint -> {})
            );
        
        // Register resources (e.g., templates, config files)
        hints.resources()
            .registerPattern("templates/*.html")
            .registerPattern("static/images/*")
            .registerPattern("application-*.yml");
        
        // Register JDK proxies
        hints.proxies()
            .registerJdkProxy(MyInterface.class, AnotherInterface.class);
        
        // Register serialization
        hints.serialization()
            .registerType(SerializableDto.class);
    }
}
```

### Common Reflection Scenarios

#### JSON Serialization with Jackson

```java
// Usually works automatically, but if not:
@RegisterReflectionForBinding({
    UserDto.class,
    OrderDto.class,
    // Register all DTOs used in REST endpoints
})
public class JacksonConfig {
}
```

#### Database Entities

```java
// JPA entities are automatically registered
// But if you have issues:
@RegisterReflectionForBinding({
    User.class,
    Order.class,
    // All entity classes
})
public class JpaConfig {
}
```

#### REST Template / WebClient

```java
// For response types from external APIs
@RegisterReflectionForBinding({
    GithubApiResponse.class,
    WeatherApiData.class
})
public class HttpClientConfig {
}
```

### Testing Reflection Hints

Run your application and check for reflection errors:

```bash
# Build and run native image
./target/my-app

# Watch for errors like:
# java.lang.ClassNotFoundException
# java.lang.NoSuchMethodException
# java.lang.IllegalAccessException
```

## Library Compatibility

Most popular Spring libraries work with native images, but some require configuration or have limitations.

### Fully Supported (No Configuration Needed)

| Library | Notes |
|---------|-------|
| **Spring Web MVC** | Full support, all features work |
| **Spring WebFlux** | Full reactive support |
| **Spring Data JPA** | With Hibernate 6.x |
| **Spring Data JDBC** | Full support |
| **Spring Data R2DBC** | Reactive database access |
| **Spring Security** | OAuth2, JWT, all auth methods |
| **Spring Cloud Function** | Serverless support |
| **Spring Actuator** | Health, metrics, info endpoints |
| **Micrometer** | Metrics and observability |
| **Logback** | Logging (default) |

### Works with Configuration

| Library | Configuration Needed |
|---------|---------------------|
| **Jackson** | Auto-configured for most cases; register DTOs if issues |
| **Spring Data MongoDB** | Requires reflection hints for document classes |
| **Spring Data Redis** | Register serialized classes |
| **Spring Kafka** | Register message payload classes |
| **Spring Cloud Config** | Client works, server needs hints |
| **Thymeleaf** | Register template resources |
| **FreeMarker** | Register template resources |

### Limited or No Support

| Library | Status |
|---------|--------|
| **Spring Data Neo4j** | Limited support, check compatibility |
| **Groovy** | Dynamic features don't work |
| **JRuby/Jython** | Not supported |
| **CGLIB proxies** | Use JDK proxies instead |
| **ByteBuddy** | Runtime bytecode generation not supported |

### Checking Library Compatibility

1. **Spring Boot Documentation**: https://docs.spring.io/spring-boot/docs/current/reference/html/native-image.html#native-image.advanced.known-limitations
2. **GraalVM Compatibility**: https://www.graalvm.org/native-image/libraries-and-frameworks/
3. **Test in Native Mode**: Always test your specific use case

### Common Library Issues and Solutions

#### Issue: Jackson Deserialization Fails

```java
// Solution: Register target classes
@RegisterReflectionForBinding({
    ApiResponse.class,
    ApiResponse.Data.class  // Nested classes too
})
```

#### Issue: JPA Query Methods Fail

```java
// Solution: Make sure entity is registered
@RegisterReflectionForBinding(MyEntity.class)
// Usually automatic, but explicit if needed
```

#### Issue: Template Engine Can't Find Templates

```java
// Solution: Register template resources
public class TemplateHints implements RuntimeHintsRegistrar {
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        hints.resources().registerPattern("templates/*.html");
    }
}
```

## Testing Native Images

Spring Boot 3.x provides native testing support to verify your application works in native mode.

### Regular Tests (JVM Mode)

Standard Spring Boot tests run on the JVM:

```java
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class MyApplicationTests {
    
    @Autowired
    private MyService myService;
    
    @Test
    void contextLoads() {
        assertThat(myService).isNotNull();
    }
    
    @Test
    void businessLogicWorks() {
        var result = myService.process("test");
        assertThat(result).isEqualTo("expected");
    }
}
```

### Native Tests

Native tests compile and run in a native image:

```bash
# Maven - run tests in native mode
mvn -PnativeTest test

# Gradle - run tests in native mode
./gradlew nativeTest
```

**Maven profile for native tests:**

```xml
<profiles>
    <profile>
        <id>nativeTest</id>
        <build>
            <plugins>
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                    <executions>
                        <execution>
                            <id>process-test-aot</id>
                            <goals>
                                <goal>process-test-aot</goal>
                            </goals>
                        </execution>
                    </executions>
                </plugin>
                <plugin>
                    <groupId>org.graalvm.buildtools</groupId>
                    <artifactId>native-maven-plugin</artifactId>
                    <executions>
                        <execution>
                            <id>native-test</id>
                            <goals>
                                <goal>test</goal>
                            </goals>
                        </execution>
                    </executions>
                </plugin>
            </plugins>
        </build>
    </profile>
</profiles>
```

### Conditional Test Execution

```java
import org.junit.jupiter.api.condition.DisabledInNativeImage;
import org.springframework.boot.test.context.SpringBootTest;
import org.junit.jupiter.api.Test;

@SpringBootTest
class ConditionalTests {
    
    @Test
    @DisabledInNativeImage  // Skip this test in native mode
    void jvmOnlyTest() throws ClassNotFoundException {
        // Test that uses features not available in native
        Class<?> clazz = Class.forName("com.example.DynamicClass");
    }
    
    @Test
    void runsInBothModes() {
        // Test that works in both JVM and native
    }
}
```

### Testing Strategy

1. **Unit Tests**: Run on JVM (fast feedback during development)
2. **Integration Tests**: Run on JVM for quick CI/CD
3. **Native Tests**: Run subset of critical tests in native mode
4. **Pre-Production**: Run full native test suite before release

**Example CI/CD workflow:**

```bash
# Fast feedback loop (JVM tests)
mvn test

# Before merge (native smoke tests)
mvn -PnativeTest test -Dtest=SmokeTest

# Before release (full native test suite)
mvn -PnativeTest test
```

## Troubleshooting

### 1. Missing Reflection Metadata

**Symptom:**
```
java.lang.ClassNotFoundException: com.example.MyClass
java.lang.NoSuchMethodException: com.example.MyClass.<init>()
```

**Cause:** Class or method used via reflection not registered for native image.

**Solution:**

```java
@Configuration
@RegisterReflectionForBinding(MyClass.class)
public class ReflectionConfig {
}

// Or for more control
public class MyRuntimeHints implements RuntimeHintsRegistrar {
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        hints.reflection().registerType(MyClass.class,
            MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
            MemberCategory.INVOKE_DECLARED_METHODS);
    }
}
```

### 2. Resource Not Found

**Symptom:**
```
java.io.FileNotFoundException: static/index.html
Resource not found: application-prod.yml
```

**Cause:** Classpath resources not registered for inclusion in native image.

**Solution:**

```java
public class ResourceHints implements RuntimeHintsRegistrar {
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        // Register specific files
        hints.resources().registerPattern("static/index.html");
        
        // Register pattern
        hints.resources().registerPattern("static/**");
        hints.resources().registerPattern("templates/*.html");
        hints.resources().registerPattern("application-*.yml");
    }
}

@Configuration
@ImportRuntimeHints(ResourceHints.class)
public class AppConfig {
}
```

### 3. Proxy Classes Not Available

**Symptom:**
```
com.oracle.svm.core.jdk.UnsupportedFeatureError: Proxy class defined by interfaces
```

**Cause:** JDK proxy created at runtime without registration.

**Solution:**

```java
public class ProxyHints implements RuntimeHintsRegistrar {
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        // Register JDK proxy
        hints.proxies().registerJdkProxy(
            MyInterface.class,
            AnotherInterface.class
        );
    }
}
```

### 4. Build Runs Out of Memory

**Symptom:**
```
Error: Image build request failed with exit status 137
java.lang.OutOfMemoryError: Java heap space
```

**Cause:** Native image build requires significant memory (4-8GB typical).

**Solution:**

```bash
# Maven - increase build memory
export MAVEN_OPTS="-Xmx8g"
mvn -Pnative native:compile

# Gradle - configure in gradle.properties
org.gradle.jvmargs=-Xmx8g

# Or in build args
./gradlew nativeCompile -Dorg.gradle.jvmargs=-Xmx8g

# Docker build - increase Docker memory
# Docker Desktop -> Settings -> Resources -> Memory -> 8GB
```

### 5. Slow Build Times

**Symptom:** Native image build takes 5-15 minutes.

**Cause:** Native compilation is CPU and memory intensive.

**Solutions:**

**Use buildpacks in CI/CD:**
```bash
# Buildpacks can be cached and parallelized
mvn -Pnative spring-boot:build-image
```

**Enable build cache (GraalVM 22.3+):**
```xml
<buildArg>--gc=G1</buildArg>
<buildArg>-march=compatibility</buildArg>
```

**Use fewer build agents in CI:**
```yaml
# Don't build native for every commit
# Build native only on:
# - Main branch
# - Pull request to main
# - Tagged releases
```

**Local development:**
```bash
# Skip native builds during development
mvn clean install -DskipTests

# Only build native before deployment
mvn -Pnative native:compile
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Native Image Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  native-build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up GraalVM
        uses: graalvm/setup-graalvm@v1
        with:
          java-version: '21'
          distribution: 'graalvm'
          github-token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Cache Maven packages
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
          restore-keys: ${{ runner.os }}-m2
      
      - name: Build native image
        run: mvn -Pnative native:compile -DskipTests
      
      - name: Run native tests
        run: mvn -PnativeTest test
      
      - name: Upload native executable
        uses: actions/upload-artifact@v3
        with:
          name: native-executable
          path: target/my-app

  # Alternative: Build with buildpacks (no GraalVM needed)
  buildpacks-build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      
      - name: Build container image
        run: mvn -Pnative spring-boot:build-image
      
      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Push image
        run: docker push my-app:latest
```

### GitLab CI

```yaml
build-native:
  image: ghcr.io/graalvm/jdk-community:21
  stage: build
  script:
    - ./mvnw -Pnative native:compile -DskipTests
  artifacts:
    paths:
      - target/my-app
    expire_in: 1 week
  cache:
    paths:
      - .m2/repository
  only:
    - main
    - tags

test-native:
  image: ghcr.io/graalvm/jdk-community:21
  stage: test
  script:
    - ./mvnw -PnativeTest test
  dependencies:
    - build-native
  only:
    - main
    - tags
```

### Docker Build in CI

```yaml
build-docker:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t my-app:native .
    - docker push myregistry.io/my-app:native
  only:
    - main
```

## Production Considerations

### Pre-Deployment Checklist

Before deploying native images to production:

- [ ] **Test all endpoints** in native mode (not just JVM)
- [ ] **Verify reflection hints** for all dynamic code paths
- [ ] **Check resource loading** (templates, config files, static assets)
- [ ] **Monitor startup time** - should be <200ms for most apps
- [ ] **Monitor memory usage** - should be 50-70% less than JVM
- [ ] **Test with production data volumes** - some operations may be slower
- [ ] **Configure health checks** with appropriate timeouts for fast startup
- [ ] **Set container resources** appropriately (less memory needed than JVM)
- [ ] **Test error scenarios** - ensure error handling works in native mode
- [ ] **Verify logging** - check log levels and output format

### Health Check Configuration

Native apps start quickly, but health checks should account for dependencies:

```yaml
# Kubernetes liveness probe
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  initialDelaySeconds: 1  # Much faster than JVM (was 30s)
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3

# Readiness probe
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
  initialDelaySeconds: 1
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Resource Limits

Native images need less memory than JVM:

```yaml
# Kubernetes resources
resources:
  requests:
    memory: "128Mi"   # Much less than JVM (was 512Mi)
    cpu: "100m"
  limits:
    memory: "256Mi"   # Much less than JVM (was 1Gi)
    cpu: "500m"
```

### Monitoring and Observability

```java
// Spring Boot Actuator works with native images
implementation("org.springframework.boot:spring-boot-starter-actuator")
implementation("io.micrometer:micrometer-registry-prometheus")
```

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

### Performance Characteristics

| Aspect | JVM | Native | Notes |
|--------|-----|--------|-------|
| Startup | Slow (2-10s) | Fast (50-200ms) | Native wins |
| Memory | High (200-500MB) | Low (50-100MB) | Native wins |
| Throughput (cold) | Slow (warmup) | Fast (immediate) | Native wins |
| Throughput (hot) | Excellent | Good | JVM can be better |
| Latency (P99) | Variable | Consistent | Native more predictable |

**Recommendation:** Native is excellent for most workloads. Consider JVM only if:
- You need absolute maximum throughput
- Application runs for days/weeks without restart
- Heavy use of JIT-optimizable code

### Rollback Strategy

Always maintain ability to rollback to JVM version:

```bash
# Build both JVM and native images
mvn clean package  # JVM jar
mvn -Pnative spring-boot:build-image  # Native container

# Tag appropriately
docker tag my-app:latest my-app:1.0.0-jvm
docker tag my-app:native my-app:1.0.0-native

# Deploy native, but keep JVM ready
kubectl set image deployment/my-app container=my-app:1.0.0-native

# Quick rollback if issues
kubectl set image deployment/my-app container=my-app:1.0.0-jvm
```

## Best Practices

### 1. Start with Buildpacks

Use Cloud Native Buildpacks for your first native image:

```bash
# Easiest way to get started
mvn -Pnative spring-boot:build-image
```

Benefits:
- No GraalVM installation needed
- Consistent builds across environments
- Production-ready container images
- Automatic updates to latest buildpack features

### 2. Test Incrementally

Don't wait until production to test native mode:

1. **Development**: Run on JVM for fast iteration
2. **PR Review**: Build native image, run smoke tests
3. **Staging**: Full native test suite
4. **Production**: Deploy with confidence

### 3. Monitor Build Times

Track native build times in CI/CD:

```bash
# Add timing to builds
time mvn -Pnative native:compile

# Typical times:
# Small app (< 10 dependencies): 2-4 minutes
# Medium app (10-30 dependencies): 4-8 minutes
# Large app (30+ dependencies): 8-15 minutes
```

If builds are too slow:
- Use buildpacks with caching
- Build native only on main branch
- Consider JVM for development branches

### 4. Document Reflection Hints

When adding reflection hints, document why:

```java
// Register external API response classes
// These are deserialized from JSON in ExternalApiClient
@RegisterReflectionForBinding({
    GithubApiResponse.class,    // Used in GithubClient.getUser()
    WeatherData.class           // Used in WeatherClient.getForecast()
})
public class ReflectionConfig {
}
```

### 5. Version Your Native Images

Tag images with version and type:

```bash
# Good versioning scheme
myregistry.io/my-app:1.0.0-native
myregistry.io/my-app:1.0.0-jvm
myregistry.io/my-app:1.0.0-native-arm64
```

## Related Documentation

- [Spring Boot Configuration](../configuration/README.md)
- [Testing Standards](../testing/README.md)
- [Event-Driven Architecture](../../guides/architecture/Event-Driven-Architecture.md)

## External Resources

- [Spring Boot GraalVM Native Image Support](https://docs.spring.io/spring-boot/docs/current/reference/html/native-image.html)
- [GraalVM Native Image Documentation](https://www.graalvm.org/latest/reference-manual/native-image/)
- [Spring AOT Documentation](https://docs.spring.io/spring-framework/reference/core/aot.html)
- [Native Build Tools](https://graalvm.github.io/native-build-tools/latest/index.html)
- [Spring Native Image Samples](https://github.com/spring-projects/spring-aot-smoke-tests)

## Navigation

- [← Back to Spring Documentation](../README.md)
- [Configuration →](../configuration/README.md)
- [Testing →](../testing/README.md)
