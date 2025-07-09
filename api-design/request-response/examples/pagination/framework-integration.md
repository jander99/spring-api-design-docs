# Framework Integration Examples

This document provides implementation examples for pagination, filtering, and sorting across different web frameworks.

## Express.js with MongoDB

### Basic Setup

```javascript
const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Order schema
const orderSchema = new mongoose.Schema({
  id: String,
  customerId: String,
  total: Number,
  status: String,
  createdDate: { type: Date, default: Date.now }
});

// Create indexes for pagination
orderSchema.index({ status: 1, createdDate: -1 });
orderSchema.index({ customerId: 1, status: 1 });

const Order = mongoose.model('Order', orderSchema);

// Pagination middleware
const paginate = (req, res, next) => {
  req.pagination = {
    page: parseInt(req.query.page) || 0,
    size: Math.min(parseInt(req.query.size) || 20, 100)
  };
  next();
};

// Filter parser
const parseFilters = (query) => {
  const filters = {};
  
  if (query.status) {
    filters.status = { $in: query.status.split(',') };
  }
  
  if (query.createdAfter) {
    filters.createdDate = { $gte: new Date(query.createdAfter) };
  }
  
  if (query.createdBefore) {
    filters.createdDate = { 
      ...filters.createdDate, 
      $lte: new Date(query.createdBefore) 
    };
  }
  
  return filters;
};

// Sort parser
const parseSort = (sortParam) => {
  if (!sortParam) return { createdDate: -1 };
  
  const sorts = {};
  const sortFields = Array.isArray(sortParam) ? sortParam : [sortParam];
  
  sortFields.forEach(field => {
    const [fieldName, direction = 'asc'] = field.split(',');
    sorts[fieldName] = direction.toLowerCase() === 'desc' ? -1 : 1;
  });
  
  return sorts;
};

// Orders endpoint
app.get('/v1/orders', paginate, async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const sort = parseSort(req.query.sort);
    
    const [data, total] = await Promise.all([
      Order.find(filters)
        .sort(sort)
        .skip(req.pagination.page * req.pagination.size)
        .limit(req.pagination.size)
        .lean(),
      Order.countDocuments(filters)
    ]);

    res.json({
      data,
      meta: {
        pagination: {
          page: req.pagination.page,
          size: req.pagination.size,
          totalElements: total,
          totalPages: Math.ceil(total / req.pagination.size)
        },
        filters: filters,
        sort: Object.entries(sort).map(([field, direction]) => ({
          field,
          direction: direction === 1 ? 'ASC' : 'DESC'
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      type: 'https://example.com/problems/server-error',
      title: 'Server Error',
      status: 500,
      detail: error.message
    });
  }
});
```

## FastAPI with PostgreSQL

### Setup with SQLAlchemy

```python
from fastapi import FastAPI, Query, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import math

app = FastAPI()

# Database setup
SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/dbname"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database model
class Order(Base):
    __tablename__ = "orders"
    
    id = Column(String, primary_key=True)
    customer_id = Column(String)
    total = Column(Float)
    status = Column(String)
    created_date = Column(DateTime, default=datetime.utcnow)

# Pydantic models
class OrderResponse(BaseModel):
    id: str
    customer_id: str
    total: float
    status: str
    created_date: datetime

class PaginationMeta(BaseModel):
    page: int
    size: int
    total_elements: int
    total_pages: int

class SortCriteria(BaseModel):
    field: str
    direction: str

class ResponseMeta(BaseModel):
    pagination: PaginationMeta
    filters: Optional[dict] = None
    sort: Optional[List[SortCriteria]] = None

class PaginatedOrderResponse(BaseModel):
    data: List[OrderResponse]
    meta: ResponseMeta

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pagination class
class PaginationParams:
    def __init__(
        self,
        page: int = Query(0, ge=0),
        size: int = Query(20, ge=1, le=100),
        sort: Optional[List[str]] = Query(None)
    ):
        self.page = page
        self.size = size
        self.sort = sort or []

# Filter parser
def parse_filters(
    status: Optional[str] = None,
    created_after: Optional[datetime] = None,
    created_before: Optional[datetime] = None
):
    filters = {}
    if status:
        filters['status'] = status.split(',')
    if created_after:
        filters['created_after'] = created_after
    if created_before:
        filters['created_before'] = created_before
    return filters

# Orders endpoint
@app.get("/v1/orders", response_model=PaginatedOrderResponse)
async def get_orders(
    pagination: PaginationParams = Depends(),
    filters: dict = Depends(parse_filters),
    db: Session = Depends(get_db)
):
    # Build query
    query = db.query(Order)
    
    # Apply filters
    if 'status' in filters:
        query = query.filter(Order.status.in_(filters['status']))
    if 'created_after' in filters:
        query = query.filter(Order.created_date >= filters['created_after'])
    if 'created_before' in filters:
        query = query.filter(Order.created_date <= filters['created_before'])
    
    # Apply sorting
    for sort_param in pagination.sort:
        field, direction = (sort_param.split(',') + ['asc'])[:2]
        if hasattr(Order, field):
            order_by = getattr(Order, field)
            if direction.lower() == 'desc':
                order_by = order_by.desc()
            query = query.order_by(order_by)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    orders = query.offset(pagination.page * pagination.size).limit(pagination.size).all()
    
    # Build response
    return PaginatedOrderResponse(
        data=orders,
        meta=ResponseMeta(
            pagination=PaginationMeta(
                page=pagination.page,
                size=pagination.size,
                total_elements=total,
                total_pages=math.ceil(total / pagination.size)
            ),
            filters=filters if any(filters.values()) else None,
            sort=[
                SortCriteria(field=field, direction=direction.upper())
                for sort_param in pagination.sort
                for field, direction in [sort_param.split(',') + ['asc']][:1]
            ] if pagination.sort else None
        )
    )
```

