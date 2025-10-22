# Ticket Sales Report

This document describes how to generate and use the ticket sales report for the 6FB Methodologies workshop system.

## Overview

The ticket sales report provides a comprehensive breakdown of ticket sales across all workshop cities, including:
- Total tickets sold overall
- Breakdown by city (GA and VIP)
- Revenue metrics
- Workshop dates and venues
- Unique customer count

## Usage

### CLI Command

Run the report from the command line:

```bash
# Generate report for all tickets
npm run report:tickets

# Filter by city
npm run report:tickets -- --city dallas-jan-2026

# Filter by date range
npm run report:tickets -- --start 2025-01-01

# Combine filters
npm run report:tickets -- --start 2025-01-01 --end 2025-03-31 --city atlanta-feb-2026
```

### Command Line Options

| Option | Description | Format | Example |
|--------|-------------|--------|---------|
| `--start` | Start date (inclusive) | YYYY-MM-DD | `--start 2025-01-01` |
| `--end` | End date (inclusive) | YYYY-MM-DD | `--end 2025-12-31` |
| `--city` | Filter by city ID | string | `--city dallas-jan-2026` |

### API Endpoint

The report is also available via HTTP API:

**Endpoint:** `GET /api/admin/reports/ticket-sales`

**Authentication:** Basic auth with `ADMIN_PASSWORD` environment variable

**Query Parameters:**
- `startDate` (optional): ISO date string (YYYY-MM-DD)
- `endDate` (optional): ISO date string (YYYY-MM-DD)
- `cityId` (optional): City identifier

**Example Request:**
```bash
curl -u admin:$ADMIN_PASSWORD \
  "http://localhost:3000/api/admin/reports/ticket-sales?startDate=2025-01-01&endDate=2025-03-31"
```

**Example Response:**
```json
{
  "summary": {
    "totalTicketsSold": 150,
    "totalGATickets": 105,
    "totalVIPTickets": 45,
    "totalRevenue": 127500.00,
    "uniqueCities": 6,
    "uniqueCustomers": 135
  },
  "citySales": [
    {
      "cityId": "dallas-jan-2026",
      "cityName": "Dallas",
      "state": "TX",
      "workshopDate": "2026-01-25",
      "venue": "Dallas Convention Center",
      "gaTickets": 30,
      "vipTickets": 10,
      "totalTickets": 40,
      "totalRevenue": 45000.00
    }
  ],
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-03-31"
  },
  "generatedAt": "2025-10-22T12:00:00.000Z"
}
```

## Report Output

### CLI Output Example

```
═══════════════════════════════════════════════════════════════════════
║                         TICKET SALES REPORT                         ║
═══════════════════════════════════════════════════════════════════════
║
║ OVERALL SUMMARY
║
║   Total Tickets Sold:    150
║   GA Tickets:            105
║   VIP Tickets:           45
║   Total Revenue:         $127,500.00
║   Unique Cities:         6
║   Unique Customers:      135
║
═══════════════════════════════════════════════════════════════════════
║
║ SALES BY CITY
║
═══════════════════════════════════════════════════════════════════════
║ City                Date              GA    VIP  Total      Revenue  Venue
═══════════════════════════════════════════════════════════════════════
║ Dallas, TX          Jan 25, 2026      30     10     40  $45,000.00  Dallas Convention Center
║ Atlanta, GA         Feb 22, 2026      25     10     35  $40,000.00  Atlanta Conference Hall
║ Las Vegas, NV       Mar 8, 2026       20      8     28  $28,000.00  Las Vegas Event Space
║ New York, NY        Apr 26, 2026      15      9     24  $27,500.00  NYC Workshop Venue
║ Chicago, IL         May 31, 2026      10      5     15  $17,500.00  Chicago Learning Center
║ San Francisco, CA   Jun 14, 2026       5      3      8  $12,000.00  SF Professional Space
═══════════════════════════════════════════════════════════════════════
```

## Report Metrics

### Summary Metrics

- **Total Tickets Sold**: Count of all tickets across all cities
- **GA Tickets**: Count of General Admission tickets
- **VIP Tickets**: Count of VIP tickets
- **Total Revenue**: Sum of all successful payments
- **Unique Cities**: Number of distinct cities with ticket sales
- **Unique Customers**: Number of unique customers who purchased tickets

### City-Level Metrics

