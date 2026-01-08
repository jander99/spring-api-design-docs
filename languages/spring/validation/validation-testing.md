# Validation Testing

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 8 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Validation fundamentals, Custom validators  
> **🎯 Key Topics:** Unit Testing Validators, Integration Testing, JSON Schema Testing
> 
> **📊 Complexity:** Intermediate technical content

## Overview

This guide shows how to test validation logic in Spring Boot. You will learn three testing types: unit tests for custom validators, integration tests for controller validation, and schema validation tests.

**Prerequisite**: First read [Validation Fundamentals](validation-fundamentals.md), [Custom Validators](custom-validators.md), and [Advanced Validation](advanced-validation.md).

## Unit Testing Custom Validators

Custom validators need thorough testing. Test each validator alone before testing it in controllers.

### Testing Field-Level Validators

Test validators that check single fields.

```java
package com.example.common.validation;

import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class OrderDateValidatorTest {
    
    private OrderDateValidator validator;
    
    @Mock
    private ConstraintValidatorContext context;
    
    @BeforeEach
    void setUp() {
        validator = new OrderDateValidator();
        
        // Initialize with default 24 hours
        ValidOrderDate annotation = new ValidOrderDate() {
            @Override
            public Class<? extends java.lang.annotation.Annotation> 
                    annotationType() {
                return ValidOrderDate.class;
            }
            
            @Override
            public String message() {
                return "Order date must be at least 24 hours in the future";
            }
            
            @Override
            public Class<?>[] groups() {
                return new Class[0];
            }
            
            @Override
            public Class<? extends jakarta.validation.Payload>[] payload() {
                return new Class[0];
            }
            
            @Override
            public int minHoursInFuture() {
                return 24;
            }
        };
        
        validator.initialize(annotation);
    }
    
    @Test
    void shouldReturnTrue_WhenDateIsBeyondMinimumHours() {
        // Given
        LocalDateTime futureDate = LocalDateTime.now().plusHours(25);
        
        // When
        boolean result = validator.isValid(futureDate, context);
        
        // Then
        assertThat(result).isTrue();
    }
    
    @Test
    void shouldReturnFalse_WhenDateIsBeforeMinimumHours() {
        // Given
        LocalDateTime tooSoon = LocalDateTime.now().plusHours(23);
        
        // When
        boolean result = validator.isValid(tooSoon, context);
        
        // Then
        assertThat(result).isFalse();
    }
    
    @Test
    void shouldReturnTrue_WhenDateIsNull() {
        // Given
        LocalDateTime nullDate = null;
        
        // When
        boolean result = validator.isValid(nullDate, context);
        
        // Then
        assertThat(result).isTrue();
    }
    
    @Test
    void shouldReturnFalse_WhenDateIsInPast() {
        // Given
        LocalDateTime pastDate = LocalDateTime.now().minusHours(1);
        
        // When
        boolean result = validator.isValid(pastDate, context);
        
        // Then
        assertThat(result).isFalse();
    }
}
```

### Testing Cross-Field Validators

Test validators that compare two or more fields.

