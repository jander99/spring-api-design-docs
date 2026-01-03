# OAuth Client Integration Testing

## Overview

OAuth client integration testing verifies authentication flows with external identity providers. These tests ensure your application correctly obtains access tokens, refreshes expired tokens, and handles authentication failures using tools like WireMock to simulate OAuth servers.

## Core Principles

1. **Simulate Auth Servers**: Use WireMock to mock OAuth/OIDC providers
2. **Test Token Lifecycle**: Verify token acquisition, refresh, and expiration
3. **Test Grant Types**: Cover client credentials, authorization code, and refresh token flows
4. **Test Error Handling**: Verify handling of authentication failures
5. **Verify Token Usage**: Ensure tokens are correctly included in API requests

## Basic OAuth Client Testing

### Client Credentials Flow

```java
@SpringBootTest
class OAuthClientIntegrationTest {

    @RegisterExtension
    static WireMockExtension authServer = WireMockExtension.newInstance()
        .options(wireMockConfig().port(8090))
        .build();

    @TestConfiguration
    static class TestConfig {
        @Bean
        @Primary
        public OAuth2AuthorizedClientManager authorizedClientManager() {
            // Configure OAuth client to use WireMock auth server
            return new AuthorizedClientServiceOAuth2AuthorizedClientManager(
                clientRegistrationRepository(), 
                authorizedClientService()
            );
        }
    }

    @Autowired
    private ExternalApiClient externalApiClient;

    @Test
    void shouldObtainAccessTokenViaClientCredentials() {
        // Given
        authServer.stubFor(post(urlEqualTo("/oauth/token"))
            .withRequestBody(containing("grant_type=client_credentials"))
            .withRequestBody(containing("client_id=test-client"))
            .withRequestBody(containing("client_secret=test-secret"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "access_token": "access-token-123",
                        "token_type": "Bearer",
                        "expires_in": 3600,
                        "scope": "read write"
                    }
                    """)));

        authServer.stubFor(get(urlEqualTo("/api/users/profile"))
            .withHeader("Authorization", equalTo("Bearer access-token-123"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "id": "user-123",
                        "name": "John Doe",
                        "email": "john@example.com"
                    }
                    """)));

        // When
        UserProfile profile = externalApiClient.getUserProfile("user-123");

        // Then
        assertThat(profile.getId()).isEqualTo("user-123");
        assertThat(profile.getName()).isEqualTo("John Doe");
        
        // Verify OAuth flow
        authServer.verify(postRequestedFor(urlEqualTo("/oauth/token")));
        authServer.verify(getRequestedFor(urlEqualTo("/api/users/profile"))
            .withHeader("Authorization", equalTo("Bearer access-token-123")));
    }

    @Test
    void shouldHandleTokenRequestFailure() {
        // Given
        authServer.stubFor(post(urlEqualTo("/oauth/token"))
            .willReturn(aResponse()
                .withStatus(401)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "error": "invalid_client",
                        "error_description": "Client authentication failed"
                    }
                    """)));

        // When & Then
        assertThrows(OAuth2AuthorizationException.class,
            () -> externalApiClient.getUserProfile("user-123"));
    }
}
```

## Testing Token Refresh

### Automatic Token Refresh

