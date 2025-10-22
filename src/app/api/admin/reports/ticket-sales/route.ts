import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

interface TicketSalesReportParams {
  startDate?: string
  endDate?: string
  cityId?: string
}

interface CityTicketSales {
  cityId: string
  cityName: string
  state: string
  workshopDate: string
  venue: string
  gaTickets: number
  vipTickets: number
  totalTickets: number
  totalRevenue: number
}

interface TicketSalesReport {
  summary: {
    totalTicketsSold: number
    totalGATickets: number
    totalVIPTickets: number
    totalRevenue: number
    uniqueCities: number
    uniqueCustomers: number
  }
  citySales: CityTicketSales[]
  filters: {
    startDate?: string
    endDate?: string
    cityId?: string
  }
  generatedAt: string
}

/**
 * GET /api/admin/reports/ticket-sales
 *
 * Generate a comprehensive ticket sales report with city breakdowns
 *
 * Query Parameters:
 * - startDate: ISO date string (YYYY-MM-DD) - filter tickets created on or after this date
 * - endDate: ISO date string (YYYY-MM-DD) - filter tickets created on or before this date
 * - cityId: string - filter by specific city ID
 *
 * Authentication: Basic auth required (ADMIN_PASSWORD env var)
 */
export async function GET(request: NextRequest) {
  try {
    // Basic authentication check
    const authHeader = request.headers.get('authorization')
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin authentication not configured' },
        { status: 500 }
      )
    }

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: { 'WWW-Authenticate': 'Basic' } }
      )
    }

    const auth = authHeader.split(' ')[1]
    const [, password] = Buffer.from(auth, 'base64').toString().split(':')

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const params: TicketSalesReportParams = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      cityId: searchParams.get('cityId') || undefined,
    }

    // Build the SQL query with filters
    let whereConditions: string[] = []
    let queryParams: any[] = []
    let paramIndex = 1

    if (params.startDate) {
      whereConditions.push(`t.created_at >= $${paramIndex}::timestamp`)
      queryParams.push(params.startDate)
      paramIndex++
    }

    if (params.endDate) {
      whereConditions.push(`t.created_at <= $${paramIndex}::timestamp + interval '1 day'`)
      queryParams.push(params.endDate)
      paramIndex++
    }

    if (params.cityId) {
      whereConditions.push(`t.city_id = $${paramIndex}`)
      queryParams.push(params.cityId)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : ''

    // Query for city-level ticket sales
    const citySalesQuery = `
      SELECT
        c.id as city_id,
        c.name as city_name,
        c.state,
        c.workshop_date,
        c.venue_name,
        COUNT(CASE WHEN t.tier = 'ga' THEN 1 END) as ga_tickets,
        COUNT(CASE WHEN t.tier = 'vip' THEN 1 END) as vip_tickets,
        COUNT(*) as total_tickets,
        COALESCE(SUM(p.amount_cents), 0) as total_revenue_cents
      FROM tickets t
      JOIN cities c ON t.city_id = c.id
      LEFT JOIN payments p ON t.payment_id = p.id AND p.status = 'succeeded'
      ${whereClause}
      GROUP BY c.id, c.name, c.state, c.workshop_date, c.venue_name
      ORDER BY c.workshop_date ASC, total_tickets DESC
    `

    // Query for overall summary
    const summaryQuery = `
      SELECT
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN t.tier = 'ga' THEN 1 END) as total_ga,
        COUNT(CASE WHEN t.tier = 'vip' THEN 1 END) as total_vip,
        COUNT(DISTINCT t.city_id) as unique_cities,
        COUNT(DISTINCT t.customer_id) as unique_customers,
        COALESCE(SUM(p.amount_cents), 0) as total_revenue_cents
      FROM tickets t
      LEFT JOIN payments p ON t.payment_id = p.id AND p.status = 'succeeded'
      ${whereClause}
    `

    // Execute queries
    const [citySalesResult, summaryResult] = await Promise.all([
      pool.query(citySalesQuery, queryParams),
      pool.query(summaryQuery, queryParams)
    ])

    // Format city sales data
    const citySales: CityTicketSales[] = citySalesResult.rows.map(row => ({
      cityId: row.city_id,
      cityName: row.city_name,
      state: row.state,
      workshopDate: row.workshop_date ? new Date(row.workshop_date).toISOString().split('T')[0] : 'TBA',
      venue: row.venue_name || 'TBA',
      gaTickets: parseInt(row.ga_tickets) || 0,
      vipTickets: parseInt(row.vip_tickets) || 0,
      totalTickets: parseInt(row.total_tickets) || 0,
      totalRevenue: parseInt(row.total_revenue_cents) / 100 || 0,
    }))

    // Format summary data
    const summaryRow = summaryResult.rows[0]
    const summary = {
      totalTicketsSold: parseInt(summaryRow.total_tickets) || 0,
      totalGATickets: parseInt(summaryRow.total_ga) || 0,
      totalVIPTickets: parseInt(summaryRow.total_vip) || 0,
      totalRevenue: parseInt(summaryRow.total_revenue_cents) / 100 || 0,
      uniqueCities: parseInt(summaryRow.unique_cities) || 0,
      uniqueCustomers: parseInt(summaryRow.unique_customers) || 0,
    }

    // Build the complete report
    const report: TicketSalesReport = {
      summary,
      citySales,
      filters: params,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(report, { status: 200 })

  } catch (error) {
    console.error('Error generating ticket sales report:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate ticket sales report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
