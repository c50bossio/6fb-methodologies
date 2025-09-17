# 📊 6FB Methodologies Workshop System - Monitoring Setup Guide

## 📋 Overview

Comprehensive monitoring setup for the 6FB Methodologies Workshop system covering SMS notifications, inventory tracking, payment monitoring, performance metrics, and alerting systems. This guide ensures proactive monitoring and rapid response to issues.

## 🏗️ Monitoring Architecture

### Core Monitoring Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │────│   Monitoring    │────│     Alerts      │
│     Metrics     │    │    Dashboard    │    │   & Actions     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Data Sources   │    │   Aggregation   │    │  Notification   │
│ • API Metrics   │    │ • Time Series   │    │ • SMS Alerts    │
│ • SMS Status    │    │ • Log Analysis  │    │ • Email Alerts  │
│ • Inventory     │    │ • Real-time     │    │ • Slack/Discord │
│ • Payments      │    │   Dashboards    │    │ • Webhooks      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📱 SMS Monitoring System

### 1. SMS Service Health Monitoring

```typescript
// SMS Health Check Service
class SMSMonitor {
  private healthCheckInterval = 5 * 60 * 1000 // 5 minutes
  private alertThresholds = {
    failureRate: 0.1,        // 10% failure rate triggers alert
    responseTime: 5000,      // 5 second response time limit
    retryRate: 0.2           // 20% retry rate triggers alert
  }

  async startMonitoring() {
    setInterval(async () => {
      await this.checkSMSHealth()
      await this.checkDeliveryMetrics()
      await this.validateConfiguration()
    }, this.healthCheckInterval)
  }

  async checkSMSHealth() {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      service: 'twilio-sms',
      status: 'unknown',
      responseTime: 0,
      errorRate: 0,
      lastSuccessfulSend: null
    }

    const startTime = Date.now()

    try {
      // Send test SMS to verify service
      const testResult = await smsService.sendTestMessage()
      healthCheck.responseTime = Date.now() - startTime
      healthCheck.status = testResult.success ? 'healthy' : 'degraded'
      healthCheck.lastSuccessfulSend = testResult.success ? new Date().toISOString() : null

      // Log health metrics
      console.log('sms_health_check', healthCheck)

      // Alert if unhealthy
      if (!testResult.success) {
        await this.sendHealthAlert('SMS service health check failed', 'high')
      }

    } catch (error) {
      healthCheck.status = 'unhealthy'
      healthCheck.responseTime = Date.now() - startTime

      console.error('SMS health check failed:', error)
      await this.sendHealthAlert(`SMS service error: ${error.message}`, 'critical')
    }

    return healthCheck
  }

  async checkDeliveryMetrics() {
    // Track SMS delivery success rates
    const metrics = await this.getDeliveryMetrics()

    if (metrics.failureRate > this.alertThresholds.failureRate) {
      await this.sendHealthAlert(
        `High SMS failure rate: ${(metrics.failureRate * 100).toFixed(1)}%`,
        'high'
      )
    }

    if (metrics.averageResponseTime > this.alertThresholds.responseTime) {
      await this.sendHealthAlert(
        `Slow SMS response time: ${metrics.averageResponseTime}ms`,
        'medium'
      )
    }
  }

  async getDeliveryMetrics() {
    // Implementation would track delivery metrics over time
    return {
      totalSent: 0,
      totalFailed: 0,
      failureRate: 0,
      averageResponseTime: 0,
      retryRate: 0
    }
  }
}
```

### 2. SMS Alert Configuration

```typescript
// SMS Alert Thresholds
const SMS_ALERT_CONFIG = {
  ticketSales: {
    enabled: true,
    recipients: ['+1-352-556-8981', '+1-813-520-3348'],
    retryAttempts: 3,
    retryDelay: 1000,
    priority: 'normal'
  },

  inventoryAlerts: {
    enabled: true,
    thresholds: {
      ga: [25, 15, 10, 5, 2, 0],
      vip: [10, 5, 3, 1, 0]
    },
    priority: 'high'
  },

  systemAlerts: {
    enabled: true,
    severityLevels: {
      low: { enabled: false },
      medium: { enabled: true },
      high: { enabled: true },
      critical: { enabled: true, immediateEscalation: true }
    }
  },

  healthChecks: {
    enabled: true,
    frequency: '5m',
    failureThreshold: 3,
    priority: 'critical'
  }
}
```