```java
@Test
void shouldRefreshExpiredToken() {
    // Given
    // First token request returns short-lived token
    authServer.stubFor(post(urlEqualTo("/oauth/token"))
        .inScenario("token-lifecycle")
        .whenScenarioStateIs(Scenario.STARTED)
        .willReturn(aResponse()
            .withStatus(200)
            .withHeader("Content-Type", "application/json")
            .withBody("""
                {
                    "access_token": "short-lived-token",
                    "token_type": "Bearer",
                    "expires_in": 1,
                    "refresh_token": "refresh-token-123"
                }
                """))
        .willSetStateTo("token-issued"));

    // API call with expired token returns 401
    authServer.stubFor(get(urlEqualTo("/api/users/profile"))
        .withHeader("Authorization", equalTo("Bearer short-lived-token"))
        .willReturn(aResponse().withStatus(401)));

    // Token refresh request
    authServer.stubFor(post(urlEqualTo("/oauth/token"))
        .inScenario("token-lifecycle")
        .whenScenarioStateIs("token-issued")
        .withRequestBody(containing("grant_type=refresh_token"))
        .withRequestBody(containing("refresh_token=refresh-token-123"))
        .willReturn(aResponse()
            .withStatus(200)
            .withHeader("Content-Type", "application/json")
            .withBody("""
                {
                    "access_token": "new-access-token",
                    "token_type": "Bearer",
                    "expires_in": 3600
                }
                """))
        .willSetStateTo("token-refreshed"));

    // API call with new token succeeds
    authServer.stubFor(get(urlEqualTo("/api/users/profile"))
        .withHeader("Authorization", equalTo("Bearer new-access-token"))
        .willReturn(aResponse()
            .withStatus(200)
            .withHeader("Content-Type", "application/json")
            .withBody("""
                {
                    "id": "user-123",
                    "name": "John Doe"
                }
                """)));

    // When
    Thread.sleep(2000); // Wait for token to expire
    UserProfile profile = externalApiClient.getUserProfile("user-123");

    // Then
    assertThat(profile.getId()).isEqualTo("user-123");
    
    // Verify token refresh flow
    authServer.verify(2, postRequestedFor(urlEqualTo("/oauth/token")));
    authServer.verify(getRequestedFor(urlEqualTo("/api/users/profile"))
        .withHeader("Authorization", equalTo("Bearer new-access-token")));
}

@Test
void shouldHandleRefreshTokenExpiration() {
    // Given
    authServer.stubFor(post(urlEqualTo("/oauth/token"))
        .withRequestBody(containing("grant_type=refresh_token"))
        .willReturn(aResponse()
            .withStatus(400)
            .withHeader("Content-Type", "application/json")
            .withBody("""
                {
                    "error": "invalid_grant",
                    "error_description": "Refresh token has expired"
                }
                """)));

    // When & Then
    assertThrows(OAuth2AuthorizationException.class,
        () -> externalApiClient.refreshAndRetry());
}
```

## Testing Authorization Code Flow

### Authorization Code Exchange

```java
@Test
void shouldExchangeAuthorizationCodeForToken() {
    // Given
    String authorizationCode = "auth-code-123";
    String codeVerifier = "test-code-verifier";

    authServer.stubFor(post(urlEqualTo("/oauth/token"))
        .withRequestBody(containing("grant_type=authorization_code"))
        .withRequestBody(containing("code=" + authorizationCode))
        .withRequestBody(containing("code_verifier=" + codeVerifier))
        .withRequestBody(containing("redirect_uri=http://localhost:8080/callback"))
        .willReturn(aResponse()
            .withStatus(200)
            .withHeader("Content-Type", "application/json")
            .withBody("""
                {
                    "access_token": "access-token-456",
                    "token_type": "Bearer",
                    "expires_in": 3600,
                    "refresh_token": "refresh-token-456",
                    "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
                }
                """)));

    // When
    OAuth2AccessTokenResponse tokenResponse = oauthClient.exchangeAuthorizationCode(
        authorizationCode,
        codeVerifier
    );

    // Then
    assertThat(tokenResponse.getAccessToken().getTokenValue()).isEqualTo("access-token-456");
    assertThat(tokenResponse.getRefreshToken().getTokenValue()).isEqualTo("refresh-token-456");
    
    authServer.verify(postRequestedFor(urlEqualTo("/oauth/token"))
        .withRequestBody(containing("code=" + authorizationCode)));
}

@Test
void shouldHandleInvalidAuthorizationCode() {
    // Given
    authServer.stubFor(post(urlEqualTo("/oauth/token"))
        .willReturn(aResponse()
            .withStatus(400)
            .withHeader("Content-Type", "application/json")
            .withBody("""
                {
                    "error": "invalid_grant",
                    "error_description": "Invalid authorization code"
                }
                """)));

    // When & Then
    assertThrows(OAuth2AuthorizationException.class,
        () -> oauthClient.exchangeAuthorizationCode("invalid-code", "verifier"));
}
```

## Testing Token Validation

### JWT Token Validation

```java
@Test
void shouldValidateJwtToken() {
    // Given
    String jwksJson = """
        {
            "keys": [
                {
                    "kty": "RSA",
                    "kid": "key-1",
                    "use": "sig",
                    "n": "...",
                    "e": "AQAB"
                }
            ]
        }
        """;

    authServer.stubFor(get(urlEqualTo("/.well-known/jwks.json"))
        .willReturn(aResponse()
            .withStatus(200)
            .withHeader("Content-Type", "application/json")
            .withBody(jwksJson)));

    String validJwt = createTestJwt("key-1", Map.of(
        "sub", "user-123",
        "scope", "read write",
        "exp", Instant.now().plusSeconds(3600).getEpochSecond()
    ));

    // When
    Jwt decodedJwt = jwtDecoder.decode(validJwt);

    // Then
    assertThat(decodedJwt.getSubject()).isEqualTo("user-123");
    assertThat(decodedJwt.getClaimAsStringList("scope")).contains("read", "write");
}

@Test
void shouldRejectExpiredToken() {
    // Given
    String expiredJwt = createTestJwt("key-1", Map.of(
        "sub", "user-123",
        "exp", Instant.now().minusSeconds(3600).getEpochSecond() // Expired
    ));

    // When & Then
    assertThrows(JwtException.class, () -> jwtDecoder.decode(expiredJwt));
}

@Test
void shouldRejectTokenWithInvalidSignature() {
    // Given
    String tamperedJwt = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature";

    // When & Then
    assertThrows(JwtException.class, () -> jwtDecoder.decode(tamperedJwt));
}
```

