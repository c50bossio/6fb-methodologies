import db from '../database';
import type {
  Customer,
  Payment,
  Ticket,
} from '@/types';

export interface CustomerRegistrationData {
  // Customer info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  zipCode: string;

  // Registration details
  cityId: string;
  ticketType: 'ga' | 'vip';
  quantity: number;
  totalAmount: number;
  discountType?: 'member' | 'bulk' | 'both';
  discountAmount?: number;

  // Stripe data
  stripeCustomerId?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;

  // Verification status
  isSixFBMember: boolean;
  isVerifiedMember: boolean;
  membershipType?: string;
  skoolUserId?: string;
}

export interface CustomerUpdateData extends Partial<CustomerRegistrationData> {
  customerId?: string;
}

export class CustomerService {
  constructor() {
    // Use the singleton database instance
  }

  /**
   * Save or update customer registration data
   */
  async upsert(data: CustomerRegistrationData): Promise<{
    customer: Customer;
    payment?: Payment;
    tickets: Ticket[];
  }> {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Check if customer exists by email
      const existingCustomer = await this.findByEmail(data.email);

      let customer: Customer;

      if (existingCustomer) {
        // Update existing customer
        customer = await this.updateCustomer(existingCustomer.id, data, client);
      } else {
        // Create new customer
        customer = await this.createCustomer(data, client);
      }

      // Create payment record if Stripe data is provided
      let payment: Payment | undefined;
      if (data.stripePaymentIntentId) {
        payment = await this.createPayment(customer.id, data, client);
      }

      // Create ticket records (only if payment was created)
      const tickets = payment
        ? await this.createTickets(customer.id, payment.id, data, client)
        : [];

      await client.query('COMMIT');

      return { customer, payment, tickets };
    } catch (error) {
      await client.query('ROLLBACK');
      // eslint-disable-next-line no-console
      console.error('CustomerService upsert error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find customer by email
   */
  async findByEmail(email: string): Promise<Customer | null> {
    const client = await db.getClient();

    try {
      const result = await client.query(
        'SELECT * FROM customers WHERE email = $1 LIMIT 1',
        [email.toLowerCase()]
      );

      return result.rows.length > 0 ? (result.rows[0] as Customer) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Find customer by ID
   */
  async findById(customerId: string): Promise<Customer | null> {
    const client = await db.getClient();

    try {
      const result = await client.query(
        'SELECT * FROM customers WHERE id = $1 LIMIT 1',
        [customerId]
      );

      return result.rows.length > 0 ? (result.rows[0] as Customer) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Get customer with their payments and tickets
   */
  async getCustomerDetails(customerId: string): Promise<{
    customer: Customer;
    payments: Payment[];
    tickets: Ticket[];
  } | null> {
    const client = await db.getClient();

    try {
      // Get customer
      const customerResult = await client.query(
        'SELECT * FROM customers WHERE id = $1',
        [customerId]
      );

      if (customerResult.rows.length === 0) {
        return null;
      }

      const customer = customerResult.rows[0] as Customer;

      // Get payments
      const paymentsResult = await client.query(
        'SELECT * FROM payments WHERE customer_id = $1 ORDER BY created_at DESC',
        [customerId]
      );

      // Get tickets
      const ticketsResult = await client.query(
        'SELECT * FROM tickets WHERE customer_id = $1 ORDER BY created_at DESC',
        [customerId]
      );

      return {
        customer,
        payments: paymentsResult.rows as Payment[],
        tickets: ticketsResult.rows as Ticket[],
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get all customers with pagination
   */
  async getAllCustomers(
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      cityId?: string;
    } = {}
  ): Promise<{
    customers: Customer[];
    total: number;
  }> {
    const { limit = 50, offset = 0, search, cityId } = options;
    const client = await db.getClient();

    try {
      let whereClause = '';
      const params: unknown[] = [limit, offset];
      let paramIndex = 3;

      const conditions: string[] = [];

      if (search) {
        conditions.push(`(
          first_name ILIKE $${paramIndex} OR
          last_name ILIKE $${paramIndex} OR
          email ILIKE $${paramIndex}
        )`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (cityId) {
        conditions.push(`city_id = $${paramIndex}`);
        params.push(cityId);
        paramIndex++;
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      // Get customers
      const customersResult = await client.query(
        `
        SELECT * FROM customers
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `,
        params
      );

      // Get total count
      const countResult = await client.query(
        `
        SELECT COUNT(*) as count FROM customers ${whereClause}
      `,
        params.slice(2)
      );

      return {
        customers: customersResult.rows as Customer[],
        total: parseInt(countResult.rows[0].count),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Private method to create new customer
   */
  private async createCustomer(
    data: CustomerRegistrationData,
    client: unknown
  ): Promise<Customer> {
    const result = await client.query(
      `
      INSERT INTO customers (
        first_name, last_name, email, phone, stripe_customer_id, is_sixfb_member
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING *
    `,
      [
        data.firstName,
        data.lastName,
        data.email.toLowerCase(),
        data.phone,
        data.stripeCustomerId,
        data.isSixFBMember,
      ]
    );

    return result.rows[0] as Customer;
  }

  /**
   * Private method to update existing customer
   */
  private async updateCustomer(
    customerId: string,
    data: CustomerRegistrationData,
    client: unknown
  ): Promise<Customer> {
    const result = await client.query(
      `
      UPDATE customers SET
        first_name = $2,
        last_name = $3,
        phone = $4,
        stripe_customer_id = COALESCE($5, stripe_customer_id),
        is_sixfb_member = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `,
      [
        customerId,
        data.firstName,
        data.lastName,
        data.phone,
        data.stripeCustomerId,
        data.isSixFBMember,
      ]
    );

    return result.rows[0] as Customer;
  }

  /**
   * Private method to create payment record
   */
  private async createPayment(
    customerId: string,
    data: CustomerRegistrationData,
    client: unknown
  ): Promise<Payment> {
    const result = await client.query(
      `
      INSERT INTO payments (
        customer_id, stripe_payment_intent_id, stripe_session_id,
        amount_cents, currency, status, payment_method
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *
    `,
      [
        customerId,
        data.stripePaymentIntentId!,
        data.stripeSessionId,
        data.totalAmount,
        'usd',
        'succeeded',
        'card',
      ]
    );

    return result.rows[0] as Payment;
  }

  /**
   * Private method to create ticket records
   */
  private async createTickets(
    customerId: string,
    paymentId: string,
    data: CustomerRegistrationData,
    client: unknown
  ): Promise<Ticket[]> {
    const tickets: Ticket[] = [];

    for (let i = 0; i < data.quantity; i++) {
      // Generate unique ticket number using database function
      const ticketNumberResult = await client.query(
        'SELECT generate_ticket_number($1, $2::ticket_tier) as ticket_number',
        [data.cityId, data.ticketType]
      );
      const ticketNumber = ticketNumberResult.rows[0].ticket_number;

      const result = await client.query(
        `
        INSERT INTO tickets (payment_id, customer_id, city_id, tier, ticket_number)
        VALUES ($1, $2, $3, $4::ticket_tier, $5)
        RETURNING *
      `,
        [paymentId, customerId, data.cityId, data.ticketType, ticketNumber]
      );

      tickets.push(result.rows[0] as Ticket);
    }

    return tickets;
  }

  /**
   * Get registration analytics
   */
  async getAnalytics(
    options: {
      startDate?: Date;
      endDate?: Date;
      cityId?: string;
    } = {}
  ): Promise<{
    totalCustomers: number;
    totalRevenue: number;
    ticketsSold: {
      ga: number;
      vip: number;
    };
    topCities: Array<{
      cityId: string;
      customerCount: number;
      revenue: number;
    }>;
  }> {
    const client = await db.getClient();

    try {
      const { startDate, endDate, cityId } = options;
      let whereClause = '';
      const params: unknown[] = [];
      let paramIndex = 1;

      const conditions: string[] = [];

      if (startDate) {
        conditions.push(`c.created_at >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`c.created_at <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }

      if (cityId) {
        conditions.push(`c.city_id = $${paramIndex}`);
        params.push(cityId);
        paramIndex++;
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      // Total customers and revenue
      const totalsResult = await client.query(
        `
        SELECT
          COUNT(DISTINCT c.id) as total_customers,
          COALESCE(SUM(p.amount_cents), 0) as total_revenue
        FROM customers c
        LEFT JOIN payments p ON c.id = p.customer_id
        ${whereClause}
      `,
        params
      );

      // Tickets sold by type
      const ticketsResult = await client.query(
        `
        SELECT
          tier,
          COUNT(*) as count
        FROM tickets t
        JOIN customers c ON t.customer_id = c.id
        ${whereClause.replace('c.', 'c.')}
        GROUP BY tier
      `,
        params
      );

      // Top cities - need to get from tickets table since customers don't have city_id
      const citiesResult = await client.query(
        `
        SELECT
          t.city_id,
          COUNT(DISTINCT t.customer_id) as customer_count,
          COALESCE(SUM(p.amount_cents), 0) as revenue
        FROM tickets t
        JOIN customers c ON t.customer_id = c.id
        LEFT JOIN payments p ON c.id = p.customer_id
        ${whereClause.replace('c.city_id', 't.city_id')}
        GROUP BY t.city_id
        ORDER BY revenue DESC
        LIMIT 10
      `,
        params
      );

      const ticketsSold = { ga: 0, vip: 0 };
      ticketsResult.rows.forEach((row: { tier: 'ga' | 'vip'; count: string }) => {
        ticketsSold[row.tier as 'ga' | 'vip'] = parseInt(row.count);
      });

      return {
        totalCustomers: parseInt(totalsResult.rows[0].total_customers),
        totalRevenue: parseFloat(totalsResult.rows[0].total_revenue),
        ticketsSold,
        topCities: citiesResult.rows.map((row: { city_id: string; customer_count: string; revenue: string }) => ({
          cityId: row.city_id,
          customerCount: parseInt(row.customer_count),
          revenue: parseFloat(row.revenue),
        })),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get recent ticket purchases with full details
   */
  async getRecentPurchases(
    options: {
      limit?: number;
      offset?: number;
      cityId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    purchases: Array<{
      // Customer info
      customerId: string;
      customerEmail: string;
      customerName: string;
      customerPhone: string;
      isSixFBMember: boolean;

      // Payment info
      paymentId: string;
      stripeSessionId: string;
      stripePaymentIntentId: string;
      amountCents: number;
      discountAmountCents: number;
      discountReason: string;
      paymentStatus: string;

      // Workshop info
      cityId: string;
      cityName: string;
      workshopDate: string;

      // Tickets
      tickets: Array<{
        ticketId: string;
        ticketNumber: string;
        tier: 'ga' | 'vip';
      }>;

      // Timestamps
      purchaseDate: string;
    }>;
    total: number;
  }> {
    const { limit = 50, offset = 0, cityId, startDate, endDate } = options;
    const client = await db.getClient();

    try {
      let whereClause = '';
      const params: unknown[] = [limit, offset];
      let paramIndex = 3;

      const conditions: string[] = ['p.status = \'succeeded\''];

      if (cityId) {
        conditions.push(`c.id = $${paramIndex}`);
        params.push(cityId);
        paramIndex++;
      }

      if (startDate) {
        conditions.push(`p.created_at >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`p.created_at <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      // Get purchases with full details
      const purchasesResult = await client.query(
        `
        SELECT
          cu.id as customer_id,
          cu.email as customer_email,
          cu.first_name || ' ' || cu.last_name as customer_name,
          cu.phone as customer_phone,
          cu.is_sixfb_member,

          p.id as payment_id,
          p.stripe_session_id,
          p.stripe_payment_intent_id,
          p.amount_cents,
          p.discount_amount_cents,
          p.discount_reason,
          p.status as payment_status,
          p.created_at as purchase_date,

          c.id as city_id,
          c.name as city_name,
          c.workshop_date,

          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'ticketId', t.id,
              'ticketNumber', t.ticket_number,
              'tier', t.tier
            ) ORDER BY t.created_at
          ) as tickets

        FROM payments p
        JOIN customers cu ON p.customer_id = cu.id
        JOIN tickets t ON p.id = t.payment_id
        JOIN cities c ON t.city_id = c.id
        ${whereClause}
        GROUP BY cu.id, p.id, c.id
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2
      `,
        params
      );

      // Get total count
      const countResult = await client.query(
        `
        SELECT COUNT(DISTINCT p.id) as count
        FROM payments p
        JOIN customers cu ON p.customer_id = cu.id
        JOIN tickets t ON p.id = t.payment_id
        JOIN cities c ON t.city_id = c.id
        ${whereClause}
      `,
        params.slice(2)
      );

      const purchases = purchasesResult.rows.map((row: Record<string, unknown>) => ({
        customerId: row.customer_id,
        customerEmail: row.customer_email,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        isSixFBMember: row.is_sixfb_member,

        paymentId: row.payment_id,
        stripeSessionId: row.stripe_session_id,
        stripePaymentIntentId: row.stripe_payment_intent_id,
        amountCents: row.amount_cents,
        discountAmountCents: row.discount_amount_cents || 0,
        discountReason: row.discount_reason || '',
        paymentStatus: row.payment_status,

        cityId: row.city_id,
        cityName: row.city_name,
        workshopDate: row.workshop_date,

        tickets: row.tickets,

        purchaseDate: row.purchase_date,
      }));

      return {
        purchases,
        total: parseInt(countResult.rows[0].count),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await db.close();
  }
}

// Export singleton instance
export const customerService = new CustomerService();