```java
package com.example.common.validation;

import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class DateRangeValidatorTest {
    
    private DateRangeValidator validator;
    
    @Mock
    private ConstraintValidatorContext context;
    
    @BeforeEach
    void setUp() {
        validator = new DateRangeValidator();
        
        ValidDateRange annotation = new ValidDateRange() {
            @Override
            public Class<? extends java.lang.annotation.Annotation> 
                    annotationType() {
                return ValidDateRange.class;
            }
            
            @Override
            public String message() {
                return "End date must be after start date";
            }
            
            @Override
            public Class<?>[] groups() {
                return new Class[0];
            }
            
            @Override
            public Class<? extends jakarta.validation.Payload>[] payload() {
                return new Class[0];
            }
            
            @Override
            public String startField() {
                return "startDate";
            }
            
            @Override
            public String endField() {
                return "endDate";
            }
        };
        
        validator.initialize(annotation);
    }
    
    @Test
    void shouldReturnTrue_WhenEndDateIsAfterStartDate() {
        // Given
        ReportRequest request = new ReportRequest();
        request.setStartDate(LocalDate.of(2024, 1, 1));
        request.setEndDate(LocalDate.of(2024, 1, 31));
        
        // When
        boolean result = validator.isValid(request, context);
        
        // Then
        assertThat(result).isTrue();
    }
    
    @Test
    void shouldReturnFalse_WhenEndDateIsBeforeStartDate() {
        // Given
        ReportRequest request = new ReportRequest();
        request.setStartDate(LocalDate.of(2024, 1, 31));
        request.setEndDate(LocalDate.of(2024, 1, 1));
        
        // When
        boolean result = validator.isValid(request, context);
        
        // Then
        assertThat(result).isFalse();
    }
    
    @Test
    void shouldReturnTrue_WhenEitherDateIsNull() {
        // Given
        ReportRequest request = new ReportRequest();
        request.setStartDate(null);
        request.setEndDate(LocalDate.of(2024, 1, 31));
        
        // When
        boolean result = validator.isValid(request, context);
        
        // Then - Let @NotNull handle null values
        assertThat(result).isTrue();
    }
}
```

## Integration Testing Controller Validation

Controllers validate requests before processing them. Test that invalid requests return the right error responses.

### Testing Request Validation

Use MockMvc to send HTTP requests to your controller.

```java
package com.example.orders.api;

import com.example.orders.application.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrderController.class)
class OrderControllerValidationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    void shouldReturnBadRequest_WhenRequiredFieldsAreMissing() 
            throws Exception {
        // Given
        CreateOrderRequest request = new CreateOrderRequest();
        // All required fields are null
        
        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type").value(
                "https://api.example.com/problems/validation-error"))
            .andExpect(jsonPath("$.title").value("Request Validation Failed"))
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.errors").isArray())
            .andExpect(jsonPath("$.errors[?(@.field == 'customerId')]").exists())
            .andExpect(jsonPath("$.errors[?(@.field == 'items')]").exists())
            .andExpect(jsonPath("$.errors[?(@.field == 'shippingAddress')]")
                .exists());
    }
    
    @Test
    void shouldReturnBadRequest_WhenNestedValidationFails() throws Exception {
        // Given
        CreateOrderRequest request = new CreateOrderRequest();
        request.setCustomerId(UUID.randomUUID());
        request.setShippingAddress(new CreateOrderRequest.AddressRequest());
        
        CreateOrderRequest.OrderItemRequest invalidItem = 
            new CreateOrderRequest.OrderItemRequest();
        invalidItem.setProductId(UUID.randomUUID());
        invalidItem.setQuantity(0); // Invalid: must be at least 1
        
        request.setItems(Collections.singletonList(invalidItem));
        
        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[?(@.field == 'items[0].quantity')]")
                .exists())
            .andExpect(jsonPath("$.errors[?(@.field == 'items[0].quantity')]" +
                ".message").value("Quantity must be at least 1"));
    }
    
    @Test
    void shouldReturnBadRequest_WhenPatternValidationFails() 
            throws Exception {
        // Given
        CreateOrderRequest request = new CreateOrderRequest();
        request.setCustomerId(UUID.randomUUID());
        
        CreateOrderRequest.AddressRequest address = 
            new CreateOrderRequest.AddressRequest();
        address.setStreet("123 Main St");
        address.setCity("Springfield");
        address.setState("INVALID"); // Invalid: must be 2-letter state code
        address.setZipCode("12345");
        
        request.setShippingAddress(address);
        request.setItems(Collections.singletonList(createValidItem()));
        
        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[?(@.field == 'shippingAddress.state')]")
                .exists());
    }
    
    private CreateOrderRequest.OrderItemRequest createValidItem() {
        CreateOrderRequest.OrderItemRequest item = 
            new CreateOrderRequest.OrderItemRequest();
        item.setProductId(UUID.randomUUID());
        item.setQuantity(1);
        item.setUnitPrice(new java.math.BigDecimal("19.99"));
        return item;
    }
}
```