## OAuth Testing Best Practices

### 1. Test Complete Token Lifecycle

```java
// Good: Test acquisition, usage, refresh, and expiration
@Test
void shouldHandleCompleteTokenLifecycle() {
    // Obtain initial token
    testTokenAcquisition();
    
    // Use token for API calls
    testTokenUsage();
    
    // Refresh expired token
    testTokenRefresh();
    
    // Handle refresh token expiration
    testRefreshTokenExpiration();
}

// Bad: Only test token acquisition
@Test
void shouldGetToken() {
    OAuth2AccessToken token = oauthClient.getToken();
    assertThat(token).isNotNull();
}
```

### 2. Verify OAuth Request Parameters

```java
// Good: Verify all required OAuth parameters
authServer.verify(postRequestedFor(urlEqualTo("/oauth/token"))
    .withRequestBody(containing("grant_type=client_credentials"))
    .withRequestBody(containing("client_id=test-client"))
    .withRequestBody(containing("client_secret=test-secret"))
    .withRequestBody(containing("scope=read write"))
    .withHeader("Content-Type", equalTo("application/x-www-form-urlencoded")));

// Bad: Only verify endpoint was called
authServer.verify(postRequestedFor(urlEqualTo("/oauth/token")));
```

### 3. Test Error Responses

```java
// Good: Test various OAuth error scenarios
@Test
void shouldHandleOAuthErrors() {
    testInvalidClient();
    testInvalidGrant();
    testUnauthorizedClient();
    testUnsupportedGrantType();
}

private void testInvalidClient() {
    authServer.stubFor(post(urlEqualTo("/oauth/token"))
        .willReturn(aResponse()
            .withStatus(401)
            .withBody("""
                {
                    "error": "invalid_client",
                    "error_description": "Client authentication failed"
                }
                """)));
    
    assertThrows(OAuth2AuthorizationException.class,
        () -> oauthClient.getToken());
}
```

### 4. Use Realistic Token Expiration

```java
// Good: Use realistic token expiration times
authServer.stubFor(post(urlEqualTo("/oauth/token"))
    .willReturn(aResponse()
        .withBody("""
            {
                "access_token": "token",
                "expires_in": 3600
            }
            """)));

// Bad: Use unrealistic expiration times
authServer.stubFor(post(urlEqualTo("/oauth/token"))
    .willReturn(aResponse()
        .withBody("""
            {
                "access_token": "token",
                "expires_in": 999999999
            }
            """)));
```

### 5. Test Concurrent Token Requests

```java
@Test
void shouldHandleConcurrentTokenRequests() throws InterruptedException {
    // Given
    int threadCount = 10;
    CountDownLatch latch = new CountDownLatch(threadCount);
    List<OAuth2AccessToken> tokens = new CopyOnWriteArrayList<>();

    // When
    ExecutorService executor = Executors.newFixedThreadPool(threadCount);
    for (int i = 0; i < threadCount; i++) {
        executor.submit(() -> {
            try {
                tokens.add(oauthClient.getToken());
            } finally {
                latch.countDown();
            }
        });
    }

    // Then
    assertThat(latch.await(10, TimeUnit.SECONDS)).isTrue();
    assertThat(tokens).hasSize(threadCount);
    
    // Verify only one token request was made (token should be cached)
    authServer.verify(1, postRequestedFor(urlEqualTo("/oauth/token")));
}
```

## Related Documentation

- [Integration Testing Fundamentals](integration-testing-fundamentals.md) - Core integration testing principles
- [WireMock Testing](wiremock-testing.md) - HTTP service mocking patterns
- [Security Testing](../../security/security-testing.md) - Comprehensive security testing strategies
- [OAuth 2.1 Resource Server](../../security/oauth2-resource-server.md) - OAuth resource server configuration
- [Security Standards](../../../../guides/api-design/security/security-standards.md) - API security best practices