### 3. SMS Monitoring Dashboard

```typescript
// SMS Metrics Endpoint
app.get('/api/monitoring/sms', async (req, res) => {
  const metrics = {
    service: {
      status: await smsService.getStatus(),
      uptime: process.uptime(),
      lastHealthCheck: await getLastHealthCheck('sms')
    },

    delivery: {
      last24h: await getSMSMetrics('24h'),
      last7d: await getSMSMetrics('7d'),
      last30d: await getSMSMetrics('30d')
    },

    configuration: {
      accountSid: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER ? 'configured' : 'missing',
      targetNumbers: smsService.getTargetNumbers().length,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000
      }
    },

    recentAlerts: await getRecentSMSAlerts(10)
  }

  res.json({ success: true, data: metrics })
})
```

## 📦 Inventory Monitoring System

### 1. Real-Time Inventory Tracking

```typescript
// Inventory Monitor Service
class InventoryMonitor {
  private checkInterval = 60 * 1000 // 1 minute
  private alertThresholds = {
    ga: {
      low: 10,      // Alert when GA < 10
      critical: 5,  // Critical alert when GA < 5
      soldOut: 0    // Immediate alert when sold out
    },
    vip: {
      low: 5,       // Alert when VIP < 5
      critical: 2,  // Critical alert when VIP < 2
      soldOut: 0    // Immediate alert when sold out
    }
  }

  async startMonitoring() {
    setInterval(async () => {
      await this.checkAllCityInventory()
      await this.checkSalesVelocity()
      await this.predictSellOut()
    }, this.checkInterval)
  }

  async checkAllCityInventory() {
    const cities = await getAllCities()

    for (const cityId of cities) {
      const status = await checkInventoryStatus(cityId)
      if (!status) continue

      // Check GA inventory levels
      await this.checkInventoryLevel(cityId, 'ga', status.publicAvailable.ga)

      // Check VIP inventory levels
      await this.checkInventoryLevel(cityId, 'vip', status.publicAvailable.vip)

      // Log inventory metrics
      console.log('inventory_metrics', {
        cityId,
        ga: {
          available: status.publicAvailable.ga,
          sold: status.sold.ga,
          total: status.publicLimits.ga
        },
        vip: {
          available: status.publicAvailable.vip,
          sold: status.sold.vip,
          total: status.publicLimits.vip
        },
        timestamp: new Date().toISOString()
      })
    }
  }

  async checkInventoryLevel(cityId: string, tier: 'ga' | 'vip', available: number) {
    const thresholds = this.alertThresholds[tier]

    if (available === thresholds.soldOut) {
      await this.sendInventoryAlert(cityId, tier, available, 'SOLD OUT', 'critical')
    } else if (available <= thresholds.critical) {
      await this.sendInventoryAlert(cityId, tier, available, 'CRITICAL', 'high')
    } else if (available <= thresholds.low) {
      await this.sendInventoryAlert(cityId, tier, available, 'LOW', 'medium')
    }
  }

  async sendInventoryAlert(
    cityId: string,
    tier: 'ga' | 'vip',
    available: number,
    level: string,
    severity: string
  ) {
    const message = `🚨 INVENTORY ${level}: ${cityId} ${tier.toUpperCase()} - ${available} tickets remaining`

    // Send SMS alert
    await smsService.sendSystemAlert(message, severity as any)

    // Send to monitoring dashboard
    await this.logInventoryAlert({
      cityId,
      tier,
      available,
      level,
      severity,
      timestamp: new Date().toISOString()
    })

    // Send to external monitoring (if configured)
    if (process.env.SLACK_INVENTORY_WEBHOOK) {
      await this.sendSlackAlert(message, severity)
    }
  }

  async checkSalesVelocity() {
    // Analyze sales patterns to predict sellout timing
    const cities = await getAllCities()

    for (const cityId of cities) {
      const velocity = await this.calculateSalesVelocity(cityId)

      if (velocity.predictedSellout && velocity.hoursUntilSellout < 24) {
        await this.sendVelocityAlert(cityId, velocity)
      }
    }
  }

  async calculateSalesVelocity(cityId: string) {
    // Get sales data for last 24 hours
    const salesData = await getSalesData(cityId, '24h')

    // Calculate tickets per hour
    const ticketsPerHour = salesData.total / 24
    const status = await checkInventoryStatus(cityId)

    if (!status || ticketsPerHour === 0) {
      return { predictedSellout: false, hoursUntilSellout: Infinity }
    }

    const totalRemaining = status.publicAvailable.ga + status.publicAvailable.vip
    const hoursUntilSellout = totalRemaining / ticketsPerHour

    return {
      predictedSellout: hoursUntilSellout < 48, // Predict if selling out in 48h
      hoursUntilSellout,
      ticketsPerHour,
      totalRemaining
    }
  }
}
```

