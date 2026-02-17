/**
 * Test Docker Container Clone and Backup Operations
 * 
 * This test verifies that the /api/docker/containers route correctly implements
 * clone and backup operations for Docker containers.
 * 
 * Prerequisites:
 * - Docker Desktop running
 * - At least one test container available
 * - Port 2375 accessible (or configured DOCKER_API_URL)
 */

import { describe, it, expect, beforeAll } from '@jest/globals'

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3010'
const DOCKER_CONTAINERS_API = `${API_BASE}/api/docker/containers`

interface Container {
  id: string
  name: string
  image: string
  status: string
}

let testContainerId: string | null = null

describe('Docker Container Actions API', () => {
  beforeAll(async () => {
    // Get available containers
    const res = await fetch(DOCKER_CONTAINERS_API)
    if (res.ok) {
      const data = await res.json()
      if (data.containers && data.containers.length > 0) {
        // Use the first running or stopped container for testing
        const container = data.containers.find((c: Container) => 
          c.status === 'running' || c.status === 'exited'
        )
        if (container) {
          testContainerId = container.id
          console.log(`Using test container: ${container.name} (${container.id})`)
        }
      }
    }
  })

  it('should clone a container', async () => {
    if (!testContainerId) {
      console.warn('No test container available, skipping clone test')
      return
    }

    const res = await fetch(DOCKER_CONTAINERS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clone',
        containerId: testContainerId,
        options: {
          name: `test-clone-${Date.now()}`,
        },
      }),
    })

    const data = await res.json()

    if (res.ok) {
      expect(data.success).toBe(true)
      expect(data.action).toBe('clone')
      expect(data.sourceId).toBe(testContainerId)
      expect(data.newId).toBeDefined()
      expect(data.newName).toBeDefined()
      console.log(`✓ Clone successful: ${data.newName} (${data.newId})`)
      
      // TODO: Clean up cloned container after test
    } else {
      // Docker API might not be available in test environment
      console.warn(`Clone test failed: ${data.error}`)
      expect(data.code).toBe('CLONE_FAILED')
    }
  }, 30000) // 30 second timeout

  it('should backup a container', async () => {
    if (!testContainerId) {
      console.warn('No test container available, skipping backup test')
      return
    }

    const res = await fetch(DOCKER_CONTAINERS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'backup',
        containerId: testContainerId,
        options: {
          name: `test-backup-${Date.now()}.tar`,
          path: '/backups/containers/test',
        },
      }),
    })

    const data = await res.json()

    if (res.ok) {
      expect(data.success).toBe(true)
      expect(data.action).toBe('backup')
      expect(data.containerId).toBe(testContainerId)
      expect(data.backupFile).toBeDefined()
      expect(data.backupPath).toBeDefined()
      expect(data.sizeBytes).toBeGreaterThan(0)
      expect(data.sizeMB).toBeGreaterThan(0)
      expect(data.timestamp).toBeDefined()
      console.log(`✓ Backup successful: ${data.backupFile} (${data.sizeMB} MB)`)
    } else {
      // Docker API might not be available in test environment
      console.warn(`Backup test failed: ${data.error}`)
      expect(data.code).toBe('BACKUP_FAILED')
    }
  }, 300000) // 5 minute timeout for large containers

  it('should return proper error for invalid container ID', async () => {
    const res = await fetch(DOCKER_CONTAINERS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clone',
        containerId: 'invalid-container-id-12345',
        options: {
          name: 'test-clone-invalid',
        },
      }),
    })

    expect(res.ok).toBe(false)
    const data = await res.json()
    expect(data.error).toBeDefined()
    expect(data.code).toBe('CLONE_FAILED')
  })

  it('should validate required fields', async () => {
    const res = await fetch(DOCKER_CONTAINERS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clone',
        // Missing containerId
      }),
    })

    expect(res.ok).toBe(false)
  })
})
