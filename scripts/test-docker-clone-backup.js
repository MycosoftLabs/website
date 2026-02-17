#!/usr/bin/env node
/**
 * Manual Test Script: Docker Container Clone and Backup
 * 
 * Usage:
 *   node scripts/test-docker-clone-backup.js [containerName]
 * 
 * Example:
 *   node scripts/test-docker-clone-backup.js mycosoft-website
 * 
 * This script tests the clone and backup operations for Docker containers
 * by calling the /api/docker/containers route.
 */

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3010'
const DOCKER_API = `${API_BASE}/api/docker/containers`

async function testContainerActions(containerName) {
  console.log('🔍 Testing Docker Container Actions API\n')
  
  // Step 1: Get available containers
  console.log('Step 1: Fetching available containers...')
  const containersRes = await fetch(DOCKER_API)
  
  if (!containersRes.ok) {
    console.error('❌ Failed to fetch containers')
    const error = await containersRes.json()
    console.error('Error:', error)
    process.exit(1)
  }
  
  const containersData = await containersRes.json()
  console.log(`✓ Found ${containersData.containers.length} containers\n`)
  
  // Find the container to test
  let testContainer = null
  
  if (containerName) {
    testContainer = containersData.containers.find(c => 
      c.name === containerName || c.id === containerName
    )
    if (!testContainer) {
      console.error(`❌ Container "${containerName}" not found`)
      process.exit(1)
    }
  } else {
    // Use first available container
    testContainer = containersData.containers[0]
    if (!testContainer) {
      console.error('❌ No containers available for testing')
      process.exit(1)
    }
  }
  
  console.log(`Using test container: ${testContainer.name} (${testContainer.id})`)
  console.log(`  Image: ${testContainer.image}`)
  console.log(`  Status: ${testContainer.status}\n`)
  
  // Step 2: Test Clone
  console.log('Step 2: Testing container clone...')
  const cloneName = `${testContainer.name}-clone-${Date.now()}`
  
  const cloneRes = await fetch(DOCKER_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'clone',
      containerId: testContainer.id,
      options: {
        name: cloneName,
      },
    }),
  })
  
  const cloneData = await cloneRes.json()
  
  if (cloneRes.ok) {
    console.log('✓ Clone successful!')
    console.log(`  New container ID: ${cloneData.newId}`)
    console.log(`  New container name: ${cloneData.newName}\n`)
  } else {
    console.error('❌ Clone failed')
    console.error('Error:', cloneData.error)
    console.error('Code:', cloneData.code, '\n')
  }
  
  // Step 3: Test Backup
  console.log('Step 3: Testing container backup...')
  const backupName = `${testContainer.name}-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.tar`
  
  const backupRes = await fetch(DOCKER_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'backup',
      containerId: testContainer.id,
      options: {
        name: backupName,
        path: '/backups/containers/test',
      },
    }),
  })
  
  const backupData = await backupRes.json()
  
  if (backupRes.ok) {
    console.log('✓ Backup successful!')
    console.log(`  Backup file: ${backupData.backupFile}`)
    console.log(`  Backup path: ${backupData.backupPath}`)
    console.log(`  Size: ${backupData.sizeMB} MB (${backupData.sizeBytes.toLocaleString()} bytes)`)
    console.log(`  Timestamp: ${backupData.timestamp}\n`)
  } else {
    console.error('❌ Backup failed')
    console.error('Error:', backupData.error)
    console.error('Code:', backupData.code, '\n')
  }
  
  // Summary
  console.log('═'.repeat(60))
  console.log('Test Summary:')
  console.log(`  Clone: ${cloneRes.ok ? '✓ PASS' : '✗ FAIL'}`)
  console.log(`  Backup: ${backupRes.ok ? '✓ PASS' : '✗ FAIL'}`)
  console.log('═'.repeat(60))
  
  if (cloneRes.ok && backupRes.ok) {
    console.log('\n🎉 All tests passed!')
    process.exit(0)
  } else {
    console.log('\n⚠️  Some tests failed. Check Docker API availability.')
    process.exit(1)
  }
}

// Run tests
const containerName = process.argv[2]
testContainerActions(containerName).catch(error => {
  console.error('\n💥 Unexpected error:')
  console.error(error)
  process.exit(1)
})
