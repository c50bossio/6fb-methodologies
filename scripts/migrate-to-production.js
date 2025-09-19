#!/usr/bin/env node

/**
 * Migration script to convert from in-memory to database storage
 * Run this after setting up your PostgreSQL database
 */

const fs = require('fs')
const path = require('path')

const WORKBOOK_AUTH_FILE = path.join(__dirname, '../src/lib/workbook-auth.ts')

async function migrateToDatabase() {
  console.log('🚀 Starting migration to production database...')

  try {
    // Read the current workbook-auth.ts file
    const authFileContent = fs.readFileSync(WORKBOOK_AUTH_FILE, 'utf8')

    // Create backup
    const backupFile = WORKBOOK_AUTH_FILE + '.backup'
    fs.writeFileSync(backupFile, authFileContent)
    console.log(`📋 Created backup: ${backupFile}`)

    // Update imports to use database version
    let updatedContent = authFileContent

    // Replace in-memory functions with database functions
    const replacements = [
      {
        search: "// Workbook User Management (Simple in-memory storage for MVP)",
        replace: "// Workbook User Management (Database-powered for production)"
      },
      {
        search: "// TODO: Replace with database storage in production",
        replace: "// Production database storage implementation"
      },
      {
        search: "import jwt from 'jsonwebtoken'",
        replace: `import jwt from 'jsonwebtoken'
import {
  storeWorkbookUser as dbStoreWorkbookUser,
  verifyWorkbookPassword as dbVerifyWorkbookPassword,
  getWorkbookUser as dbGetWorkbookUser,
  logUserAction,
  checkDatabaseHealth
} from './database-auth'`
      },
      {
        search: /\/\/ In-memory storage for workbook users \(for development\)[\s\S]*?const workbookUsers = new Map<string, WorkbookUser>\(\)/,
        replace: `// Database storage for workbook users (production)
// Using PostgreSQL for persistent storage`
      },
      {
        search: /export function storeWorkbookUser\(user: WorkbookUser\): void \{[\s\S]*?\}/,
        replace: `export async function storeWorkbookUser(user: WorkbookUser): Promise<void> {
  return await dbStoreWorkbookUser(user)
}`
      },
      {
        search: /export async function verifyWorkbookPassword\(email: string, password: string\): Promise<boolean> \{[\s\S]*?\}/,
        replace: `export async function verifyWorkbookPassword(email: string, password: string): Promise<boolean> {
  return await dbVerifyWorkbookPassword(email, password)
}`
      },
      {
        search: /export function getWorkbookUser\(email: string\): WorkbookUser \| null \{[\s\S]*?\}/,
        replace: `export async function getWorkbookUser(email: string): Promise<any> {
  return await dbGetWorkbookUser(email)
}`
      }
    ]

    // Apply replacements
    for (const replacement of replacements) {
      if (typeof replacement.search === 'string') {
        updatedContent = updatedContent.replace(replacement.search, replacement.replace)
      } else {
        updatedContent = updatedContent.replace(replacement.search, replacement.replace)
      }
    }

    // Write updated file
    fs.writeFileSync(WORKBOOK_AUTH_FILE, updatedContent)
    console.log('✅ Updated workbook-auth.ts for database storage')

    // Update Stripe webhook to use async storage
    const webhookFile = path.join(__dirname, '../src/app/api/webhooks/stripe/route.ts')
    if (fs.existsSync(webhookFile)) {
      let webhookContent = fs.readFileSync(webhookFile, 'utf8')

      // Make storeWorkbookUser call async
      webhookContent = webhookContent.replace(
        'storeWorkbookUser(workbookUser)',
        'await storeWorkbookUser(workbookUser)'
      )

      fs.writeFileSync(webhookFile, webhookContent)
      console.log('✅ Updated Stripe webhook for async database calls')
    }

    console.log('🎉 Migration completed successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Set up your PostgreSQL database')
    console.log('2. Run: psql your_database < scripts/upgrade-to-database.sql')
    console.log('3. Add DATABASE_URL to your .env.local file')
    console.log('4. Test the migration with: npm run test-db')

  } catch (error) {
    console.error('❌ Migration failed:', error)

    // Restore backup if it exists
    const backupFile = WORKBOOK_AUTH_FILE + '.backup'
    if (fs.existsSync(backupFile)) {
      const backupContent = fs.readFileSync(backupFile, 'utf8')
      fs.writeFileSync(WORKBOOK_AUTH_FILE, backupContent)
      console.log('📋 Restored from backup due to error')
    }

    process.exit(1)
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToDatabase()
}

module.exports = { migrateToDatabase }