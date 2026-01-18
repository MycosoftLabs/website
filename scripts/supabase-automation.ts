/**
 * Supabase Configuration Automation Script
 * 
 * This script automates Supabase configuration tasks that need to be done
 * programmatically for 24/7 maintenance.
 * 
 * Usage:
 *   npx tsx scripts/supabase-automation.ts --action configure-redirect-urls
 *   npx tsx scripts/supabase-automation.ts --action sync-env
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Configure redirect URLs for authentication
 * Note: This uses the Management API which requires service role key
 */
async function configureRedirectUrls() {
  const redirectUrls = [
    'http://localhost:3000/auth/callback',
    'http://localhost:3001/auth/callback',
    'http://localhost:3002/auth/callback',
    // Add production URLs when ready
    // 'https://mycosoft.com/auth/callback',
    // 'https://www.mycosoft.com/auth/callback',
  ]

  console.log('Configuring redirect URLs...')
  
  // Note: Supabase doesn't expose a direct API for redirect URLs
  // This would need to be done via:
  // 1. Management API (if available)
  // 2. Browser automation (Puppeteer/Playwright)
  // 3. Manual dashboard configuration
  
  // For now, we'll use the Auth Admin API to manage OAuth clients
  // Redirect URLs are typically managed via the dashboard
  
  console.log('⚠️  Redirect URLs must be configured manually in the Supabase dashboard:')
  console.log('   https://supabase.com/dashboard/project/hnevnsxnhfibhbsipqvz/auth/url-configuration')
  console.log('\nRequired URLs:')
  redirectUrls.forEach(url => console.log(`   - ${url}`))
  
  // TODO: Implement Management API call when available
  // The Supabase Management API may require additional authentication
}

/**
 * Sync environment variables across environments
 */
async function syncEnvironmentVariables() {
  console.log('Syncing environment variables...')
  
  const requiredVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***SET***' : undefined,
  }
  
  console.log('\nCurrent environment variables:')
  Object.entries(requiredVars).forEach(([key, value]) => {
    console.log(`  ${key}: ${value ? '✓ Set' : '✗ Missing'}`)
  })
}

/**
 * Verify Supabase connection and configuration
 */
async function verifyConfiguration() {
  console.log('Verifying Supabase configuration...')
  
  try {
    // Test connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    
    if (error) {
      console.error('✗ Connection failed:', error.message)
      return false
    }
    
    console.log('✓ Supabase connection successful')
    
    // Check if required tables exist
    const tables = ['profiles', 'devices', 'telemetry', 'documents', 'species']
    console.log('\nChecking required tables:')
    
    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select('count').limit(1)
      if (tableError) {
        console.log(`  ✗ ${table}: ${tableError.message}`)
      } else {
        console.log(`  ✓ ${table}: exists`)
      }
    }
    
    return true
  } catch (error) {
    console.error('✗ Verification failed:', error)
    return false
  }
}

// Main execution
const action = process.argv.find(arg => arg.startsWith('--action='))?.split('=')[1]

switch (action) {
  case 'configure-redirect-urls':
    configureRedirectUrls()
    break
  case 'sync-env':
    syncEnvironmentVariables()
    break
  case 'verify':
    verifyConfiguration()
    break
  default:
    console.log('Usage:')
    console.log('  --action=configure-redirect-urls  Configure redirect URLs')
    console.log('  --action=sync-env                Sync environment variables')
    console.log('  --action=verify                  Verify Supabase configuration')
}
