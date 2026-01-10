package com.example.order.grpc;

import com.example.order.domain.OrderEntity;
import com.example.order.repository.OrderRepository;
import com.example.order.service.OrderService;
import com.google.protobuf.Empty;
import io.grpc.Status;
import io.grpc.stub.ServerCallStreamObserver;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Production-ready gRPC service implementation for Order management.
 * 
 * Features:
 * - CRUD operations (Get, Create, Update, Delete, List)
 * - Server streaming for large result sets
 * - Client streaming for batch operations
 * - Authentication and authorization
 * - Error handling with proper status codes
 * - Validation
 * - Idempotency support
 * - Pagination
 */
@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(OrderServiceImpl.class);
    
    private final OrderService orderService;
    private final OrderRepository orderRepository;

    @Autowired
    public OrderServiceImpl(OrderService orderService, OrderRepository orderRepository) {
        this.orderService = orderService;
        this.orderRepository = orderRepository;
    }

    // ========== Unary Operations ==========

    /**
     * Get a single order by ID.
     * Requires USER or ADMIN role.
     */
    @Override
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public void getOrder(GetOrderRequest request, 
                        StreamObserver<Order> responseObserver) {
        try {
            log.debug("GetOrder called: {}", request.getName());
            
            // Validate request
            if (request.getName() == null || request.getName().isEmpty()) {
                responseObserver.onError(
                    Status.INVALID_ARGUMENT
                        .withDescription("Order name is required")
                        .asRuntimeException()
                );
                return;
            }
            
            // Extract order ID from resource name (orders/{order_id})
            String orderId = extractOrderId(request.getName());
            
            // Fetch order
            OrderEntity orderEntity = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(
                    "Order not found: " + request.getName()
                ));
            
            // Authorization: Users can only access their own orders
            if (!canAccessOrder(orderEntity)) {
                responseObserver.onError(
                    Status.PERMISSION_DENIED
                        .withDescription("Access denied to order: " + request.getName())
                        .asRuntimeException()
                );
                return;
            }
            
            // Convert to proto and return
            Order order = toProto(orderEntity);
            responseObserver.onNext(order);
            responseObserver.onCompleted();
            
            log.debug("GetOrder completed: {}", request.getName());
            
        } catch (OrderNotFoundException e) {
            log.warn("Order not found: {}", request.getName());
            responseObserver.onError(
                Status.NOT_FOUND
                    .withDescription(e.getMessage())
                    .asRuntimeException()
            );
        } catch (Exception e) {
            log.error("Error getting order", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Internal server error")
                    .asRuntimeException()
            );
        }
    }

    /**
     * Create a new order.
     * Supports idempotency via request_id.
     */
    @Override
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public void createOrder(CreateOrderRequest request,
                           StreamObserver<Order> responseObserver) {
        try {
            log.debug("CreateOrder called");
            
            // Validate request
            validateCreateOrderRequest(request);
            
            // Check idempotency
            if (request.hasRequestId() && !request.getRequestId().isEmpty()) {
                OrderEntity existing = orderRepository.findByRequestId(request.getRequestId());
                if (existing != null) {
                    log.debug("Returning existing order for request_id: {}", request.getRequestId());
                    responseObserver.onNext(toProto(existing));
                    responseObserver.onCompleted();
                    return;
                }
            }
            
            // Create order
            OrderEntity orderEntity = fromProto(request.getOrder());
            orderEntity.setId(UUID.randomUUID().toString());
            orderEntity.setRequestId(request.getRequestId());
            orderEntity.setCustomerId(getCurrentUserId());
            orderEntity.setStatus(OrderStatus.PENDING);
            
            orderEntity = orderRepository.save(orderEntity);
            
            Order order = toProto(orderEntity);
            responseObserver.onNext(order);
            responseObserver.onCompleted();
            
            log.info("Order created: {}", orderEntity.getId());
            
        } catch (IllegalArgumentException e) {
            log.warn("Invalid create order request: {}", e.getMessage());
            responseObserver.onError(
                Status.INVALID_ARGUMENT
                    .withDescription(e.getMessage())
                    .asRuntimeException()
            );
        } catch (Exception e) {
            log.error("Error creating order", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Internal server error")
                    .asRuntimeException()
            );
        }
    }

    /**
     * Update an existing order.
     */
    @Override
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public void updateOrder(UpdateOrderRequest request,
                           StreamObserver<Order> responseObserver) {
        try {
            log.debug("UpdateOrder called: {}", request.getOrder().getName());
            
            String orderId = extractOrderId(request.getOrder().getName());
            
            OrderEntity existing = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(
                    "Order not found: " + request.getOrder().getName()
                ));
            
            // Authorization
            if (!canAccessOrder(existing)) {
                responseObserver.onError(
                    Status.PERMISSION_DENIED
                        .withDescription("Access denied")
                        .asRuntimeException()
                );
                return;
            }
            
            // Update fields (only allow updating certain fields)
            if (request.getUpdateMask() != null) {
                applyUpdateMask(existing, request.getOrder(), request.getUpdateMask());
            } else {
                // Update all fields if no mask provided
                updateAllFields(existing, request.getOrder());
            }
            
            existing = orderRepository.save(existing);
            
            responseObserver.onNext(toProto(existing));
            responseObserver.onCompleted();
            
            log.info("Order updated: {}", orderId);
            
        } catch (OrderNotFoundException e) {
            responseObserver.onError(
                Status.NOT_FOUND
                    .withDescription(e.getMessage())
                    .asRuntimeException()
            );
        } catch (Exception e) {
            log.error("Error updating order", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Internal server error")
                    .asRuntimeException()
            );
        }
    }

    /**
     * Delete an order (soft delete).
     * Idempotent: returns success even if already deleted.
     */
    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteOrder(DeleteOrderRequest request,
                           StreamObserver<Empty> responseObserver) {
        try {
            log.debug("DeleteOrder called: {}", request.getName());
            
            String orderId = extractOrderId(request.getName());
            
            // Idempotent delete: succeed even if not found
            orderRepository.findById(orderId).ifPresent(order -> {
                orderRepository.delete(order);
                log.info("Order deleted: {}", orderId);
            });
            
            responseObserver.onNext(Empty.getDefaultInstance());
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            log.error("Error deleting order", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Internal server error")
                    .asRuntimeException()
            );
        }
    }

    // ========== Server Streaming ==========

    /**
     * List orders with server streaming.
     * Supports pagination and filtering.
     */
    @Override
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public void listOrders(ListOrdersRequest request,
                          StreamObserver<Order> responseObserver) {
        try {
            log.debug("ListOrders called with page_size: {}", request.getPageSize());
            
            int pageSize = request.getPageSize() > 0 ? request.getPageSize() : 50;
            String userId = isAdmin() ? null : getCurrentUserId();
            
            // Stream orders from database
            List<OrderEntity> orders = orderRepository.findByCustomerIdWithPagination(
                userId,
                request.getPageToken(),
                pageSize
            );
            
            ServerCallStreamObserver<Order> serverObserver = 
                (ServerCallStreamObserver<Order>) responseObserver;
            
            // Check for client cancellation
            serverObserver.setOnCancelHandler(() -> {
                log.info("Client cancelled ListOrders stream");
            });
            
            for (OrderEntity orderEntity : orders) {
                // Respect backpressure
                while (!serverObserver.isReady()) {
                    Thread.sleep(10);
                }
                
                if (serverObserver.isCancelled()) {
                    log.debug("Stream cancelled, stopping");
                    return;
                }
                
                serverObserver.onNext(toProto(orderEntity));
            }
            
            serverObserver.onCompleted();
            log.debug("ListOrders completed, sent {} orders", orders.size());
            
        } catch (Exception e) {
            log.error("Error listing orders", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Internal server error")
                    .asRuntimeException()
            );
        }
    }

    // ========== Client Streaming ==========

    /**
     * Batch create orders via client streaming.
     * Returns summary of created orders and errors.
     */
    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public StreamObserver<CreateOrderRequest> batchCreateOrders(
            StreamObserver<BatchCreateResponse> responseObserver) {
        
        return new StreamObserver<CreateOrderRequest>() {
            
            private final List<String> createdOrderIds = new ArrayList<>();
            private final List<CreateError> errors = new ArrayList<>();
            private final AtomicInteger index = new AtomicInteger(0);

            @Override
            public void onNext(CreateOrderRequest request) {
                int currentIndex = index.getAndIncrement();
                
                try {
                    log.debug("Batch create order #{}", currentIndex);
                    
                    // Validate
                    validateCreateOrderRequest(request);
                    
                    // Create order
                    OrderEntity orderEntity = fromProto(request.getOrder());
                    orderEntity.setId(UUID.randomUUID().toString());
                    orderEntity.setCustomerId(getCurrentUserId());
                    orderEntity.setStatus(OrderStatus.PENDING);
                    
                    orderEntity = orderRepository.save(orderEntity);
                    createdOrderIds.add(orderEntity.getId());
                    
                } catch (Exception e) {
                    log.warn("Failed to create order #{}: {}", currentIndex, e.getMessage());
                    errors.add(CreateError.newBuilder()
                        .setIndex(currentIndex)
                        .setReason(e.getMessage())
                        .build());
                }
            }

            @Override
            public void onError(Throwable t) {
                log.error("Client stream error", t);
            }

            @Override
            public void onCompleted() {
                log.info("Batch create completed. Created: {}, Errors: {}", 
                    createdOrderIds.size(), errors.size());
                
                BatchCreateResponse response = BatchCreateResponse.newBuilder()
                    .setSuccessCount(createdOrderIds.size())
                    .setFailureCount(errors.size())
                    .addAllCreatedOrderIds(createdOrderIds)
                    .addAllErrors(errors)
                    .build();
                
                responseObserver.onNext(response);
                responseObserver.onCompleted();
            }
        };
    }

    // ========== Helper Methods ==========

    private void validateCreateOrderRequest(CreateOrderRequest request) {
        if (!request.hasOrder()) {
            throw new IllegalArgumentException("Order is required");
        }
        
        Order order = request.getOrder();
        
        if (order.getItemsList().isEmpty()) {
            throw new IllegalArgumentException("Order must have at least one item");
        }
        
        if (order.getTotal() <= 0) {
            throw new IllegalArgumentException("Total must be greater than zero");
        }
    }

    private String extractOrderId(String resourceName) {
        if (resourceName.startsWith("orders/")) {
            return resourceName.substring(7);
        }
        throw new IllegalArgumentException("Invalid order name format: " + resourceName);
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "anonymous";
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private boolean canAccessOrder(OrderEntity order) {
        if (isAdmin()) {
            return true;
        }
        return order.getCustomerId().equals(getCurrentUserId());
    }

    private Order toProto(OrderEntity entity) {
        return Order.newBuilder()
            .setName("orders/" + entity.getId())
            .setCustomerId(entity.getCustomerId())
            .setStatus(entity.getStatus())
            .setTotal(entity.getTotal())
            .addAllItems(convertItems(entity.getItems()))
            .build();
    }

    private OrderEntity fromProto(Order order) {
        OrderEntity entity = new OrderEntity();
        entity.setCustomerId(order.getCustomerId());
        entity.setStatus(order.getStatus());
        entity.setTotal(order.getTotal());
        return entity;
    }

    private List<OrderItem> convertItems(List<OrderItemEntity> items) {
        return items.stream()
            .map(item -> OrderItem.newBuilder()
                .setProductId(item.getProductId())
                .setQuantity(item.getQuantity())
                .setPrice(item.getPrice())
                .build())
            .collect(java.util.stream.Collectors.toList());
    }

    private void applyUpdateMask(OrderEntity existing, Order update, 
                                 com.google.protobuf.FieldMask updateMask) {
        for (String path : updateMask.getPathsList()) {
            switch (path) {
                case "status":
                    existing.setStatus(update.getStatus());
                    break;
                case "total":
                    existing.setTotal(update.getTotal());
                    break;
                // Add other updatable fields
                default:
                    log.warn("Unknown field in update mask: {}", path);
            }
        }
    }

    private void updateAllFields(OrderEntity existing, Order update) {
        existing.setStatus(update.getStatus());
        existing.setTotal(update.getTotal());
    }

    private static class OrderNotFoundException extends RuntimeException {
        public OrderNotFoundException(String message) {
            super(message);
        }
    }
}
