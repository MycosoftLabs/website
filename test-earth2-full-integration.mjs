/**
 * Full Earth-2 Integration Test
 * February 5, 2026
 * 
 * Tests NVIDIA Earth-2 integration on CREP Dashboard and Earth Simulator
 */

import { chromium } from 'playwright';

async function testEarth2Integration() {
  console.log('\n🌍 NVIDIA Earth-2 Full Integration Test');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  // Collect console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Earth-2') || text.includes('earth2')) {
      logs.push(`[${msg.type()}] ${text}`);
    }
  });

  try {
    // ═══════════════════════════════════════════════════════════════
    // TEST 1: CREP Dashboard Earth-2 Tab
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📍 TEST 1: CREP Dashboard');
    console.log('-'.repeat(40));
    
    await page.goto('http://localhost:3010/dashboard/crep', { waitUntil: 'networkidle', timeout: 60000 });
    console.log('✅ CREP Dashboard loaded');
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/earth2-crep-initial.png', fullPage: true });
    console.log('📸 Screenshot: earth2-crep-initial.png');
    
    // Find and click Earth-2 tab
    const earth2Tab = page.locator('[value="earth2"]');
    if (await earth2Tab.count() > 0) {
      await earth2Tab.click();
      console.log('✅ Clicked Earth-2 tab');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/earth2-crep-tab-open.png', fullPage: true });
      console.log('📸 Screenshot: earth2-crep-tab-open.png');
    } else {
      console.log('⚠️ Earth-2 tab not found, trying alternative selectors...');
      const altTab = page.locator('button:has-text("⚡")');
      if (await altTab.count() > 0) {
        await altTab.first().click();
        console.log('✅ Clicked Earth-2 via ⚡ button');
        await page.waitForTimeout(2000);
      }
    }
    
    // Check for Earth-2 Layer Control
    const layerControl = page.locator('text=NVIDIA Earth-2');
    if (await layerControl.count() > 0) {
      console.log('✅ Earth-2 Layer Control found');
    }
    
    // Toggle layers
    console.log('\n🔘 Testing layer toggles...');
    
    // Toggle Forecast layer
    const forecastToggle = page.locator('button:has-text("Forecast")').first();
    if (await forecastToggle.count() > 0) {
      await forecastToggle.click();
      console.log('   ✅ Toggled Forecast layer');
      await page.waitForTimeout(2000);
    }
    
    // Toggle Temperature layer
    const tempToggle = page.locator('button:has-text("Temperature")').first();
    if (await tempToggle.count() > 0) {
      await tempToggle.click();
      console.log('   ✅ Toggled Temperature layer');
      await page.waitForTimeout(2000);
    }
    
    // Toggle Wind layer
    const windToggle = page.locator('button:has-text("Wind")').first();
    if (await windToggle.count() > 0) {
      await windToggle.click();
      console.log('   ✅ Toggled Wind layer');
      await page.waitForTimeout(2000);
    }
    
    // Toggle Spore Dispersal layer
    const sporeToggle = page.locator('button:has-text("Spore")').first();
    if (await sporeToggle.count() > 0) {
      await sporeToggle.click();
      console.log('   ✅ Toggled Spore Dispersal layer');
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ path: 'screenshots/earth2-crep-layers-active.png', fullPage: true });
    console.log('📸 Screenshot: earth2-crep-layers-active.png');
    
    // Check for visible map layers
    const mapCanvas = page.locator('canvas.maplibregl-canvas');
    if (await mapCanvas.count() > 0) {
      console.log('✅ MapLibre canvas found - map is rendering');
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TEST 2: Earth Simulator
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📍 TEST 2: Earth Simulator');
    console.log('-'.repeat(40));
    
    await page.goto('http://localhost:3010/apps/earth-simulator', { waitUntil: 'networkidle', timeout: 60000 });
    console.log('✅ Earth Simulator loaded');
    
    await page.waitForTimeout(5000); // Wait for Cesium to load
    await page.screenshot({ path: 'screenshots/earth2-simulator-initial.png', fullPage: true });
    console.log('📸 Screenshot: earth2-simulator-initial.png');
    
    // Find the Layers control panel
    const layersPanel = page.locator('text=Layers').first();
    if (await layersPanel.count() > 0) {
      await layersPanel.click();
      console.log('✅ Opened Layers panel');
      await page.waitForTimeout(1000);
    }
    
    // Toggle Earth-2 layers in Earth Simulator
    console.log('\n🔘 Testing Earth-2 3D layers...');
    
    // Look for Earth-2 checkboxes
    const earth2Forecast = page.locator('label:has-text("Earth-2 AI Forecast")');
    if (await earth2Forecast.count() > 0) {
      await earth2Forecast.click();
      console.log('   ✅ Toggled Earth-2 AI Forecast');
      await page.waitForTimeout(2000);
    }
    
    const earth2WindField = page.locator('label:has-text("Wind")');
    if (await earth2WindField.count() > 0) {
      await earth2WindField.first().click();
      console.log('   ✅ Toggled Wind layer');
      await page.waitForTimeout(2000);
    }
    
    const earth2Storms = page.locator('label:has-text("Storm")');
    if (await earth2Storms.count() > 0) {
      await earth2Storms.first().click();
      console.log('   ✅ Toggled Storm Cells layer');
      await page.waitForTimeout(2000);
    }
    
    const earth2Spore = page.locator('label:has-text("Spore")');
    if (await earth2Spore.count() > 0) {
      await earth2Spore.first().click();
      console.log('   ✅ Toggled Spore Dispersal layer');
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ path: 'screenshots/earth2-simulator-layers-active.png', fullPage: true });
    console.log('📸 Screenshot: earth2-simulator-layers-active.png');
    
    // Check for Cesium globe
    const cesiumCanvas = page.locator('.cesium-viewer canvas');
    if (await cesiumCanvas.count() > 0) {
      console.log('✅ Cesium globe canvas found - 3D globe is rendering');
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TEST 3: Earth-2 API Status
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📍 TEST 3: Earth-2 API Status');
    console.log('-'.repeat(40));
    
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch('/api/earth2');
      return await res.json();
    });
    
    console.log('Earth-2 API Response:', JSON.stringify(apiResponse, null, 2));
    
    if (apiResponse.models) {
      console.log(`✅ Earth-2 models available: ${apiResponse.models.length}`);
      apiResponse.models.forEach(m => {
        console.log(`   - ${m.displayName}: ${m.description}`);
      });
    }
    
    // ═══════════════════════════════════════════════════════════════
    // Results Summary
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\n📝 Console logs with Earth-2:');
    logs.forEach(log => console.log('   ' + log));
    
    console.log('\n✅ Full integration test completed!');
    console.log('📁 Screenshots saved in ./screenshots/');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Test error:', error);
    await page.screenshot({ path: 'screenshots/earth2-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testEarth2Integration().catch(console.error);
