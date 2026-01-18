/**
 * Test Storage Uploads
 * 
 * Tests file uploads to all Supabase storage buckets
 * Run with: npx tsx scripts/test-storage-uploads.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test file paths (create these if they don't exist)
const testFiles = {
  avatar: path.join(__dirname, '../test-files/test-avatar.jpg'),
  species: path.join(__dirname, '../test-files/test-species.jpg'),
  firmware: path.join(__dirname, '../test-files/test-firmware.bin'),
  document: path.join(__dirname, '../test-files/test-document.pdf'),
  telemetry: path.join(__dirname, '../test-files/test-telemetry.json'),
}

// Create test files if they don't exist
function createTestFiles() {
  const testDir = path.join(__dirname, '../test-files')
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true })
  }

  // Create a simple test image (1x1 pixel PNG as base64)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const testImageBuffer = Buffer.from(testImageBase64, 'base64')

  // Create test files
  if (!fs.existsSync(testFiles.avatar)) {
    fs.writeFileSync(testFiles.avatar, testImageBuffer)
  }
  if (!fs.existsSync(testFiles.species)) {
    fs.writeFileSync(testFiles.species, testImageBuffer)
  }
  if (!fs.existsSync(testFiles.firmware)) {
    fs.writeFileSync(testFiles.firmware, Buffer.from('test firmware data'))
  }
  if (!fs.existsSync(testFiles.document)) {
    fs.writeFileSync(testFiles.document, Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\ntrailer\n<< /Root 1 0 R >>\n%%EOF'))
  }
  if (!fs.existsSync(testFiles.telemetry)) {
    fs.writeFileSync(testFiles.telemetry, JSON.stringify({ timestamp: Date.now(), data: 'test' }))
  }
}

async function testUpload(bucket: string, filePath: string, fileName: string) {
  console.log(`\n📤 Testing upload to ${bucket}...`)
  
  try {
    const fileBuffer = fs.readFileSync(filePath)
    const file = new File([fileBuffer], fileName, { type: getMimeType(fileName) })
    
    const testPath = `test/${Date.now()}-${fileName}`
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(testPath, file, {
        contentType: getMimeType(fileName),
        upsert: false,
      })

    if (error) {
      console.error(`❌ Upload failed: ${error.message}`)
      return false
    }

    console.log(`✅ Upload successful: ${testPath}`)
    
    // Test public URL (for public buckets)
    if (bucket === 'avatars' || bucket === 'species-images') {
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(testPath)
      console.log(`   Public URL: ${urlData.publicUrl}`)
    }
    
    // Clean up test file
    await supabase.storage.from(bucket).remove([testPath])
    console.log(`   ✅ Test file cleaned up`)
    
    return true
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return false
  }
}

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.bin': 'application/octet-stream',
    '.json': 'application/json',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

async function main() {
  console.log('🧪 Starting Storage Upload Tests\n')
  console.log('=' .repeat(50))
  
  // Create test files
  console.log('📁 Creating test files...')
  createTestFiles()
  console.log('✅ Test files ready\n')
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.log('⚠️  No active session. Testing with anon key (may fail for private buckets)')
    console.log('   For full testing, please authenticate first\n')
  } else {
    console.log(`✅ Authenticated as: ${session.user.email}\n`)
  }
  
  const results: Record<string, boolean> = {}
  
  // Test each bucket
  results.avatars = await testUpload('avatars', testFiles.avatar, 'test-avatar.jpg')
  results['species-images'] = await testUpload('species-images', testFiles.species, 'test-species.jpg')
  results.firmware = await testUpload('firmware', testFiles.firmware, 'test-firmware.bin')
  results.documents = await testUpload('documents', testFiles.document, 'test-document.pdf')
  results['telemetry-exports'] = await testUpload('telemetry-exports', testFiles.telemetry, 'test-telemetry.json')
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Results Summary\n')
  
  const total = Object.keys(results).length
  const passed = Object.values(results).filter(Boolean).length
  
  Object.entries(results).forEach(([bucket, success]) => {
    console.log(`${success ? '✅' : '❌'} ${bucket}: ${success ? 'PASSED' : 'FAILED'}`)
  })
  
  console.log(`\n${passed}/${total} tests passed`)
  
  if (passed === total) {
    console.log('🎉 All tests passed!')
    process.exit(0)
  } else {
    console.log('⚠️  Some tests failed')
    process.exit(1)
  }
}

main().catch(console.error)