### 2. Inventory Metrics Dashboard

```typescript
// Inventory Monitoring API
app.get('/api/monitoring/inventory', async (req, res) => {
  const metrics = {
    overview: {
      totalCities: await getCityCount(),
      totalTicketsAvailable: await getTotalAvailableTickets(),
      totalTicketsSold: await getTotalSoldTickets(),
      revenue: await getTotalRevenue(),
      lastUpdated: new Date().toISOString()
    },

    cities: await Promise.all(
      (await getAllCities()).map(async cityId => {
        const status = await checkInventoryStatus(cityId)
        const velocity = await calculateSalesVelocity(cityId)

        return {
          cityId,
          status,
          velocity,
          alerts: await getRecentInventoryAlerts(cityId, 5)
        }
      })
    ),

    alerts: {
      active: await getActiveInventoryAlerts(),
      recent: await getRecentInventoryAlerts(null, 10),
      thresholds: this.alertThresholds
    },

    trends: {
      last24h: await getInventoryTrends('24h'),
      last7d: await getInventoryTrends('7d'),
      last30d: await getInventoryTrends('30d')
    }
  }

  res.json({ success: true, data: metrics })
})
```

## 💳 Payment Monitoring

### 1. Payment Processing Metrics

```typescript
// Payment Monitor Service
class PaymentMonitor {
  private checkInterval = 2 * 60 * 1000 // 2 minutes
  private alertThresholds = {
    failureRate: 0.05,      // 5% payment failure rate
    responseTime: 3000,     // 3 second payment response time
    chargebackRate: 0.01,   // 1% chargeback rate
    refundRate: 0.02        // 2% refund rate
  }

  async startMonitoring() {
    setInterval(async () => {
      await this.checkPaymentHealth()
      await this.analyzePaymentTrends()
      await this.checkStripeWebhooks()
    }, this.checkInterval)
  }

  async checkPaymentHealth() {
    const metrics = await this.getPaymentMetrics('1h')

    // Check failure rate
    if (metrics.failureRate > this.alertThresholds.failureRate) {
      await this.sendPaymentAlert(
        `High payment failure rate: ${(metrics.failureRate * 100).toFixed(1)}%`,
        'high'
      )
    }

    // Check response times
    if (metrics.averageResponseTime > this.alertThresholds.responseTime) {
      await this.sendPaymentAlert(
        `Slow payment processing: ${metrics.averageResponseTime}ms`,
        'medium'
      )
    }

    // Log payment health
    console.log('payment_health_check', {
      ...metrics,
      timestamp: new Date().toISOString()
    })
  }

  async getPaymentMetrics(timeframe: string) {
    // Implementation would query payment database/logs
    return {
      totalPayments: 0,
      successfulPayments: 0,
      failedPayments: 0,
      failureRate: 0,
      totalAmount: 0,
      averageOrderValue: 0,
      averageResponseTime: 0,
      topFailureReasons: []
    }
  }

  async checkStripeWebhooks() {
    // Verify Stripe webhooks are being processed
    const webhookHealth = await this.getWebhookHealth()

    if (webhookHealth.failureRate > 0.1) {
      await this.sendPaymentAlert(
        `Stripe webhook failures detected: ${(webhookHealth.failureRate * 100).toFixed(1)}%`,
        'critical'
      )
    }
  }
}
```

### 2. Payment Monitoring Dashboard

