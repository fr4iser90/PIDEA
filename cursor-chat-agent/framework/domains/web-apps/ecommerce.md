# E-commerce Application Patterns

## Overview
E-commerce applications require specific patterns for handling products, orders, payments, and user management. This guide covers essential patterns for building scalable e-commerce platforms.

## Core Domain Models

### Product Management
```javascript
class Product {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.sku = data.sku;
    this.category = data.category;
    this.inventory = data.inventory;
    this.images = data.images || [];
    this.variants = data.variants || [];
    this.status = data.status || 'active';
  }
  
  isInStock() {
    return this.inventory.quantity > 0;
  }
  
  hasVariants() {
    return this.variants.length > 0;
  }
  
  getPriceForVariant(variantId) {
    const variant = this.variants.find(v => v.id === variantId);
    return variant ? variant.price : this.price;
  }
}

class ProductService {
  async createProduct(productData) {
    // Validate product data
    this.validateProduct(productData);
    
    // Generate SKU if not provided
    if (!productData.sku) {
      productData.sku = this.generateSKU(productData);
    }
    
    // Create product
    const product = new Product(productData);
    return await this.productRepository.create(product);
  }
  
  async updateInventory(productId, quantity) {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    product.inventory.quantity += quantity;
    return await this.productRepository.update(productId, product);
  }
}
```

### Shopping Cart
```javascript
class Cart {
  constructor(userId) {
    this.userId = userId;
    this.items = [];
    this.coupons = [];
    this.shippingAddress = null;
    this.billingAddress = null;
  }
  
  addItem(product, quantity = 1, variantId = null) {
    const existingItem = this.items.find(item => 
      item.productId === product.id && item.variantId === variantId
    );
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.items.push({
        productId: product.id,
        variantId,
        quantity,
        price: variantId ? product.getPriceForVariant(variantId) : product.price,
        name: product.name
      });
    }
  }
  
  removeItem(productId, variantId = null) {
    this.items = this.items.filter(item => 
      !(item.productId === productId && item.variantId === variantId)
    );
  }
  
  getSubtotal() {
    return this.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }
  
  getTotal() {
    const subtotal = this.getSubtotal();
    const tax = this.calculateTax(subtotal);
    const shipping = this.calculateShipping();
    const discount = this.calculateDiscount();
    
    return subtotal + tax + shipping - discount;
  }
  
  applyCoupon(code) {
    const coupon = this.couponService.validateCoupon(code);
    if (coupon) {
      this.coupons.push(coupon);
    }
  }
}
```

### Order Management
```javascript
class Order {
  constructor(cart, paymentInfo) {
    this.id = this.generateOrderId();
    this.userId = cart.userId;
    this.items = cart.items;
    this.subtotal = cart.getSubtotal();
    this.tax = cart.calculateTax();
    this.shipping = cart.calculateShipping();
    this.discount = cart.calculateDiscount();
    this.total = cart.getTotal();
    this.status = 'pending';
    this.paymentStatus = 'pending';
    this.shippingAddress = cart.shippingAddress;
    this.billingAddress = cart.billingAddress;
    this.paymentInfo = paymentInfo;
    this.createdAt = new Date();
  }
  
  async processPayment() {
    try {
      const paymentResult = await this.paymentProcessor.process(this.paymentInfo, this.total);
      
      if (paymentResult.success) {
        this.paymentStatus = 'paid';
        this.status = 'confirmed';
        await this.updateInventory();
        await this.sendOrderConfirmation();
      } else {
        this.paymentStatus = 'failed';
        throw new Error(paymentResult.error);
      }
    } catch (error) {
      this.paymentStatus = 'failed';
      throw error;
    }
  }
  
  async updateInventory() {
    for (const item of this.items) {
      await this.productService.updateInventory(
        item.productId, 
        -item.quantity
      );
    }
  }
}
```

## Payment Integration

### Payment Processor Interface
```javascript
class PaymentProcessor {
  async process(paymentInfo, amount) {
    // Validate payment info
    this.validatePaymentInfo(paymentInfo);
    
    // Process payment based on method
    switch (paymentInfo.method) {
      case 'stripe':
        return await this.processStripePayment(paymentInfo, amount);
      case 'paypal':
        return await this.processPayPalPayment(paymentInfo, amount);
      case 'bank_transfer':
        return await this.processBankTransfer(paymentInfo, amount);
      default:
        throw new Error('Unsupported payment method');
    }
  }
  
  async processStripePayment(paymentInfo, amount) {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        payment_method: paymentInfo.paymentMethodId,
        confirm: true,
        return_url: paymentInfo.returnUrl
      });
      
      return {
        success: paymentIntent.status === 'succeeded',
        transactionId: paymentIntent.id,
        status: paymentIntent.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

## Inventory Management

### Stock Tracking
```javascript
class InventoryService {
  async checkAvailability(productId, quantity, variantId = null) {
    const product = await this.productRepository.findById(productId);
    
    if (!product) {
      return { available: false, reason: 'Product not found' };
    }
    
    const availableQuantity = variantId 
      ? product.variants.find(v => v.id === variantId)?.inventory?.quantity || 0
      : product.inventory.quantity;
    
    return {
      available: availableQuantity >= quantity,
      availableQuantity,
      requestedQuantity: quantity
    };
  }
  
  async reserveStock(productId, quantity, variantId = null, orderId) {
    const availability = await this.checkAvailability(productId, quantity, variantId);
    
    if (!availability.available) {
      throw new Error('Insufficient stock');
    }
    
    // Create reservation
    const reservation = {
      productId,
      variantId,
      quantity,
      orderId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    };
    
    await this.reservationRepository.create(reservation);
    
    // Update inventory
    await this.updateInventory(productId, -quantity, variantId);
  }
  
