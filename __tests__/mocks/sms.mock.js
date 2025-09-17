// SMS Service Mock for Testing
import { jest } from '@jest/globals'

// Mock Twilio client
const mockTwilioClient = {
  messages: {
    create: jest.fn(),
  },
}

// Mock successful SMS sending
mockTwilioClient.messages.create.mockResolvedValue({
  sid: 'SM_mock_message_id',
  status: 'sent',
  to: '+1987654321',
  from: '+1234567890',
  body: 'Mock SMS message',
  dateCreated: new Date(),
  price: '0.0075',
  priceUnit: 'USD',
})

// SMS Service Mock
export const mockSmsService = {
  sendTicketSaleNotification: jest.fn(),
  sendSystemAlert: jest.fn(),
  sendWelcomeMessage: jest.fn(),
  sendInventoryAlert: jest.fn(),
  client: mockTwilioClient,
}

// Mock successful ticket sale notification
mockSmsService.sendTicketSaleNotification.mockResolvedValue({
  success: true,
  messageId: 'SM_ticket_notification',
  cost: 0.0075,
  deliveredAt: new Date(),
})

// Mock successful system alert
mockSmsService.sendSystemAlert.mockResolvedValue({
  success: true,
  messageId: 'SM_system_alert',
  priority: 'high',
  alertType: 'inventory_low',
})

// Helper functions for different test scenarios
export const mockSmsSuccess = (messageId = 'SM_success') => {
  mockSmsService.sendTicketSaleNotification.mockResolvedValueOnce({
    success: true,
    messageId,
    cost: 0.0075,
    deliveredAt: new Date(),
  })
}

export const mockSmsFailure = (error = 'SMS delivery failed') => {
  mockSmsService.sendTicketSaleNotification.mockResolvedValueOnce({
    success: false,
    error,
    retryCount: 3,
    lastAttempt: new Date(),
  })
}

export const mockSmsRateLimit = () => {
  mockTwilioClient.messages.create.mockRejectedValueOnce({
    code: 20429,
    message: 'Too Many Requests',
    status: 429,
  })
}

export const mockSmsInvalidNumber = () => {
  mockTwilioClient.messages.create.mockRejectedValueOnce({
    code: 21211,
    message: 'Invalid phone number',
    status: 400,
  })
}

export const mockHighVolumeScenario = () => {
  // Simulate delay for high volume
  mockTwilioClient.messages.create.mockImplementation(
    () => new Promise(resolve => setTimeout(resolve, 2000))
  )
}

// Mock inventory-based SMS scenarios
export const mockInventoryAlerts = {
  lowStock: () => mockSmsService.sendInventoryAlert.mockResolvedValueOnce({
    success: true,
    messageId: 'SM_low_stock',
    alertType: 'low_stock',
    threshold: 10,
    remaining: 5,
  }),

  soldOut: () => mockSmsService.sendInventoryAlert.mockResolvedValueOnce({
    success: true,
    messageId: 'SM_sold_out',
    alertType: 'sold_out',
    city: 'Dallas',
    ticketType: 'VIP',
  }),

  rapidSales: () => mockSmsService.sendInventoryAlert.mockResolvedValueOnce({
    success: true,
    messageId: 'SM_rapid_sales',
    alertType: 'rapid_sales',
    rate: '5 tickets/minute',
    city: 'Atlanta',
  }),
}

export default mockSmsService