```typescript
// Payment metrics endpoint
app.get('/api/monitoring/payments', async (req, res) => {
  const timeframe = req.query.timeframe || '24h'

  const metrics = {
    summary: {
      totalRevenue: await getTotalRevenue(timeframe),
      totalTransactions: await getTotalTransactions(timeframe),
      averageOrderValue: await getAverageOrderValue(timeframe),
      successRate: await getPaymentSuccessRate(timeframe)
    },

    breakdown: {
      byTicketType: await getRevenueByTicketType(timeframe),
      byCity: await getRevenueByCity(timeframe),
      byPaymentMethod: await getRevenueByPaymentMethod(timeframe)
    },

    health: {
      stripeStatus: await getStripeServiceStatus(),
      webhookStatus: await getWebhookHealth(),
      processingTimes: await getPaymentProcessingTimes(timeframe),
      errorRates: await getPaymentErrorRates(timeframe)
    },

    alerts: await getRecentPaymentAlerts(10)
  }

  res.json({ success: true, data: metrics })
})
```

## 🔍 Performance Monitoring

### 1. Application Performance Monitoring

```typescript
// Performance Monitor Service
class PerformanceMonitor {
  private metricsCollector = new Map()
  private alertThresholds = {
    responseTime: 2000,     // 2 second response time
    errorRate: 0.01,        // 1% error rate
    memoryUsage: 0.85,      // 85% memory usage
    cpuUsage: 0.80          // 80% CPU usage
  }

  trackRequest(req: Request, res: Response, duration: number) {
    const metrics = {
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip
    }

    // Store metrics
    this.metricsCollector.set(`request_${Date.now()}`, metrics)

    // Check thresholds
    if (duration > this.alertThresholds.responseTime) {
      this.alertSlowRequest(metrics)
    }

    // Log performance metrics
    console.log('request_metrics', metrics)
  }

  async alertSlowRequest(metrics: any) {
    if (metrics.duration > this.alertThresholds.responseTime * 2) {
      await smsService.sendSystemAlert(
        `Very slow API response: ${metrics.path} took ${metrics.duration}ms`,
        'high'
      )
    }
  }

  getMetricsSummary(timeframe = '1h') {
    const now = Date.now()
    const timeframeMs = this.parseTimeframe(timeframe)
    const cutoff = now - timeframeMs

    const recentMetrics = Array.from(this.metricsCollector.values())
      .filter(metric => new Date(metric.timestamp).getTime() > cutoff)

    return {
      totalRequests: recentMetrics.length,
      averageResponseTime: this.calculateAverage(recentMetrics, 'duration'),
      p95ResponseTime: this.calculatePercentile(recentMetrics, 'duration', 95),
      errorRate: this.calculateErrorRate(recentMetrics),
      slowestEndpoints: this.getSlowestEndpoints(recentMetrics, 5),
      errorBreakdown: this.getErrorBreakdown(recentMetrics)
    }
  }
}

// Middleware to track all requests
app.use((req, res, next) => {
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime
    performanceMonitor.trackRequest(req, res, duration)
  })

  next()
})
```

### 2. System Resource Monitoring

```typescript
// System Resource Monitor
class SystemMonitor {
  async collectSystemMetrics() {
    const metrics = {
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        usage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal
      },
      cpu: {
        usage: await this.getCPUUsage()
      },
      uptime: process.uptime(),
      eventLoop: {
        delay: await this.getEventLoopDelay()
      },
      timestamp: new Date().toISOString()
    }

    // Check thresholds
    if (metrics.memory.usage > 0.85) {
      await this.sendResourceAlert('High memory usage', metrics.memory.usage, 'memory')
    }

    if (metrics.cpu.usage > 0.80) {
      await this.sendResourceAlert('High CPU usage', metrics.cpu.usage, 'cpu')
    }

    return metrics
  }

  async sendResourceAlert(message: string, value: number, resource: string) {
    await smsService.sendSystemAlert(
      `🔥 ${message}: ${(value * 100).toFixed(1)}%`,
      'high'
    )
  }
}
```

## 📈 Analytics & Business Intelligence

### 1. Business Metrics Dashboard

