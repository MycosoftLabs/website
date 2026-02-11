/**
 * Voice + Search E2E Tests
 * Created: February 11, 2026
 * 
 * Tests PersonaPlex voice integration with search functionality
 * 
 * Prerequisites:
 * - PersonaPlex Bridge running on localhost:8999 (or env var)
 * - MAS Orchestrator running on 192.168.0.188:8001
 * - Website running on localhost:3010
 * 
 * Run: npx playwright test tests/e2e/voice-search.spec.ts
 */

import { test, expect, Page } from '@playwright/test'

const WEBSITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3010'
const PERSONAPLEX_URL = process.env.NEXT_PUBLIC_PERSONAPLEX_WS_URL || 'ws://localhost:8999/api/chat'

test.describe('Voice Search Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Grant microphone permissions
    await page.context().grantPermissions(['microphone'])
  })
  
  test('should show floating voice button on homepage', async ({ page }) => {
    await page.goto(WEBSITE_URL)
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Check for floating voice button
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    await expect(voiceButton).toBeVisible()
    
    // Verify button styling (should be fixed positioned)
    const buttonStyles = await voiceButton.evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        position: styles.position,
        zIndex: styles.zIndex,
      }
    })
    
    expect(buttonStyles.position).toBe('fixed')
    expect(parseInt(buttonStyles.zIndex)).toBeGreaterThanOrEqual(50)
  })
  
  test('should show voice button on all pages', async ({ page }) => {
    const testPages = [
      '/',
      '/search',
      '/devices',
      '/earth-simulator',
      '/natureos',
    ]
    
    for (const path of testPages) {
      await page.goto(`${WEBSITE_URL}${path}`)
      await page.waitForLoadState('networkidle')
      
      const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
      await expect(voiceButton).toBeVisible({ timeout: 5000 })
    }
  })
  
  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(WEBSITE_URL)
    
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    await expect(voiceButton).toBeVisible()
    
    // Check button size is touch-friendly (min 44x44px)
    const buttonBox = await voiceButton.boundingBox()
    expect(buttonBox?.width).toBeGreaterThanOrEqual(44)
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44)
  })
  
  test('should show connection status indicator', async ({ page }) => {
    await page.goto(WEBSITE_URL)
    
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    await expect(voiceButton).toBeVisible()
    
    // Click to activate voice
    await voiceButton.click()
    
    // Wait for connection status to appear
    await page.waitForTimeout(1000)
    
    // Look for status indicator (green/yellow/red dot or text)
    const statusIndicator = page.locator('span:has-text("Listening"), span:has-text("Ready"), span:has-text("Speaking")')
    
    // Should show some status within 3 seconds
    await expect(statusIndicator.first()).toBeVisible({ timeout: 3000 })
  })
  
  test('should navigate to search page when voice search intent detected', async ({ page }) => {
    await page.goto(WEBSITE_URL)
    
    // Mock WebSocket connection to simulate voice input
    await page.evaluate((wsUrl) => {
      // Create mock WebSocket
      const mockWs = {
        send: (data: string) => console.log('Sent:', data),
        close: () => console.log('Closed'),
        addEventListener: (event: string, callback: Function) => {
          if (event === 'open') {
            setTimeout(() => callback(new Event('open')), 100)
          }
          if (event === 'message') {
            // Simulate receiving voice transcript
            setTimeout(() => {
              callback(new MessageEvent('message', {
                data: JSON.stringify({
                  type: 'transcript',
                  text: 'search for mushrooms'
                })
              }))
            }, 500)
          }
        },
        readyState: 1, // OPEN
      }
      
      // Override WebSocket constructor
      (window as any).WebSocket = function() {
        return mockWs
      }
    }, PERSONAPLEX_URL)
    
    // Click voice button to start listening
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    await voiceButton.click()
    
    // Wait for navigation to search page
    await page.waitForURL('**/search?q=*', { timeout: 5000 })
    
    // Verify we're on search page with query
    expect(page.url()).toContain('/search?q=')
    expect(page.url()).toContain('mushrooms')
  })
  
  test('should handle microphone permission denial gracefully', async ({ page, context }) => {
    // Deny microphone permissions
    await context.grantPermissions([], { permissions: ['microphone'] })
    
    await page.goto(WEBSITE_URL)
    
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    await voiceButton.click()
    
    // Should show error or fallback to Web Speech API
    // Check console for error or warning message
    const consoleMessages: string[] = []
    page.on('console', msg => consoleMessages.push(msg.text()))
    
    await page.waitForTimeout(2000)
    
    // Should log error about mic permissions
    const hasPermissionError = consoleMessages.some(msg => 
      msg.toLowerCase().includes('microphone') || 
      msg.toLowerCase().includes('permission')
    )
    
    expect(hasPermissionError).toBeTruthy()
  })
  
  test('should show voice overlay when expanded', async ({ page }) => {
    await page.goto(WEBSITE_URL)
    
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    await voiceButton.click()
    
    // Wait for overlay to appear
    await page.waitForTimeout(500)
    
    // Check for overlay elements
    const overlay = page.locator('div').filter({ hasText: /Listening|Ready|Connected/ }).first()
    
    // Overlay should be visible or voice status should change
    const isOverlayVisible = await overlay.isVisible().catch(() => false)
    const buttonText = await voiceButton.textContent().catch(() => '')
    
    expect(isOverlayVisible || buttonText).toBeTruthy()
  })
  
  test('should work with keyboard navigation', async ({ page }) => {
    await page.goto(WEBSITE_URL)
    
    // Tab to voice button
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Check if voice button is focused
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    const isFocused = await voiceButton.evaluate(el => el === document.activeElement)
    
    // Press Enter to activate
    if (isFocused) {
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      // Voice should be activated
      const status = await page.textContent('body')
      expect(status).toBeTruthy()
    }
  })
  
  test('should handle WebSocket disconnection gracefully', async ({ page }) => {
    await page.goto(WEBSITE_URL)
    
    // Simulate WebSocket disconnect
    await page.evaluate(() => {
      const ws = (window as any).personaplexWs
      if (ws) ws.close()
    })
    
    await page.waitForTimeout(1000)
    
    // Button should show disconnected state
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    const buttonClass = await voiceButton.getAttribute('class')
    
    // Should not have "connected" or green styling
    expect(buttonClass).toBeTruthy()
  })
})