## Django REST Framework

### Setup with DRF Pagination

```python
from rest_framework import generics, filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters_rf
from django.db import models
from rest_framework import serializers

# Model
class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    id = models.CharField(max_length=100, primary_key=True)
    customer_id = models.CharField(max_length=100)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    created_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['status', '-created_date']),
            models.Index(fields=['customer_id', 'status']),
        ]

# Serializer
class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = '__all__'

# Custom pagination
class CustomPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'size'
    max_page_size = 100
    page_query_param = 'page'
    
    def get_paginated_response(self, data):
        return Response({
            'data': data,
            'meta': {
                'pagination': {
                    'page': self.page.number - 1,  # Convert to 0-indexed
                    'size': self.page_size,
                    'totalElements': self.page.paginator.count,
                    'totalPages': self.page.paginator.num_pages
                }
            }
        })

# Filter class
class OrderFilter(filters_rf.FilterSet):
    status = filters_rf.CharFilter(field_name='status', lookup_expr='in')
    created_after = filters_rf.DateTimeFilter(field_name='created_date', lookup_expr='gte')
    created_before = filters_rf.DateTimeFilter(field_name='created_date', lookup_expr='lte')
    search = filters_rf.CharFilter(method='search_filter')
    
    def search_filter(self, queryset, name, value):
        return queryset.filter(
            models.Q(customer_id__icontains=value) |
            models.Q(id__icontains=value)
        )
    
    class Meta:
        model = Order
        fields = ['status', 'created_after', 'created_before', 'search']

# View
class OrderListView(generics.ListAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = OrderFilter
    ordering_fields = ['created_date', 'total', 'status']
    ordering = ['-created_date']
    
    def get_paginated_response(self, data):
        page = self.paginate_queryset(self.get_queryset())
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginator().get_paginated_response(serializer.data)
            
            # Add filters and sort info to metadata
            response.data['meta']['filters'] = self.get_applied_filters()
            response.data['meta']['sort'] = self.get_sort_info()
            
            return response
        
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)
    
    def get_applied_filters(self):
        filters = {}
        for param, value in self.request.query_params.items():
            if param in ['status', 'created_after', 'created_before', 'search']:
                filters[param] = value
        return filters if filters else None
    
    def get_sort_info(self):
        ordering = self.request.query_params.get('ordering', '').split(',')
        sort_info = []
        
        for field in ordering:
            if field.startswith('-'):
                sort_info.append({'field': field[1:], 'direction': 'DESC'})
            else:
                sort_info.append({'field': field, 'direction': 'ASC'})
        
        return sort_info if sort_info else None
```

## ASP.NET Core

### Setup with Entity Framework

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

// Model
public class Order
{
    public string Id { get; set; }
    public string CustomerId { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; }
    public DateTime CreatedDate { get; set; }
}

// DbContext
public class OrderContext : DbContext
{
    public OrderContext(DbContextOptions<OrderContext> options) : base(options) { }
    
    public DbSet<Order> Orders { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Order>()
            .HasIndex(o => new { o.Status, o.CreatedDate });
        
        modelBuilder.Entity<Order>()
            .HasIndex(o => new { o.CustomerId, o.Status });
    }
}

// DTOs
public class PaginationMeta
{
    public int Page { get; set; }
    public int Size { get; set; }
    public int TotalElements { get; set; }
    public int TotalPages { get; set; }
}

public class SortCriteria
{
    public string Field { get; set; }
    public string Direction { get; set; }
}

public class ResponseMeta
{
    public PaginationMeta Pagination { get; set; }
    public Dictionary<string, object> Filters { get; set; }
    public List<SortCriteria> Sort { get; set; }
}