### Testing Validation Groups

Different rules apply for create and update operations. Test that each operation enforces its own rules.

```java
@WebMvcTest(CustomerController.class)
class CustomerControllerValidationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @MockBean
    private CustomerService customerService;
    
    @Test
    void shouldRejectId_WhenCreatingCustomer() throws Exception {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setId(UUID.randomUUID()); // Invalid for creation
        request.setName("John Doe");
        request.setEmail("john@example.com");
        
        // When & Then
        mockMvc.perform(post("/v1/customers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[?(@.field == 'id')]").exists())
            .andExpect(jsonPath("$.errors[?(@.field == 'id')].message")
                .value("ID must be null when creating a customer"));
    }
    
    @Test
    void shouldRequireId_WhenUpdatingCustomer() throws Exception {
        // Given
        UUID customerId = UUID.randomUUID();
        CustomerRequest request = new CustomerRequest();
        // ID is null - invalid for update
        request.setName("John Doe");
        request.setEmail("john@example.com");
        
        // When & Then
        mockMvc.perform(put("/v1/customers/" + customerId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[?(@.field == 'id')]").exists())
            .andExpect(jsonPath("$.errors[?(@.field == 'id')].message")
                .value("ID is required when updating a customer"));
    }
}
```

## Testing JSON Schema Validation

JSON schemas define the shape and constraints of data. Test that your schema validator works correctly.

### Unit Testing JSON Schema Validator

Test the validator with valid and invalid data.

```java
package com.example.common.validation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JsonSchemaValidatorTest {
    
    private JsonSchemaValidator validator;
    private ObjectMapper objectMapper;
    
    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        validator = new JsonSchemaValidator(objectMapper);
    }
    
    @Test
    void shouldPassValidation_WhenPayloadMatchesSchema() {
        // Given
        OrderCreationDto validOrder = OrderCreationDto.builder()
            .customerId(UUID.randomUUID())
            .items(Collections.singletonList(createValidItem()))
            .shippingAddress(createValidAddress())
            .build();
        
        // When & Then
        // Should not throw exception
        validator.validate(validOrder, "schemas/order-v1.json");
    }
    
    @Test
    void shouldFailValidation_WhenRequiredFieldMissing() {
        // Given
        OrderCreationDto invalidOrder = OrderCreationDto.builder()
            .items(Collections.singletonList(createValidItem()))
            .shippingAddress(createValidAddress())
            // Missing customerId
            .build();
        
        // When & Then
        assertThatThrownBy(() -> 
            validator.validate(invalidOrder, "schemas/order-v1.json"))
            .isInstanceOf(JsonSchemaValidationException.class)
            .hasMessageContaining("customerId");
    }
    
    @Test
    void shouldFailValidation_WhenFieldTypeIsWrong() {
        // Given - Create invalid payload as a Map to bypass type checking
        Map<String, Object> invalidOrder = new HashMap<>();
        invalidOrder.put("customerId", 12345); // Wrong type: should be UUID
        invalidOrder.put("items", Collections.singletonList(createValidItem()));
        invalidOrder.put("shippingAddress", createValidAddress());
        
        // When & Then
        assertThatThrownBy(() -> 
            validator.validate(invalidOrder, "schemas/order-v1.json"))
            .isInstanceOf(JsonSchemaValidationException.class);
    }
    
    @Test
    void shouldFailValidation_WhenConstraintViolated() {
        // Given
        OrderItemDto invalidItem = OrderItemDto.builder()
            .productId(UUID.randomUUID())
            .quantity(0) // Invalid: must be at least 1
            .unitPrice(new java.math.BigDecimal("19.99"))
            .build();
        
        OrderCreationDto invalidOrder = OrderCreationDto.builder()
            .customerId(UUID.randomUUID())
            .items(Collections.singletonList(invalidItem))
            .shippingAddress(createValidAddress())
            .build();
        
        // When & Then
        assertThatThrownBy(() -> 
            validator.validate(invalidOrder, "schemas/order-v1.json"))
            .isInstanceOf(JsonSchemaValidationException.class)
            .satisfies(ex -> {
                JsonSchemaValidationException schemaEx = 
                    (JsonSchemaValidationException) ex;
                assertThat(schemaEx.getValidationErrors())
                    .anyMatch(msg -> msg.contains("quantity"));
            });
    }
    
    private OrderItemDto createValidItem() {
        return OrderItemDto.builder()
            .productId(UUID.randomUUID())
            .quantity(1)
            .unitPrice(new java.math.BigDecimal("19.99"))
            .build();
    }
    
    private AddressDto createValidAddress() {
        return AddressDto.builder()
            .street("123 Main St")
            .city("Springfield")
            .state("IL")
            .zipCode("62701")
            .build();
    }
}
```