```typescript
// Business Intelligence Monitor
app.get('/api/monitoring/business', async (req, res) => {
  const timeframe = req.query.timeframe || '24h'

  const metrics = {
    sales: {
      revenue: await getTotalRevenue(timeframe),
      ticketsSold: await getTotalTicketsSold(timeframe),
      conversionRate: await getConversionRate(timeframe),
      averageOrderValue: await getAverageOrderValue(timeframe)
    },

    customers: {
      newRegistrations: await getNewRegistrations(timeframe),
      returningCustomers: await getReturningCustomers(timeframe),
      membershipConversions: await getMembershipConversions(timeframe)
    },

    geography: {
      topCities: await getTopCitiesByRevenue(timeframe),
      geoDistribution: await getGeographicDistribution(timeframe)
    },

    trends: {
      hourlyRevenue: await getHourlyRevenue(timeframe),
      ticketTypeBreakdown: await getTicketTypeBreakdown(timeframe),
      discountUsage: await getDiscountUsage(timeframe)
    },

    forecasting: {
      projectedRevenue: await getRevenueProjection(),
      selloutPredictions: await getSelloutPredictions(),
      inventoryRecommendations: await getInventoryRecommendations()
    }
  }

  res.json({ success: true, data: metrics })
})
```

### 2. Real-Time Event Monitoring

```typescript
// Real-time Event Stream
class EventMonitor {
  private events = new Map()
  private subscribers = new Set()

  trackEvent(eventType: string, data: any) {
    const event = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      id: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Store event
    this.events.set(event.id, event)

    // Notify subscribers (WebSocket, SSE, etc.)
    this.notifySubscribers(event)

    // Trigger alerts if needed
    this.checkEventAlerts(event)
  }

  checkEventAlerts(event: any) {
    switch (event.type) {
      case 'ticket_sale':
        this.handleTicketSaleEvent(event)
        break
      case 'payment_failed':
        this.handlePaymentFailedEvent(event)
        break
      case 'inventory_low':
        this.handleInventoryLowEvent(event)
        break
      case 'system_error':
        this.handleSystemErrorEvent(event)
        break
    }
  }

  async handleTicketSaleEvent(event: any) {
    // Send SMS notification for ticket sales
    await smsService.sendTicketSaleNotification(event.data)

    // Track in analytics
    await analytics.track('ticket_sold', event.data)

    // Check for inventory milestones
    const remaining = event.data.remainingInventory
    if (remaining.ga <= 5 || remaining.vip <= 2) {
      await this.trackEvent('inventory_low', {
        cityId: event.data.cityId,
        remaining
      })
    }
  }
}
```

## 🚨 Alert Configuration

### 1. Alert Severity Levels

```typescript
const ALERT_SEVERITY = {
  LOW: {
    color: '#36B9CC',
    icon: 'ℹ️',
    sms: false,
    email: true,
    slack: true,
    escalation: false
  },
  MEDIUM: {
    color: '#F6C23E',
    icon: '⚠️',
    sms: false,
    email: true,
    slack: true,
    escalation: false
  },
  HIGH: {
    color: '#E74A3B',
    icon: '🚨',
    sms: true,
    email: true,
    slack: true,
    escalation: false
  },
  CRITICAL: {
    color: '#000000',
    icon: '💀',
    sms: true,
    email: true,
    slack: true,
    escalation: true,
    escalationDelay: 5 * 60 * 1000 // 5 minutes
  }
}
```

### 2. Alert Routing Configuration

```typescript
const ALERT_ROUTING = {
  sms: {
    primary: ['+1-352-556-8981'],
    secondary: ['+1-813-520-3348'],
    escalation: ['+1-555-MANAGER']
  },

  email: {
    primary: ['alerts@6fbmethodologies.com'],
    secondary: ['support@6fbmethodologies.com'],
    escalation: ['management@6fbmethodologies.com']
  },

  slack: {
    channels: {
      general: '#alerts',
      critical: '#critical-alerts',
      inventory: '#inventory-alerts',
      payments: '#payment-alerts'
    },
    webhookUrl: process.env.SLACK_WEBHOOK_URL
  },

  discord: {
    enabled: process.env.DISCORD_WEBHOOK_URL ? true : false,
    webhookUrl: process.env.DISCORD_WEBHOOK_URL
  }
}
```

## 📊 Monitoring Dashboard Setup

### 1. Health Check Endpoint

