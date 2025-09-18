#!/usr/bin/env node

/**
 * Zapier Automation Helper
 * This script provides tools to work with Zapier and webhook integrations
 */

import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const WEBHOOK_URL = process.env.NODE_ENV === 'production'
  ? 'https://6fbmethodologies.com/api/webhooks/skool'
  : 'http://localhost:3000/api/webhooks/skool';

const VERIFY_URL = process.env.NODE_ENV === 'production'
  ? 'https://6fbmethodologies.com/api/verify-member'
  : 'http://localhost:3000/api/verify-member';

const SYNC_URL = process.env.NODE_ENV === 'production'
  ? 'https://6fbmethodologies.com/api/skool/sync'
  : 'http://localhost:3000/api/skool/sync';

class ZapierAutomation {
  constructor() {
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m'
    };
  }

  colorize(text, color) {
    return `${this.colors[color]}${text}${this.colors.reset}`;
  }

  log(message, color = 'reset') {
    console.log(this.colorize(message, color));
  }

  async checkZapierCLI() {
    try {
      const { stdout } = await execAsync('zapier --version');
      this.log(`✅ Zapier CLI found: ${stdout.trim()}`, 'green');
      return true;
    } catch (error) {
      this.log('❌ Zapier CLI not found. Installing...', 'red');
      await this.installZapierCLI();
      return false;
    }
  }

  async installZapierCLI() {
    try {
      this.log('📦 Installing Zapier CLI...', 'yellow');
      await execAsync('npm install -g zapier-platform-cli');
      this.log('✅ Zapier CLI installed successfully', 'green');
    } catch (error) {
      this.log(`❌ Failed to install Zapier CLI: ${error.message}`, 'red');
      throw error;
    }
  }

  async checkWebhookStatus() {
    try {
      const response = await fetch(WEBHOOK_URL);
      const data = await response.json();

      this.log('📊 Webhook Status:', 'cyan');
      this.log(`  URL: ${WEBHOOK_URL}`, 'blue');
      this.log(`  Status: ${response.ok ? 'Active' : 'Error'}`, response.ok ? 'green' : 'red');
      this.log(`  Total Members: ${data.totalMembers || 0}`, 'blue');

      if (data.members && data.members.length > 0) {
        this.log('  Recent Members:', 'blue');
        data.members.slice(0, 3).forEach(member => {
          this.log(`    - ${member.name} (${member.email})`, 'blue');
        });
      }

      return response.ok;
    } catch (error) {
      this.log(`❌ Failed to check webhook status: ${error.message}`, 'red');
      return false;
    }
  }

  async simulateSkoolWebhook(memberData = null) {
    const defaultMember = {
      firstName: 'Test',
      lastName: 'Member',
      email: 'test.member@6fb.com',
      transactionId: `test_${Date.now()}`,
      subscriptionDate: new Date().toISOString().split('T')[0]
    };

    const member = memberData || defaultMember;

    this.log('🧪 Simulating Skool webhook...', 'yellow');
    this.log(`  Member: ${member.firstName} ${member.lastName}`, 'blue');
    this.log(`  Email: ${member.email}`, 'blue');

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member)
      });

      const result = await response.json();

      if (response.ok) {
        this.log('✅ Webhook simulation successful', 'green');
        this.log(`  Response: ${result.message}`, 'green');
        return member;
      } else {
        this.log('❌ Webhook simulation failed', 'red');
        this.log(`  Error: ${result.error}`, 'red');
        return null;
      }
    } catch (error) {
      this.log(`❌ Webhook simulation error: ${error.message}`, 'red');
      return null;
    }
  }

  async testMemberVerification(email) {
    this.log(`🔍 Testing member verification for: ${email}`, 'yellow');

    try {
      const response = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (response.ok && result.isVerified) {
        this.log('✅ Member verification successful', 'green');
        this.log(`  Name: ${result.memberName}`, 'green');
        this.log(`  Source: ${result.source}`, 'green');
        this.log(`  Type: ${result.member?.membershipType}`, 'green');
        return true;
      } else {
        this.log('❌ Member verification failed', 'red');
        this.log(`  Error: ${result.error || 'Unknown error'}`, 'red');
        return false;
      }
    } catch (error) {
      this.log(`❌ Verification error: ${error.message}`, 'red');
      return false;
    }
  }

  async generateZapierInstructions() {
    this.log('\n🎯 Zapier Setup Instructions', 'cyan');
    this.log('================================', 'cyan');

    this.log('\n1. Create New Zap at zapier.com', 'yellow');
    this.log('   - Trigger App: Skool', 'blue');
    this.log('   - Trigger Event: "New Paid Member"', 'blue');
    this.log('   - Connect with Skool API key (from .env.local)', 'blue');

    this.log('\n2. Configure Action', 'yellow');
    this.log('   - Action App: Webhooks by Zapier', 'blue');
    this.log('   - Action Event: POST', 'blue');
    this.log(`   - URL: ${WEBHOOK_URL}`, 'blue');
    this.log('   - Method: POST', 'blue');
    this.log('   - Data Format: JSON', 'blue');

    this.log('\n3. Webhook Payload Mapping', 'yellow');
    this.log('   {', 'blue');
    this.log('     "firstName": "{{first_name}}",', 'blue');
    this.log('     "lastName": "{{last_name}}",', 'blue');
    this.log('     "email": "{{email}}",', 'blue');
    this.log('     "transactionId": "{{transaction_id}}",', 'blue');
    this.log('     "subscriptionDate": "{{subscription_date}}"', 'blue');
    this.log('   }', 'blue');

    this.log('\n4. Test Your Zap', 'yellow');
    this.log(`   - Use: npm run test:skool-webhook`, 'blue');
    this.log(`   - Or: node scripts/zapier-automation.js test`, 'blue');

    this.log('\n5. Deploy and Monitor', 'yellow');
    this.log('   - Turn on your Zap', 'blue');
    this.log('   - Monitor webhook logs in development', 'blue');
    this.log('   - Test with real Skool members', 'blue');
  }

  async fullWorkflowTest() {
    this.log('\n🚀 Running Full Workflow Test', 'cyan');
    this.log('==============================', 'cyan');

    // Step 1: Check webhook status
    this.log('\n1. Checking webhook status...', 'yellow');
    const webhookOk = await this.checkWebhookStatus();
    if (!webhookOk) {
      this.log('❌ Webhook not responding. Is the dev server running?', 'red');
      return false;
    }

    // Step 2: Simulate webhook
    this.log('\n2. Simulating Skool webhook...', 'yellow');
    const member = await this.simulateSkoolWebhook();
    if (!member) {
      this.log('❌ Webhook simulation failed', 'red');
      return false;
    }

    // Step 3: Test verification
    this.log('\n3. Testing member verification...', 'yellow');
    const verified = await this.testMemberVerification(member.email);
    if (!verified) {
      this.log('❌ Member verification failed', 'red');
      return false;
    }

    // Step 4: Cleanup
    this.log('\n4. Cleaning up test data...', 'yellow');
    await this.cleanupTestMember(member.email);

    this.log('\n✅ Full workflow test completed successfully!', 'green');
    this.log('🎉 Your Skool integration is ready for production!', 'green');

    return true;
  }

  async cleanupTestMember(email) {
    try {
      await fetch(WEBHOOK_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'remove' })
      });
      this.log(`🧹 Cleaned up test member: ${email}`, 'green');
    } catch (error) {
      this.log(`⚠️ Could not cleanup test member: ${email}`, 'yellow');
    }
  }

  async testSkoolAPIConnection() {
    this.log('🧪 Testing Skool API connection...', 'yellow');

    try {
      const response = await fetch(`${SYNC_URL}?action=test`);
      const result = await response.json();

      if (result.success && result.connectionTest === 'passed') {
        this.log('✅ Skool API connection successful', 'green');
        this.log(`  Configured: ${result.configured}`, 'blue');
        if (result.groupInfo) {
          this.log(`  Group: ${result.groupInfo.name || 'Unknown'}`, 'blue');
        }
        return true;
      } else {
        this.log('❌ Skool API connection failed', 'red');
        this.log(`  Error: ${result.error}`, 'red');
        this.log(`  Configured: ${result.configured}`, 'yellow');
        return false;
      }
    } catch (error) {
      this.log(`❌ API test error: ${error.message}`, 'red');
      return false;
    }
  }

  async syncExistingMembers() {
    this.log('🔄 Syncing existing Skool members...', 'cyan');

    // Test connection first
    const connectionOk = await this.testSkoolAPIConnection();
    if (!connectionOk) {
      this.log('❌ Cannot sync - API connection failed', 'red');
      return false;
    }

    try {
      const beforeResponse = await fetch(WEBHOOK_URL);
      const beforeData = await beforeResponse.json();
      const beforeCount = beforeData.totalMembers || 0;

      this.log(`📊 Current member count: ${beforeCount}`, 'blue');
      this.log('🚀 Starting bulk sync...', 'yellow');

      const response = await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        this.log('✅ Sync completed successfully!', 'green');
        this.log(`  Imported: ${result.imported} new members`, 'green');
        this.log(`  Total members: ${result.totalMembers}`, 'blue');

        if (result.stats) {
          this.log('📈 Member Statistics:', 'cyan');
          this.log(`  Total: ${result.stats.totalMembers}`, 'blue');
          this.log(`  Active: ${result.stats.activeMembers}`, 'blue');
        }

        return true;
      } else {
        this.log('❌ Sync failed', 'red');
        this.log(`  Error: ${result.error}`, 'red');
        this.log(`  Imported: ${result.imported} members before failure`, 'yellow');
        return false;
      }

    } catch (error) {
      this.log(`❌ Sync error: ${error.message}`, 'red');
      return false;
    }
  }

  async syncSpecificMember(email) {
    this.log(`🔍 Syncing specific member: ${email}`, 'yellow');

    try {
      const response = await fetch(SYNC_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'sync' })
      });

      const result = await response.json();

      if (result.success) {
        this.log('✅ Member synced successfully', 'green');
        this.log(`  Name: ${result.member.name}`, 'green');
        this.log(`  Email: ${result.member.email}`, 'green');
        this.log(`  Status: ${result.member.subscriptionStatus}`, 'green');
        return true;
      } else {
        this.log('❌ Member sync failed', 'red');
        this.log(`  Error: ${result.error}`, 'red');
        if (result.member) {
          this.log(`  Found member but: ${result.member.subscriptionStatus}`, 'yellow');
        }
        return false;
      }

    } catch (error) {
      this.log(`❌ Member sync error: ${error.message}`, 'red');
      return false;
    }
  }

  async monitorWebhooks() {
    this.log('👀 Monitoring webhook activity...', 'cyan');
    this.log('Press Ctrl+C to stop monitoring', 'yellow');

    let lastMemberCount = 0;

    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(WEBHOOK_URL);
        const data = await response.json();

        if (data.totalMembers !== lastMemberCount) {
          this.log(`📊 Member count changed: ${lastMemberCount} → ${data.totalMembers}`, 'green');
          lastMemberCount = data.totalMembers;

          if (data.members && data.members.length > 0) {
            const latest = data.members[data.members.length - 1];
            this.log(`  Latest member: ${latest.name} (${latest.email})`, 'blue');
          }
        }
      } catch (error) {
        this.log(`❌ Monitoring error: ${error.message}`, 'red');
      }
    }, 5000); // Check every 5 seconds

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      clearInterval(checkInterval);
      this.log('\n👋 Monitoring stopped', 'yellow');
      process.exit(0);
    });
  }
}

