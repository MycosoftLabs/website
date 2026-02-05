/**
 * Earth-2 Visual Browser Test
 * February 5, 2026
 * 
 * Tests Earth-2 tab functionality in CREP dashboard
 */

import { chromium } from 'playwright';

async function testEarth2Tab() {
  console.log('🚀 Starting Earth-2 Browser Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for visual testing
    slowMo: 500 // Slow down for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  try {
    console.log('📍 Navigating to CREP Dashboard...');
    await page.goto('http://localhost:3010/dashboard/crep', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Wait for map to load
    console.log('⏳ Waiting for page to fully load...');
    await page.waitForTimeout(5000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/crep-initial.png', fullPage: false });
    console.log('📸 Screenshot: crep-initial.png');
    
    // Look for Earth-2 tab (lightning bolt icon)
    console.log('\n🔍 Looking for Earth-2 tab...');
    
    // Find all tabs in the right panel
    const tabs = await page.locator('[data-state="inactive"], [data-state="active"]').all();
    console.log(`   Found ${tabs.length} tab elements`);
    
    // Look for the Earth-2 tab - try multiple selectors
    let earth2Tab = page.locator('[value="earth2"]');
    let earth2TabExists = await earth2Tab.count() > 0;
    
    // Try alternative selectors if the first doesn't work
    if (!earth2TabExists) {
      console.log('   Trying alternative selectors...');
      
      // Look for tab with Zap icon (lightning bolt)
      earth2Tab = page.locator('button:has(svg.lucide-zap)');
      earth2TabExists = await earth2Tab.count() > 0;
      
      if (!earth2TabExists) {
        // Look for any tab-like element with lightning/zap
        earth2Tab = page.locator('[role="tab"] svg.lucide-zap').locator('..');
        earth2TabExists = await earth2Tab.count() > 0;
      }
      
      if (!earth2TabExists) {
        // Try data attribute
        earth2Tab = page.locator('[data-value="earth2"]');
        earth2TabExists = await earth2Tab.count() > 0;
      }
      
      if (!earth2TabExists) {
        // Try title attribute
        earth2Tab = page.locator('[title*="Earth-2"], [title*="NVIDIA"]');
        earth2TabExists = await earth2Tab.count() > 0;
      }
    }
    
    if (earth2TabExists) {
      console.log('✅ Earth-2 tab found!');
      
      // Click the Earth-2 tab
      console.log('🖱️ Clicking Earth-2 tab...');
      await earth2Tab.click();
      await page.waitForTimeout(1000);
      
      // Take screenshot after clicking
      await page.screenshot({ path: 'screenshots/crep-earth2-tab.png', fullPage: false });
      console.log('📸 Screenshot: crep-earth2-tab.png');
      
      // Check for Earth-2 content
      console.log('\n🔍 Checking Earth-2 tab content...');
      
      // Look for key elements
      const checks = [
        { selector: 'text=NVIDIA EARTH-2', name: 'NVIDIA EARTH-2 header' },
        { selector: 'text=AI WEATHER', name: 'AI WEATHER badge' },
        { selector: 'text=Earth-2 Weather', name: 'Layer control header' },
        { selector: 'text=Forecast', name: 'Forecast toggle' },
        { selector: 'text=Nowcast', name: 'Nowcast toggle' },
        { selector: 'text=Spore Dispersal', name: 'Spore Dispersal toggle' },
        { selector: 'text=Wind', name: 'Wind toggle' },
        { selector: 'text=AI Model', name: 'AI Model selector' },
        { selector: 'text=Forecast Time', name: 'Forecast Time slider' },
        { selector: 'text=Layer Opacity', name: 'Opacity slider' },
        { selector: 'text=Active Alerts', name: 'Alerts panel' },
        { selector: 'text=Atlas', name: 'Atlas model badge' },
      ];
      
      for (const check of checks) {
        const element = page.locator(check.selector).first();
        const exists = await element.count() > 0;
        const visible = exists ? await element.isVisible() : false;
        console.log(`   ${visible ? '✅' : '❌'} ${check.name}`);
      }
      
      // Test layer toggle interaction
      console.log('\n🧪 Testing layer toggle interaction...');
      
      // Toggle Forecast (Temperature)
      const forecastToggle = page.locator('button:has-text("Forecast")').first();
      if (await forecastToggle.count() > 0) {
        await forecastToggle.click();
        console.log('   ✅ Clicked Forecast toggle');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'screenshots/crep-earth2-forecast-on.png' });
        console.log('   📸 Screenshot: crep-earth2-forecast-on.png');
      }
      
      // Toggle Spore Dispersal
      const sporeToggle = page.locator('button:has-text("Spore Dispersal")').first();
      if (await sporeToggle.count() > 0) {
        await sporeToggle.click();
        console.log('   ✅ Clicked Spore Dispersal toggle');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'screenshots/crep-earth2-spore-on.png' });
        console.log('   📸 Screenshot: crep-earth2-spore-on.png');
      }
      
      // Toggle Wind
      const windToggle = page.locator('button:has-text("Wind")').first();
      if (await windToggle.count() > 0) {
        await windToggle.click();
        console.log('   ✅ Clicked Wind toggle');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'screenshots/crep-earth2-wind-on.png' });
        console.log('   📸 Screenshot: crep-earth2-wind-on.png');
      }
      
      // Test timeline
      console.log('\n🧪 Testing timeline controls...');
      const playButton = page.locator('button:has(svg.lucide-play)').first();
      if (await playButton.count() > 0) {
        console.log('   ✅ Found play button');
      }
      
    } else {
      console.log('❌ Earth-2 tab NOT found with standard selectors');
      
      // Debug: list all tab values
      const allTabs = await page.locator('[role="tab"]').all();
      console.log(`   Debug: Found ${allTabs.length} tabs with role="tab"`);
      
      // Look for any SVG icons that might be tabs
      const svgIcons = await page.locator('button svg, [role="tab"] svg').all();
      console.log(`   Found ${svgIcons.length} SVG icons in buttons/tabs`);
      
      // List all lucide icons found
      const lucideIcons = await page.locator('[class*="lucide"]').all();
      console.log(`   Found ${lucideIcons.length} Lucide icons total`);
      
      // Check for zap icon specifically
      const zapIcons = await page.locator('.lucide-zap, [class*="lucide-zap"]').all();
      console.log(`   Found ${zapIcons.length} Zap icons`);
      
      // Try to find any element that looks like a tab panel on the right
      const rightPanelTabs = await page.locator('.absolute.right-0 button, .fixed.right-0 button').all();
      console.log(`   Found ${rightPanelTabs.length} buttons in right-positioned panels`);
      
      // Take a screenshot of just the right side
      await page.screenshot({ path: 'screenshots/crep-right-panel.png', clip: { x: 800, y: 0, width: 400, height: 600 } });
      console.log('   📸 Screenshot: crep-right-panel.png');
    }
    
    // Final screenshot
    await page.screenshot({ path: 'screenshots/crep-final.png', fullPage: false });
    console.log('\n📸 Final screenshot: crep-final.png');
    
    // Report console errors
    if (consoleErrors.length > 0) {
      console.log('\n⚠️ Console Errors:');
      consoleErrors.forEach(err => console.log(`   - ${err}`));
    } else {
      console.log('\n✅ No console errors detected');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'screenshots/crep-error.png' });
  }
  
  // Keep browser open for manual inspection
  console.log('\n🔍 Browser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  console.log('\n✅ Test complete!');
}

// Create screenshots directory
import { mkdir } from 'fs/promises';
try {
  await mkdir('screenshots', { recursive: true });
} catch (e) {}

testEarth2Tab().catch(console.error);