```typescript
// Comprehensive health check
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version,

    services: {
      database: await checkDatabaseHealth(),
      stripe: await checkStripeHealth(),
      sms: await checkSMSHealth(),
      email: await checkEmailHealth(),
      inventory: await checkInventoryHealth()
    },

    metrics: {
      memory: process.memoryUsage(),
      cpu: await getCPUUsage(),
      eventLoop: await getEventLoopDelay()
    },

    external: {
      stripe: await pingStripeAPI(),
      twilio: await pingTwilioAPI(),
      sendgrid: await pingSendGridAPI()
    }
  }

  // Determine overall health status
  const unhealthyServices = Object.values(health.services)
    .filter(service => service.status !== 'healthy').length

  if (unhealthyServices > 0) {
    health.status = unhealthyServices > 2 ? 'unhealthy' : 'degraded'
  }

  const statusCode = health.status === 'healthy' ? 200 : 503
  res.status(statusCode).json(health)
})
```

### 2. Metrics Collection Endpoint

```typescript
// Prometheus-style metrics endpoint
app.get('/api/metrics', (req, res) => {
  const metrics = [
    // HTTP metrics
    `http_requests_total{method="GET",status="200"} ${httpMetrics.getRequests('GET', 200)}`,
    `http_requests_total{method="POST",status="200"} ${httpMetrics.getRequests('POST', 200)}`,
    `http_request_duration_seconds{quantile="0.5"} ${httpMetrics.getP50()}`,
    `http_request_duration_seconds{quantile="0.95"} ${httpMetrics.getP95()}`,

    // Business metrics
    `workshop_tickets_sold_total{type="ga"} ${await getTotalTicketsSold('ga')}`,
    `workshop_tickets_sold_total{type="vip"} ${await getTotalTicketsSold('vip')}`,
    `workshop_revenue_total ${await getTotalRevenue()}`,

    // System metrics
    `nodejs_memory_heap_used_bytes ${process.memoryUsage().heapUsed}`,
    `nodejs_memory_heap_total_bytes ${process.memoryUsage().heapTotal}`,
    `nodejs_uptime_seconds ${process.uptime()}`,

    // SMS metrics
    `sms_notifications_sent_total ${smsMetrics.getTotalSent()}`,
    `sms_notifications_failed_total ${smsMetrics.getTotalFailed()}`,

    // Inventory metrics
    `inventory_tickets_available{city="dallas",type="ga"} ${await getAvailableTickets('dallas', 'ga')}`,
    `inventory_tickets_available{city="dallas",type="vip"} ${await getAvailableTickets('dallas', 'vip')}`
  ]

  res.set('Content-Type', 'text/plain')
  res.send(metrics.join('\n'))
})
```

## 🔧 Monitoring Tools Integration

### 1. Grafana Dashboard Configuration

```yaml
# grafana-dashboard.json
{
  "dashboard": {
    "title": "6FB Workshop Monitoring",
    "panels": [
      {
        "title": "Ticket Sales",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(workshop_tickets_sold_total[1h])",
            "legendFormat": "Tickets/Hour"
          }
        ]
      },
      {
        "title": "Revenue",
        "type": "graph",
        "targets": [
          {
            "expr": "workshop_revenue_total",
            "legendFormat": "Total Revenue"
          }
        ]
      },
      {
        "title": "Inventory Status",
        "type": "table",
        "targets": [
          {
            "expr": "inventory_tickets_available",
            "format": "table"
          }
        ]
      },
      {
        "title": "System Health",
        "type": "stat",
        "targets": [
          {
            "expr": "up",
            "legendFormat": "Service Status"
          }
        ]
      }
    ]
  }
}
```

### 2. Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: '6fb-workshop'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### 3. Alert Rules

```yaml
# alert_rules.yml
groups:
  - name: 6fb-workshop-alerts
    rules:
      - alert: HighPaymentFailureRate
        expr: rate(http_requests_total{status=~"4..|5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High payment failure rate detected"

      - alert: LowInventory
        expr: inventory_tickets_available < 5
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "Low inventory: {{ $labels.city }} {{ $labels.type }}"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
```

This comprehensive monitoring setup ensures proactive monitoring, rapid issue detection, and automated alerting for the 6FB Methodologies Workshop system.