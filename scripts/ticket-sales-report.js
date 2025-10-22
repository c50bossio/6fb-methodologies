#!/usr/bin/env node

/**
 * Ticket Sales Report CLI
 *
 * Generates a comprehensive ticket sales report with city breakdowns.
 *
 * Usage:
 *   npm run report:tickets                           # All tickets
 *   npm run report:tickets -- --city dallas-jan-2026 # Specific city
 *   npm run report:tickets -- --start 2025-01-01     # Date range
 *   npm run report:tickets -- --start 2025-01-01 --end 2025-03-31
 */

const { Pool } = require('pg')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const result = {}

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1]) {
      result.startDate = args[i + 1]
      i++
    } else if (args[i] === '--end' && args[i + 1]) {
      result.endDate = args[i + 1]
      i++
    } else if (args[i] === '--city' && args[i + 1]) {
      result.cityId = args[i + 1]
      i++
    }
  }

  return result
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// Format date
function formatDate(dateString) {
  if (dateString === 'TBA') return dateString
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Print table divider
function printDivider(width = 100) {
  console.log('═'.repeat(width))
}

// Print header
function printHeader(text, width = 100) {
  const padding = Math.max(0, Math.floor((width - text.length - 2) / 2))
  console.log('║' + ' '.repeat(padding) + text + ' '.repeat(width - padding - text.length - 2) + '║')
}

// Generate and display report
async function generateReport() {
  try {
    const filters = parseArgs()

    // Build WHERE clause
    const whereConditions = []
    const queryParams = []
    let paramIndex = 1

    if (filters.startDate) {
      whereConditions.push(`t.created_at >= $${paramIndex}::timestamp`)
      queryParams.push(filters.startDate)
      paramIndex++
    }

    if (filters.endDate) {
      whereConditions.push(`t.created_at <= $${paramIndex}::timestamp + interval '1 day'`)
      queryParams.push(filters.endDate)
      paramIndex++
    }

    if (filters.cityId) {
      whereConditions.push(`t.city_id = $${paramIndex}`)
      queryParams.push(filters.cityId)
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
      pool.query(summaryQuery, queryParams),
    ])

    // Format data
    const citySales = citySalesResult.rows.map((row) => ({
      cityId: row.city_id,
      cityName: row.city_name,
      state: row.state,
      workshopDate: row.workshop_date
        ? new Date(row.workshop_date).toISOString().split('T')[0]
        : 'TBA',
      venue: row.venue_name || 'TBA',
      gaTickets: parseInt(row.ga_tickets) || 0,
      vipTickets: parseInt(row.vip_tickets) || 0,
      totalTickets: parseInt(row.total_tickets) || 0,
      totalRevenue: parseInt(row.total_revenue_cents) / 100 || 0,
    }))

    const summaryRow = summaryResult.rows[0]
    const summary = {
      totalTicketsSold: parseInt(summaryRow.total_tickets) || 0,
      totalGATickets: parseInt(summaryRow.total_ga) || 0,
      totalVIPTickets: parseInt(summaryRow.total_vip) || 0,
      totalRevenue: parseInt(summaryRow.total_revenue_cents) / 100 || 0,
      uniqueCities: parseInt(summaryRow.unique_cities) || 0,
      uniqueCustomers: parseInt(summaryRow.unique_customers) || 0,
    }

    // Display Report
    console.log('\n')
    printDivider()
    printHeader('TICKET SALES REPORT')
    printDivider()

    // Display filters if any
    if (filters.startDate || filters.endDate || filters.cityId) {
      console.log('║ Filters:')
      if (filters.startDate) console.log(`║   Start Date: ${filters.startDate}`)
      if (filters.endDate) console.log(`║   End Date: ${filters.endDate}`)
      if (filters.cityId) console.log(`║   City: ${filters.cityId}`)
      printDivider()
    }

    // Display summary
    console.log('║')
    console.log(`║ OVERALL SUMMARY`)
    console.log('║')
    console.log(`║   Total Tickets Sold:    ${summary.totalTicketsSold.toLocaleString()}`)
    console.log(`║   GA Tickets:            ${summary.totalGATickets.toLocaleString()}`)
    console.log(`║   VIP Tickets:           ${summary.totalVIPTickets.toLocaleString()}`)
    console.log(`║   Total Revenue:         ${formatCurrency(summary.totalRevenue)}`)
    console.log(`║   Unique Cities:         ${summary.uniqueCities}`)
    console.log(`║   Unique Customers:      ${summary.uniqueCustomers}`)
    console.log('║')
    printDivider()

    // Display city breakdown
    if (citySales.length > 0) {
      console.log('║')
      console.log(`║ SALES BY CITY`)
      console.log('║')
      printDivider()

      // Table header
      console.log(
        '║ ' +
          'City'.padEnd(20) +
          'Date'.padEnd(15) +
          'GA'.padStart(6) +
          ' ' +
          'VIP'.padStart(6) +
          ' ' +
          'Total'.padStart(6) +
          ' ' +
          'Revenue'.padStart(12) +
          '  ' +
          'Venue'.padEnd(30)
      )
      printDivider()

      // Table rows
      citySales.forEach((city) => {
        const cityState = `${city.cityName}, ${city.state}`.padEnd(20)
        const date = formatDate(city.workshopDate).padEnd(15)
        const ga = city.gaTickets.toString().padStart(6)
        const vip = city.vipTickets.toString().padStart(6)
        const total = city.totalTickets.toString().padStart(6)
        const revenue = formatCurrency(city.totalRevenue).padStart(12)
        const venue = (city.venue.length > 30 ? city.venue.substring(0, 27) + '...' : city.venue).padEnd(30)

        console.log(`║ ${cityState}${date}${ga} ${vip} ${total} ${revenue}  ${venue}`)
      })

      printDivider()
    } else {
      console.log('║')
      console.log('║ No ticket sales found matching the criteria.')
      console.log('║')
      printDivider()
    }

    console.log('\n')

    // Close database connection
    await pool.end()
  } catch (error) {
    console.error('\n❌ Error generating report:', error)
    if (error instanceof Error) {
      console.error('Details:', error.message)
    }
    await pool.end()
    process.exit(1)
  }
}

// Run the report
generateReport()