public class PaginatedResponse<T>
{
    public IEnumerable<T> Data { get; set; }
    public ResponseMeta Meta { get; set; }
}

// Query parameters
public class OrderQueryParameters
{
    [Range(0, int.MaxValue)]
    public int Page { get; set; } = 0;
    
    [Range(1, 100)]
    public int Size { get; set; } = 20;
    
    public string Status { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public string Sort { get; set; }
}

// Controller
[ApiController]
[Route("v1/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly OrderContext _context;
    
    public OrdersController(OrderContext context)
    {
        _context = context;
    }
    
    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<Order>>> GetOrders(
        [FromQuery] OrderQueryParameters parameters)
    {
        var query = _context.Orders.AsQueryable();
        
        // Apply filters
        var filters = new Dictionary<string, object>();
        
        if (!string.IsNullOrEmpty(parameters.Status))
        {
            var statuses = parameters.Status.Split(',');
            query = query.Where(o => statuses.Contains(o.Status));
            filters["status"] = parameters.Status;
        }
        
        if (parameters.CreatedAfter.HasValue)
        {
            query = query.Where(o => o.CreatedDate >= parameters.CreatedAfter.Value);
            filters["createdAfter"] = parameters.CreatedAfter.Value;
        }
        
        if (parameters.CreatedBefore.HasValue)
        {
            query = query.Where(o => o.CreatedDate <= parameters.CreatedBefore.Value);
            filters["createdBefore"] = parameters.CreatedBefore.Value;
        }
        
        // Apply sorting
        var sortCriteria = ParseSort(parameters.Sort);
        query = ApplySort(query, sortCriteria);
        
        // Get total count
        var totalElements = await query.CountAsync();
        
        // Apply pagination
        var data = await query
            .Skip(parameters.Page * parameters.Size)
            .Take(parameters.Size)
            .ToListAsync();
        
        var response = new PaginatedResponse<Order>
        {
            Data = data,
            Meta = new ResponseMeta
            {
                Pagination = new PaginationMeta
                {
                    Page = parameters.Page,
                    Size = parameters.Size,
                    TotalElements = totalElements,
                    TotalPages = (int)Math.Ceiling((double)totalElements / parameters.Size)
                },
                Filters = filters.Any() ? filters : null,
                Sort = sortCriteria
            }
        };
        
        return Ok(response);
    }
    
    private List<SortCriteria> ParseSort(string sortParam)
    {
        if (string.IsNullOrEmpty(sortParam))
            return new List<SortCriteria> { new SortCriteria { Field = "CreatedDate", Direction = "DESC" } };
        
        var sorts = new List<SortCriteria>();
        var sortFields = sortParam.Split(',');
        
        for (int i = 0; i < sortFields.Length; i += 2)
        {
            var field = sortFields[i];
            var direction = i + 1 < sortFields.Length ? sortFields[i + 1] : "ASC";
            
            sorts.Add(new SortCriteria
            {
                Field = field,
                Direction = direction.ToUpper()
            });
        }
        
        return sorts;
    }
    
    private IQueryable<Order> ApplySort(IQueryable<Order> query, List<SortCriteria> sortCriteria)
    {
        if (!sortCriteria.Any())
            return query.OrderByDescending(o => o.CreatedDate);
        
        IOrderedQueryable<Order> orderedQuery = null;
        
        foreach (var sort in sortCriteria)
        {
            switch (sort.Field.ToLower())
            {
                case "createdate":
                    orderedQuery = orderedQuery == null
                        ? (sort.Direction == "DESC" ? query.OrderByDescending(o => o.CreatedDate) : query.OrderBy(o => o.CreatedDate))
                        : (sort.Direction == "DESC" ? orderedQuery.ThenByDescending(o => o.CreatedDate) : orderedQuery.ThenBy(o => o.CreatedDate));
                    break;
                case "total":
                    orderedQuery = orderedQuery == null
                        ? (sort.Direction == "DESC" ? query.OrderByDescending(o => o.Total) : query.OrderBy(o => o.Total))
                        : (sort.Direction == "DESC" ? orderedQuery.ThenByDescending(o => o.Total) : orderedQuery.ThenBy(o => o.Total));
                    break;
                case "status":
                    orderedQuery = orderedQuery == null
                        ? (sort.Direction == "DESC" ? query.OrderByDescending(o => o.Status) : query.OrderBy(o => o.Status))
                        : (sort.Direction == "DESC" ? orderedQuery.ThenByDescending(o => o.Status) : orderedQuery.ThenBy(o => o.Status));
                    break;
                default:
                    // Default to ID for unknown fields
                    orderedQuery = orderedQuery == null
                        ? query.OrderBy(o => o.Id)
                        : orderedQuery.ThenBy(o => o.Id);
                    break;
            }
        }
        
        return orderedQuery ?? query.OrderByDescending(o => o.CreatedDate);
    }
}
```

## Ruby on Rails

### Setup with ActiveRecord

```ruby
# Model
class Order < ApplicationRecord
  validates :status, inclusion: { in: %w[PENDING PROCESSING COMPLETED CANCELLED] }
  
  scope :by_status, ->(status) { where(status: status.split(',')) if status.present? }
  scope :created_after, ->(date) { where('created_at >= ?', date) if date.present? }
  scope :created_before, ->(date) { where('created_at <= ?', date) if date.present? }
  
  # Indexes
  # add_index :orders, [:status, :created_at]
  # add_index :orders, [:customer_id, :status]
end

# Controller
class V1::OrdersController < ApplicationController
  def index
    @orders = Order.all
    
    # Apply filters
    filters = {}
    
    if params[:status].present?
      @orders = @orders.by_status(params[:status])
      filters[:status] = params[:status]
    end
    
    if params[:created_after].present?
      @orders = @orders.created_after(params[:created_after])
      filters[:created_after] = params[:created_after]
    end
    
    if params[:created_before].present?
      @orders = @orders.created_before(params[:created_before])
      filters[:created_before] = params[:created_before]
    end
    
    # Apply sorting
    sort_criteria = parse_sort(params[:sort])
    @orders = apply_sort(@orders, sort_criteria)
    
    # Pagination
    page = (params[:page] || 0).to_i
    size = [(params[:size] || 20).to_i, 100].min
    
    total_elements = @orders.count
    total_pages = (total_elements.to_f / size).ceil
    
    @orders = @orders.offset(page * size).limit(size)
    
    render json: {
      data: @orders,
      meta: {
        pagination: {
          page: page,
          size: size,
          total_elements: total_elements,
          total_pages: total_pages
        },
        filters: filters.present? ? filters : nil,
        sort: sort_criteria
      }
    }
  end
  
  private
  
  def parse_sort(sort_param)
    return [{ field: 'created_at', direction: 'DESC' }] if sort_param.blank?
    
    sorts = []
    fields = sort_param.split(',')
    
    fields.each_slice(2) do |field, direction|
      sorts << {
        field: field,
        direction: (direction || 'ASC').upcase
      }
    end
    
    sorts
  end
  
  def apply_sort(query, sort_criteria)
    sort_criteria.each do |sort|
      case sort[:field]
      when 'created_at', 'total', 'status'
        direction = sort[:direction] == 'DESC' ? :desc : :asc
        query = query.order(sort[:field] => direction)
      else
        # Default to id for unknown fields
        query = query.order(id: :asc)
      end
    end
    
    query
  end
end
```

## Performance Considerations

### Database Indexing Strategy

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_orders_status_created_date ON orders (status, created_date DESC);
CREATE INDEX idx_orders_customer_status ON orders (customer_id, status);
CREATE INDEX idx_orders_created_date ON orders (created_date DESC);

-- Partial indexes for specific filters
CREATE INDEX idx_orders_active_created_date ON orders (created_date DESC) 
WHERE status IN ('ACTIVE', 'PROCESSING');
```

### Query Optimization

```javascript
// Use explain plans to optimize queries
const explain = await Order.find(query).explain('executionStats');
console.log('Query execution stats:', explain.executionStats);

// Monitor slow queries
const slowQueryThreshold = 1000; // 1 second
const startTime = Date.now();

const results = await Order.find(query).sort(sort).skip(offset).limit(limit);

const executionTime = Date.now() - startTime;
if (executionTime > slowQueryThreshold) {
  console.warn('Slow query detected:', {
    executionTime,
    query,
    sort,
    offset,
    limit
  });
}
```

## Testing Examples

### Unit Tests

```javascript
// Jest test example
describe('Pagination', () => {
  test('should return paginated results', async () => {
    const response = await request(app)
      .get('/v1/orders?page=0&size=2')
      .expect(200);
    
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.pagination.page).toBe(0);
    expect(response.body.meta.pagination.size).toBe(2);
  });
  
  test('should handle empty results', async () => {
    const response = await request(app)
      .get('/v1/orders?status=NONEXISTENT')
      .expect(200);
    
    expect(response.body.data).toHaveLength(0);
    expect(response.body.meta.pagination.totalElements).toBe(0);
  });
});
```

## Related Documentation

- [Main Pagination Guide](../../Pagination-and-Filtering.md)
- [Complete Examples](complete-examples.md)
- [Advanced Patterns](../reference/pagination/advanced-patterns.md)
- [Common Issues](../troubleshooting/pagination/common-issues.md)