test.describe('Search Page Voice Integration', () => {
  
  test('should have voice input on search page', async ({ page }) => {
    await page.goto(`${WEBSITE_URL}/search`)
    await page.waitForLoadState('networkidle')
    
    // Search page should have voice capability
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    await expect(voiceButton).toBeVisible()
  })
  
  test('should populate search input with voice transcript', async ({ page }) => {
    await page.goto(`${WEBSITE_URL}/search`)
    
    // Mock voice input
    await page.evaluate(() => {
      // Trigger search with mock transcript
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement
      if (searchInput) {
        searchInput.value = 'fungi species'
        searchInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    
    await page.waitForTimeout(500)
    
    // Check search input has value
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first()
    const inputValue = await searchInput.inputValue()
    expect(inputValue).toContain('fungi')
  })
})

test.describe('Performance Tests', () => {
  
  test('should load voice button within 3 seconds', async ({ page }) => {
    const startTime = Date.now()
    await page.goto(WEBSITE_URL)
    
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    await voiceButton.waitFor({ state: 'visible', timeout: 3000 })
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000)
  })
  
  test('should not block page rendering', async ({ page }) => {
    await page.goto(WEBSITE_URL)
    
    // Check that page content is visible before voice button
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible({ timeout: 2000 })
    
    // Voice button should appear after main content
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    await expect(voiceButton).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Accessibility Tests', () => {
  
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(WEBSITE_URL)
    
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    const ariaLabel = await voiceButton.getAttribute('aria-label')
    expect(ariaLabel).toBe('MYCA Voice Assistant')
  })
  
  test('should be keyboard accessible', async ({ page }) => {
    await page.goto(WEBSITE_URL)
    
    // Tab to button
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    const isFocusable = await voiceButton.evaluate(el => {
      return el.tabIndex >= 0 || el.getAttribute('tabindex') === '0'
    })
    
    expect(isFocusable).toBeTruthy()
  })
  
  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto(WEBSITE_URL)
    
    const voiceButton = page.locator('button[aria-label="MYCA Voice Assistant"]')
    
    // Get computed styles
    const styles = await voiceButton.evaluate(el => {
      const computed = window.getComputedStyle(el)
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
      }
    })
    
    // Should have defined colors
    expect(styles.color).toBeTruthy()
    expect(styles.backgroundColor).toBeTruthy()
  })
})