  async releaseReservation(orderId) {
    const reservations = await this.reservationRepository.findByOrderId(orderId);
    
    for (const reservation of reservations) {
      await this.updateInventory(
        reservation.productId, 
        reservation.quantity, 
        reservation.variantId
      );
      await this.reservationRepository.delete(reservation.id);
    }
  }
}
```

## Search and Filtering

### Product Search
```javascript
class ProductSearchService {
  async searchProducts(query, filters = {}) {
    const searchQuery = {
      $and: [
        { status: 'active' },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    };
    
    // Apply filters
    if (filters.category) {
      searchQuery.$and.push({ category: filters.category });
    }
    
    if (filters.minPrice || filters.maxPrice) {
      const priceFilter = {};
      if (filters.minPrice) priceFilter.$gte = filters.minPrice;
      if (filters.maxPrice) priceFilter.$lte = filters.maxPrice;
      searchQuery.$and.push({ price: priceFilter });
    }
    
    if (filters.inStock) {
      searchQuery.$and.push({ 'inventory.quantity': { $gt: 0 } });
    }
    
    return await this.productRepository.find(searchQuery);
  }
  
  async getPopularProducts(limit = 10) {
    return await this.productRepository.aggregate([
      { $match: { status: 'active' } },
      { $lookup: { from: 'orders', localField: '_id', foreignField: 'items.productId', as: 'orders' } },
      { $addFields: { orderCount: { $size: '$orders' } } },
      { $sort: { orderCount: -1 } },
      { $limit: limit }
    ]);
  }
}
```

## User Management

### Customer Profiles
```javascript
class CustomerService {
  async createCustomer(userData) {
    const customer = {
      ...userData,
      customerId: this.generateCustomerId(),
      loyaltyPoints: 0,
      preferences: {},
      addresses: [],
      orderHistory: []
    };
    
    return await this.customerRepository.create(customer);
  }
  
  async addAddress(customerId, address) {
    const customer = await this.customerRepository.findById(customerId);
    customer.addresses.push({
      id: this.generateAddressId(),
      ...address,
      isDefault: customer.addresses.length === 0
    });
    
    return await this.customerRepository.update(customerId, customer);
  }
  
  async updateLoyaltyPoints(customerId, points) {
    const customer = await this.customerRepository.findById(customerId);
    customer.loyaltyPoints += points;
    
    return await this.customerRepository.update(customerId, customer);
  }
}
```

## Analytics and Reporting

### Sales Analytics
```javascript
class AnalyticsService {
  async getSalesReport(startDate, endDate) {
    const orders = await this.orderRepository.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed'
    });
    
    const report = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
      averageOrderValue: 0,
      topProducts: [],
      salesByCategory: {},
      salesByDay: {}
    };
    
    if (orders.length > 0) {
      report.averageOrderValue = report.totalRevenue / report.totalOrders;
    }
    
    // Calculate top products
    const productSales = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
      });
    });
    
    report.topProducts = Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    return report;
  }
  
  async getCustomerAnalytics() {
    return await this.customerRepository.aggregate([
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          averageLoyaltyPoints: { $avg: '$loyaltyPoints' },
          totalOrders: { $sum: { $size: '$orderHistory' } }
        }
      }
    ]);
  }
}
```

## Security and Fraud Prevention

### Fraud Detection
```javascript
class FraudDetectionService {
  async analyzeOrder(order) {
    const riskFactors = [];
    
    // Check for suspicious patterns
    if (this.isHighValueOrder(order)) {
      riskFactors.push('high_value');
    }
    
    if (this.isNewCustomer(order.userId)) {
      riskFactors.push('new_customer');
    }
    
    if (this.isUnusualLocation(order.shippingAddress)) {
      riskFactors.push('unusual_location');
    }
    
    if (this.isRapidOrdering(order.userId)) {
      riskFactors.push('rapid_ordering');
    }
    
    const riskScore = this.calculateRiskScore(riskFactors);
    
    return {
      riskScore,
      riskFactors,
      requiresReview: riskScore > 0.7
    };
  }
  
  async flagSuspiciousOrder(orderId) {
    const order = await this.orderRepository.findById(orderId);
    order.status = 'under_review';
    order.fraudCheck = {
      flaggedAt: new Date(),
      reviewedBy: null,
      notes: ''
    };
    
    return await this.orderRepository.update(orderId, order);
  }
}
```

## Performance Optimization

### Caching Strategy
```javascript
class ProductCacheService {
  constructor(redisClient) {
    this.redis = redisClient;
    this.cacheTTL = 3600; // 1 hour
  }
  
  async getProduct(productId) {
    const cacheKey = `product:${productId}`;
    let product = await this.redis.get(cacheKey);
    
    if (!product) {
      product = await this.productRepository.findById(productId);
      if (product) {
        await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(product));
      }
    } else {
      product = JSON.parse(product);
    }
    
    return product;
  }
  
  async invalidateProduct(productId) {
    const cacheKey = `product:${productId}`;
    await this.redis.del(cacheKey);
  }
}
```

## Testing

### E-commerce Specific Tests
```javascript
describe('Order Processing', () => {
  it('should process order with valid payment', async () => {
    const cart = new Cart('user123');
    cart.addItem(mockProduct, 2);
    
    const order = new Order(cart, mockPaymentInfo);
    const result = await order.processPayment();
    
    expect(result.paymentStatus).toBe('paid');
    expect(result.status).toBe('confirmed');
  });
  
  it('should fail order with insufficient inventory', async () => {
    const cart = new Cart('user123');
    cart.addItem(mockProduct, 999); // More than available
    
    const order = new Order(cart, mockPaymentInfo);
    
    await expect(order.processPayment()).rejects.toThrow('Insufficient stock');
  });
});
```