## Best Practices

### 1. Test All Validation Paths

Test these cases for each rule:
- Valid input
- Null values
- Empty values
- Boundary conditions
- Nested objects
- Pattern matches

```java
@Test
void shouldValidateAllConstraints() {
    // Test valid input
    // Test null values
    // Test empty values
    // Test boundary conditions
    // Test nested validation
    // Test pattern matching
}
```

### 2. Use Descriptive Test Names

Write names that explain what the test checks:

```java
@Test
void shouldReturnBadRequest_WhenCustomerIdIsNull() { }

@Test
void shouldReturnBadRequest_WhenQuantityIsZero() { }

@Test
void shouldReturnBadRequest_WhenZipCodeFormatIsInvalid() { }
```

### 3. Test Error Response Format

Check that errors follow RFC 9457 format:

```java
@Test
void shouldReturnRfc7807ErrorResponse_WhenValidationFails() throws Exception {
    mockMvc.perform(post("/v1/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .content(invalidRequest))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").exists())
        .andExpect(jsonPath("$.title").exists())
        .andExpect(jsonPath("$.status").value(400))
        .andExpect(jsonPath("$.errors").isArray());
}
```

### 4. Test Nested Objects

Make sure validation works on nested fields:

```java
@Test
void shouldValidateNestedObjects() throws Exception {
    CreateOrderRequest request = new CreateOrderRequest();
    request.setCustomerId(UUID.randomUUID());
    
    // Invalid nested address
    CreateOrderRequest.AddressRequest invalidAddress = 
        new CreateOrderRequest.AddressRequest();
    // Missing required fields
    request.setShippingAddress(invalidAddress);
    
    mockMvc.perform(post("/v1/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[?(@.field =~ /shippingAddress.*/)]")
            .isNotEmpty());
}
```

### 5. Separate Unit and Integration Tests

Unit tests run fast and test validators alone:

```java
// Unit test - fast, focused
@Test
void validatorShouldRejectInvalidDate() {
    LocalDateTime invalidDate = LocalDateTime.now().plusHours(12);
    assertThat(validator.isValid(invalidDate, context)).isFalse();
}
```

Integration tests verify the full flow:

```java
// Integration test - comprehensive
@Test
void controllerShouldRejectInvalidRequest() throws Exception {
    mockMvc.perform(post("/v1/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .content(invalidRequest))
        .andExpect(status().isBadRequest());
}
```

## Related Documentation

**Spring guides:**
- [Validation Fundamentals](validation-fundamentals.md) — Learn Bean Validation basics
- [Custom Validators](custom-validators.md) — Build your own rules
- [Advanced Validation](advanced-validation.md) — Use JSON Schema
- [Controller Testing](../testing/integration-testing/controller-testing.md) — Test HTTP endpoints
- [Unit Testing Best Practices](../testing/unit-testing/unit-testing-best-practices.md) — Write good tests

**Design theory:**
- [Schema Testing](../../../guides/api-design/testing/schema-testing.md) — Test schemas
- [Advanced Schema Design](../../../guides/api-design/request-response/advanced-schema-design.md) — Schema patterns
