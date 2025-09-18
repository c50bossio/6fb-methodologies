#!/usr/bin/env node

/**
 * 6FB Member Management CLI Tool
 *
 * This script provides command-line tools for managing 6FB member verification
 * through Stripe integration.
 *
 * Usage:
 *   node scripts/manage-members.js verify <email>
 *   node scripts/manage-members.js sync [--historical]
 *   node scripts/manage-members.js list [--limit=10]
 *   node scripts/manage-members.js stats
 *   node scripts/manage-members.js test
 */

const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

// Color helpers for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
}

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`
}

const Stripe = require('stripe')

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment variables')
  console.error('Make sure .env.local is configured properly')
  process.exit(1)
}

// Initialize Main Stripe Account
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
})

// Initialize Skool Stripe Express Account (if configured)
let skoolStripe = null
if (process.env.SKOOL_STRIPE_SECRET_KEY && !process.env.SKOOL_STRIPE_SECRET_KEY.includes('REPLACE')) {
  skoolStripe = new Stripe(process.env.SKOOL_STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20'
  })
  console.log(colorize('green', '✅ Skool Stripe Express account configured'))
} else {
  console.log(colorize('yellow', '⚠️  Skool Stripe Express account not configured'))
}

// Member verification logic (mirrored from stripe.ts)
async function verify6FBMembership(email) {
  try {
    const normalizedEmail = email.toLowerCase().trim()

    console.log(colorize('blue', `🔍 Searching for customer: ${normalizedEmail}`))

    const customers = await stripe.customers.list({
      email: normalizedEmail,
      limit: 10
    })

    if (customers.data.length === 0) {
      return {
        isVerified: false,
        error: 'Email not found in Stripe customers'
      }
    }

    console.log(colorize('cyan', `📊 Found ${customers.data.length} customer(s) with this email`))

    for (const customer of customers.data) {
      const membershipInfo = await checkCustomerMembership(customer)

      if (membershipInfo.isVerified) {
        return membershipInfo
      }
    }

    return {
      isVerified: false,
      error: 'No qualifying payments or subscriptions found'
    }

  } catch (error) {
    console.error(colorize('red', '❌ Error verifying membership:'), error.message)
    return {
      isVerified: false,
      error: 'Internal error during verification'
    }
  }
}

async function checkCustomerMembership(customer) {
  try {
    console.log(colorize('yellow', `📋 Checking customer: ${customer.id}`))

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10
    })

    // Check for successful payments
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customer.id,
      limit: 20
    })

    const successfulPayments = paymentIntents.data.filter(pi =>
      pi.status === 'succeeded' && pi.amount > 0
    )

    // Check for successful invoices
    const invoices = await stripe.invoices.list({
      customer: customer.id,
      status: 'paid',
      limit: 10
    })

    const hasActiveSubscription = subscriptions.data.length > 0
    const hasSuccessfulPayments = successfulPayments.length > 0
    const hasPaidInvoices = invoices.data.length > 0

    console.log(colorize('cyan', `  💳 Active subscriptions: ${subscriptions.data.length}`))
    console.log(colorize('cyan', `  💰 Successful payments: ${successfulPayments.length}`))
    console.log(colorize('cyan', `  🧾 Paid invoices: ${invoices.data.length}`))

    if (hasActiveSubscription || hasSuccessfulPayments || hasPaidInvoices) {
      let membershipType = 'Basic'
      let lastPayment

      if (hasActiveSubscription) {
        const activeSubscription = subscriptions.data[0]
        membershipType = determineMembershipType(activeSubscription.items.data[0]?.price.unit_amount || 0)
        lastPayment = new Date(activeSubscription.created * 1000).toISOString()
      } else if (hasSuccessfulPayments) {
        const latestPayment = successfulPayments[0]
        membershipType = determineMembershipType(latestPayment.amount)
        lastPayment = new Date(latestPayment.created * 1000).toISOString()
      } else if (hasPaidInvoices) {
        const latestInvoice = invoices.data[0]
        membershipType = determineMembershipType(latestInvoice.amount_paid)
        lastPayment = new Date(latestInvoice.created * 1000).toISOString()
      }

      return {
        isVerified: true,
        member: {
          email: customer.email,
          name: customer.name || 'Unknown Member',
          customerId: customer.id,
          membershipType,
          isActive: hasActiveSubscription,
          joinDate: new Date(customer.created * 1000).toISOString(),
          lastPayment,
          subscriptions: subscriptions.data
        }
      }
    }

    return {
      isVerified: false,
      error: 'No qualifying payments or subscriptions found'
    }

  } catch (error) {
    console.error(colorize('red', '❌ Error checking customer membership:'), error.message)
    return {
      isVerified: false,
      error: 'Error checking membership status'
    }
  }
}

function determineMembershipType(amountInCents) {
  if (amountInCents >= 150000) {
    return 'VIP'
  } else if (amountInCents >= 100000) {
    return 'Premium'
  } else if (amountInCents >= 50000) {
    return 'Pro'
  } else if (amountInCents > 0) {
    return 'Basic'
  }
  return 'Basic'
}

// CLI Commands

async function verifyCommand(email) {
  console.log(colorize('bright', '🎯 6FB Member Verification'))
  console.log('=' * 50)

  if (!email) {
    console.error(colorize('red', '❌ Email address required'))
    console.log(colorize('yellow', 'Usage: node scripts/manage-members.js verify <email>'))
    process.exit(1)
  }

  const result = await verify6FBMembership(email)

  console.log('\n' + colorize('bright', '📊 VERIFICATION RESULT'))
  console.log('-' * 30)

  if (result.isVerified && result.member) {
    console.log(colorize('green', '✅ VERIFIED MEMBER'))
    console.log(colorize('cyan', `📧 Email: ${result.member.email}`))
    console.log(colorize('cyan', `👤 Name: ${result.member.name}`))
    console.log(colorize('cyan', `🏷️  Type: ${result.member.membershipType}`))
    console.log(colorize('cyan', `🔴 Active: ${result.member.isActive ? 'Yes' : 'No'}`))
    console.log(colorize('cyan', `📅 Joined: ${result.member.joinDate.split('T')[0]}`))
    if (result.member.lastPayment) {
      console.log(colorize('cyan', `💰 Last Payment: ${result.member.lastPayment.split('T')[0]}`))
    }
    console.log(colorize('cyan', `🆔 Customer ID: ${result.member.customerId}`))
  } else {
    console.log(colorize('red', '❌ NOT VERIFIED'))
    console.log(colorize('yellow', `❗ Reason: ${result.error}`))
  }

  console.log('\n' + colorize('bright', '🎯 DISCOUNT ELIGIBILITY'))
  console.log('-' * 30)

  if (result.isVerified) {
    console.log(colorize('green', '✅ Eligible for 6FB member discount (20% off GA tickets)'))
  } else {
    console.log(colorize('red', '❌ Not eligible for member discount'))
  }
}

async function syncCommand(options = {}) {
  console.log(colorize('bright', '🔄 6FB Member Sync'))
  console.log('=' * 50)

  try {
    let customerCount = 0
    let verifiedCount = 0
    const membersList = []

    console.log(colorize('blue', '🔍 Fetching Stripe customers...'))

    // Get customers in batches
    let hasMore = true
    let startingAfter = null

    while (hasMore) {
      const params = {
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter })
      }

      const customers = await stripe.customers.list(params)

      for (const customer of customers.data) {
        customerCount++

        if (customer.email) {
          const membershipInfo = await checkCustomerMembership(customer)

          if (membershipInfo.isVerified) {
            verifiedCount++
            membersList.push(membershipInfo.member)

            console.log(colorize('green', `✅ ${customer.email} - ${membershipInfo.member.membershipType}`))
          } else {
            console.log(colorize('yellow', `⚠️  ${customer.email} - No qualifying payments`))
          }
        } else {
          console.log(colorize('red', `❌ Customer ${customer.id} - No email address`))
        }
      }

      hasMore = customers.has_more
      if (hasMore && customers.data.length > 0) {
        startingAfter = customers.data[customers.data.length - 1].id
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n' + colorize('bright', '📊 SYNC SUMMARY'))
    console.log('-' * 30)
    console.log(colorize('cyan', `👥 Total customers checked: ${customerCount}`))
    console.log(colorize('green', `✅ Verified members found: ${verifiedCount}`))
    console.log(colorize('blue', `📈 Verification rate: ${((verifiedCount / customerCount) * 100).toFixed(1)}%`))

    if (membersList.length > 0) {
      console.log('\n' + colorize('bright', '🏆 VERIFIED MEMBERS'))
      console.log('-' * 30)

      membersList.forEach((member, index) => {
        console.log(colorize('green', `${index + 1}. ${member.email} (${member.membershipType})`))
      })
    }

  } catch (error) {
    console.error(colorize('red', '❌ Sync failed:'), error.message)
  }
}

async function listCommand(options = {}) {
  const limit = options.limit || 10

  console.log(colorize('bright', `🗂️  Recent Stripe Customers (Last ${limit})`))
  console.log('=' * 50)

  try {
    const customers = await stripe.customers.list({
      limit: limit
    })

    for (const customer of customers.data) {
      const createdDate = new Date(customer.created * 1000).toISOString().split('T')[0]
      const email = customer.email || 'No email'
      const name = customer.name || 'No name'

      console.log(colorize('cyan', `📧 ${email}`))
      console.log(colorize('yellow', `   👤 ${name} | 📅 ${createdDate} | 🆔 ${customer.id}`))
      console.log('')
    }

  } catch (error) {
    console.error(colorize('red', '❌ Failed to list customers:'), error.message)
  }
}

async function statsCommand() {
  console.log(colorize('bright', '📈 6FB Member Statistics'))
  console.log('=' * 50)

  try {
    // Get basic customer stats
    const customers = await stripe.customers.list({ limit: 1 })
    const customerCount = customers.data.length

    // Get recent payments
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 10
    })

    const successfulPayments = paymentIntents.data.filter(pi => pi.status === 'succeeded')
    const totalRevenue = successfulPayments.reduce((sum, pi) => sum + pi.amount, 0)

    // Get subscriptions
    const subscriptions = await stripe.subscriptions.list({
      limit: 10,
      status: 'active'
    })

    console.log(colorize('cyan', `👥 Total customers: ${customerCount}+`))
    console.log(colorize('green', `💰 Recent successful payments: ${successfulPayments.length}`))
    console.log(colorize('blue', `💵 Recent revenue: $${(totalRevenue / 100).toFixed(2)}`))
    console.log(colorize('magenta', `🔄 Active subscriptions: ${subscriptions.data.length}+`))

    console.log('\n' + colorize('bright', '🎯 Member Verification Status'))
    console.log('-' * 30)
    console.log(colorize('green', '✅ System Status: Active'))
    console.log(colorize('blue', '🔗 Integration: Stripe API'))
    console.log(colorize('yellow', '⚡ Real-time verification: Enabled'))

  } catch (error) {
    console.error(colorize('red', '❌ Failed to get stats:'), error.message)
  }
}

async function testCommand() {
  console.log(colorize('bright', '🧪 6FB Member Verification Test'))
  console.log('=' * 50)

  const testEmails = [
    'test@6fb.com',
    'member@6fb.com',
    'nonexistent@example.com'
  ]

  for (const email of testEmails) {
    console.log(colorize('blue', `\n🔍 Testing: ${email}`))
    console.log('-' * 30)

    const result = await verify6FBMembership(email)

    if (result.isVerified) {
      console.log(colorize('green', `✅ Verified - ${result.member.membershipType}`))
    } else {
      console.log(colorize('red', `❌ Not verified - ${result.error}`))
    }
  }
}

function showHelp() {
  console.log(colorize('bright', '🎯 6FB Member Management CLI'))
  console.log('=' * 50)
  console.log('')
  console.log(colorize('yellow', 'Available Commands:'))
  console.log('')
  console.log(colorize('cyan', '  verify <email>'))
  console.log('    Verify if an email address is a 6FB member')
  console.log('')
  console.log(colorize('cyan', '  sync [--historical]'))
  console.log('    Sync members from Stripe customers')
  console.log('')
  console.log(colorize('cyan', '  list [--limit=N]'))
  console.log('    List recent Stripe customers')
  console.log('')
  console.log(colorize('cyan', '  stats'))
  console.log('    Show membership and payment statistics')
  console.log('')
  console.log(colorize('cyan', '  test'))
  console.log('    Run verification tests with sample emails')
  console.log('')
  console.log(colorize('yellow', 'Examples:'))
  console.log(colorize('white', '  node scripts/manage-members.js verify user@example.com'))
  console.log(colorize('white', '  node scripts/manage-members.js sync'))
  console.log(colorize('white', '  node scripts/manage-members.js list --limit=20'))
  console.log('')
}

// Main CLI handler
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  // Parse options
  const options = {}
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      options[key] = value || true
    }
  })

  console.log(colorize('magenta', '🎯 6FB Member Management CLI v1.0.0'))
  console.log('')

  switch (command) {
    case 'verify':
      await verifyCommand(args[1])
      break

    case 'sync':
      await syncCommand(options)
      break

    case 'list':
      await listCommand(options)
      break

    case 'stats':
      await statsCommand()
      break

    case 'test':
      await testCommand()
      break

    case 'help':
    case '--help':
    case '-h':
      showHelp()
      break

    default:
      if (command) {
        console.error(colorize('red', `❌ Unknown command: ${command}`))
        console.log('')
      }
      showHelp()
      process.exit(1)
  }
}

// Run CLI
if (require.main === module) {
  main().catch(error => {
    console.error(colorize('red', '❌ Fatal error:'), error.message)
    process.exit(1)
  })
}

module.exports = {
  verify6FBMembership,
  checkCustomerMembership,
  determineMembershipType
}