For each city, the report shows:
- **City Name & State**: Workshop location
- **Workshop Date**: Scheduled date of the workshop
- **GA Tickets**: Number of General Admission tickets sold
- **VIP Tickets**: Number of VIP tickets sold
- **Total Tickets**: Sum of GA and VIP tickets for that city
- **Revenue**: Total revenue from ticket sales in that city
- **Venue**: Workshop venue name

## Data Sources

The report queries the following database tables:
- `tickets` - Individual ticket records
- `cities` - Workshop city information
- `payments` - Payment transaction data (only includes succeeded payments)
- `customers` - Customer information for unique customer count

## Filtering Options

### Date Range Filtering

Date filters are applied to the `tickets.created_at` timestamp (when the ticket was purchased):

```bash
# All tickets from January 2025 onwards
npm run report:tickets -- --start 2025-01-01

# Tickets sold in Q1 2025
npm run report:tickets -- --start 2025-01-01 --end 2025-03-31

# Tickets sold until March 2025
npm run report:tickets -- --end 2025-03-31
```

### City Filtering

Filter to a specific workshop city:

```bash
# Only Dallas workshop tickets
npm run report:tickets -- --city dallas-jan-2026

# Only Atlanta workshop tickets
npm run report:tickets -- --city atlanta-feb-2026
```

### Available City IDs

Current workshop cities:
- `dallas-jan-2026` - Dallas, TX (January 25-26, 2026)
- `atlanta-feb-2026` - Atlanta, GA (February 22-23, 2026)
- `lasvegas-mar-2026` - Las Vegas, NV (March 8-9, 2026)
- `nyc-apr-2026` - New York, NY (April 26-27, 2026)
- `chicago-may-2026` - Chicago, IL (May 31 - June 1, 2026)
- `sanfrancisco-jun-2026` - San Francisco, CA (June 14-15, 2026)

## Use Cases

### Sales Performance Analysis

```bash
# View overall sales performance
npm run report:tickets

# Compare Q1 vs Q2 sales
npm run report:tickets -- --start 2026-01-01 --end 2026-03-31
npm run report:tickets -- --start 2026-04-01 --end 2026-06-30
```

### City-Specific Reporting

```bash
# Check Dallas workshop sales
npm run report:tickets -- --city dallas-jan-2026

# Monitor Las Vegas ticket sales progress
npm run report:tickets -- --city lasvegas-mar-2026
```

### Revenue Tracking

```bash
# Total revenue to date
npm run report:tickets

# Revenue in specific period
npm run report:tickets -- --start 2026-01-01 --end 2026-01-31
```

## Technical Details

### File Locations

- **API Route**: `/src/app/api/admin/reports/ticket-sales/route.ts`
- **CLI Script**: `/scripts/ticket-sales-report.ts`
- **Documentation**: `/docs/reports/TICKET-SALES-REPORT.md`

### Database Query

The report uses optimized SQL queries with:
- LEFT JOIN to payments for revenue (only succeeded payments)
- INNER JOIN to cities for location data
- Conditional aggregation for GA/VIP breakdown
- Date range filtering on ticket creation timestamp
- Grouping by city with ordering by workshop date

### Performance Considerations

- The report is optimized for production use with proper indexing
- Large result sets are handled efficiently
- Queries use aggregate functions to minimize data transfer
- Connection pooling ensures database efficiency

## Authentication

Both the API endpoint and CLI script require authentication:

### API Authentication
- Uses HTTP Basic Auth
- Password from `ADMIN_PASSWORD` environment variable
- Username can be any value (e.g., "admin")

### CLI Authentication
- Requires `DATABASE_URL` environment variable
- Reads from `.env.local` automatically
- Direct database access (no HTTP auth needed)

## Troubleshooting

### No tickets found

If the report shows "No ticket sales found matching the criteria":
- Check your date range filters
- Verify the city ID is correct
- Ensure tickets exist in the database

### Authentication errors (API)

If you get 401 errors:
- Ensure `ADMIN_PASSWORD` is set in your environment
- Verify you're using HTTP Basic Auth format
- Check the Authorization header is properly formatted

### Database connection errors (CLI)

If the script fails to connect:
- Verify `DATABASE_URL` is set in `.env.local`
- Check database is running and accessible
- Ensure pg dependency is installed (`npm install pg`)

## Future Enhancements

Potential improvements for future versions:
- Export to CSV/PDF format
- Chart visualizations
- Time-series trends
- Refund tracking
- Discount analysis
- Customer segmentation
- Email report delivery
- Scheduled automated reports

---

*Last Updated: 2025-10-22*