// CLI Interface
async function main() {
  const automation = new ZapierAutomation();
  const command = process.argv[2];

  switch (command) {
    case 'check':
      await automation.checkZapierCLI();
      break;

    case 'status':
      await automation.checkWebhookStatus();
      break;

    case 'test':
      await automation.fullWorkflowTest();
      break;

    case 'simulate':
      await automation.simulateSkoolWebhook();
      break;

    case 'verify':
      const email = process.argv[3] || 'info@fwbarbersupply.com';
      await automation.testMemberVerification(email);
      break;

    case 'sync':
      await automation.syncExistingMembers();
      break;

    case 'sync-member':
      const syncEmail = process.argv[3];
      if (!syncEmail) {
        automation.log('❌ Email required for sync-member command', 'red');
        automation.log('Usage: node scripts/zapier-automation.js sync-member email@example.com', 'yellow');
      } else {
        await automation.syncSpecificMember(syncEmail);
      }
      break;

    case 'test-api':
      await automation.testSkoolAPIConnection();
      break;

    case 'monitor':
      await automation.monitorWebhooks();
      break;

    case 'instructions':
      await automation.generateZapierInstructions();
      break;

    default:
      console.log(`
🎯 Zapier Automation Helper

Commands:
  check        - Check if Zapier CLI is installed
  status       - Check webhook endpoint status
  test         - Run full workflow test
  simulate     - Simulate a Skool webhook
  verify <email> - Test member verification
  sync         - Sync all existing Skool members
  sync-member <email> - Sync specific member from Skool
  test-api     - Test Skool API connection
  monitor      - Monitor webhook activity
  instructions - Show Zapier setup instructions

Examples:
  node scripts/zapier-automation.js test
  node scripts/zapier-automation.js sync
  node scripts/zapier-automation.js sync-member info@fwbarbersupply.com
  node scripts/zapier-automation.js verify info@fwbarbersupply.com
  node scripts/zapier-automation.js monitor
`);
  }
}

main().catch(console.error);