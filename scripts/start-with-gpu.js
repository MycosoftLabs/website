#!/usr/bin/env node
/**
 * Start Dev Server with GPU Services - February 5, 2026
 *
 * OOM WARNING: Do NOT run this inside Cursor's terminal. Run from an external
 * terminal (Windows Terminal, CMD) to avoid Cursor OOM crashes. See docs/OOM_PREVENTION_FEB18_2026.md (MAS repo).
 *
 * This script:
 * 1. Starts all local GPU services (PersonaPlex, Earth2Studio, Gateway)
 * 2. Waits for health checks to pass
 * 3. Starts Next.js dev server
 * 4. Handles graceful shutdown
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');

// Configuration
const GPU_SERVICES_SCRIPT = path.resolve(__dirname, '../../../mycosoft-mas/scripts/local_gpu_services.py');
const MAS_DIR = path.resolve(__dirname, '../../../mycosoft-mas');

const PORTS = {
  gateway: 8300,
  moshi: 8998,
  bridge: 8999,
  earth2: 8220,
};

const HEALTH_TIMEOUT = 180000; // 3 minutes for Moshi to load
const POLL_INTERVAL = 2000;

// Colors for console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${timestamp}] ${msg}${colors.reset}`);
}

function logHeader(msg) {
  console.log('\n' + '='.repeat(70));
  console.log(`${colors.bright}${colors.cyan}  ${msg}${colors.reset}`);
  console.log('='.repeat(70) + '\n');
}

// Check if a port is responding
function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Check if port is already in use (any response)
function isPortInUse(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Wait for port to become healthy
async function waitForPort(port, name, timeout = HEALTH_TIMEOUT) {
  const start = Date.now();
  let dots = 0;
  
  process.stdout.write(`  Waiting for ${name} (port ${port})`);
  
  while (Date.now() - start < timeout) {
    if (await checkPort(port)) {
      console.log(` ${colors.green}[OK]${colors.reset}`);
      return true;
    }
    
    dots++;
    process.stdout.write('.');
    
    if (dots % 30 === 0) {
      const elapsed = Math.round((Date.now() - start) / 1000);
      process.stdout.write(` (${elapsed}s)`);
    }
    
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
  
  console.log(` ${colors.red}[TIMEOUT]${colors.reset}`);
  return false;
}

// Check if GPU services are already running
async function checkExistingServices() {
  const results = {};
  for (const [name, port] of Object.entries(PORTS)) {
    results[name] = await isPortInUse(port);
  }
  return results;
}

// Start GPU services
function startGPUServices() {
  return new Promise((resolve, reject) => {
    log('Starting GPU services...', 'yellow');
    
    // Spawn Python process in a new console window on Windows
    const isWindows = process.platform === 'win32';
    
    let gpuProcess;
    
    if (isWindows) {
      // Use start command to open in new window
      gpuProcess = spawn('cmd', ['/c', 'start', 'GPU Services', 'python', GPU_SERVICES_SCRIPT], {
        cwd: MAS_DIR,
        detached: true,
        stdio: 'ignore',
      });
      gpuProcess.unref();
      
      // Give it a moment to spawn
      setTimeout(() => resolve(null), 2000);
    } else {
      gpuProcess = spawn('python', [GPU_SERVICES_SCRIPT], {
        cwd: MAS_DIR,
        detached: true,
        stdio: 'ignore',
      });
      gpuProcess.unref();
      resolve(gpuProcess);
    }
  });
}

// Start Next.js dev server
function startNextDev() {
  log('Starting Next.js dev server on port 3010...', 'blue');
  
  const nextProcess = spawn('npx', ['next', 'dev', '--port', '3010'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  });
  
  nextProcess.on('error', (err) => {
    log(`Next.js error: ${err.message}`, 'red');
  });
  
  nextProcess.on('exit', (code) => {
    log(`Next.js exited with code ${code}`, code === 0 ? 'green' : 'red');
    process.exit(code);
  });
  
  return nextProcess;
}

// Monitor GPU services in background (non-blocking)
async function monitorGPUServicesBackground() {
  // Wait a few seconds for Next.js to start, then show status
  await new Promise(r => setTimeout(r, 5000));
  
  log('Checking GPU services status...', 'cyan');
  
  for (const [name, port] of Object.entries(PORTS)) {
    const healthy = await checkPort(port);
    const status = healthy ? `${colors.green}[OK]${colors.reset}` : `${colors.yellow}[STARTING...]${colors.reset}`;
    console.log(`  ${name.padEnd(12)}: localhost:${port} ${status}`);
  }
  
  // Continue monitoring in background until all healthy or timeout
  const startTime = Date.now();
  while (Date.now() - startTime < HEALTH_TIMEOUT) {
    await new Promise(r => setTimeout(r, 10000)); // Check every 10 seconds
    
    let allHealthy = true;
    for (const port of Object.values(PORTS)) {
      if (!(await checkPort(port))) {
        allHealthy = false;
        break;
      }
    }
    
    if (allHealthy) {
      log('All GPU services now online!', 'green');
      console.log('  Voice commands and Earth2 features are now available.');
      return;
    }
  }
}

// Main function
async function main() {
  logHeader('MYCOSOFT DEV SERVER WITH GPU SERVICES');
  
  console.log('  GPU Services (loading in background):');
  console.log(`    - GPU Gateway:       localhost:${PORTS.gateway}`);
  console.log(`    - PersonaPlex/Moshi: localhost:${PORTS.moshi} (23GB VRAM)`);
  console.log(`    - PersonaPlex Bridge:localhost:${PORTS.bridge}`);
  console.log(`    - Earth2Studio API:  localhost:${PORTS.earth2}`);
  console.log('');
  
  // Check if services are already running - quick check only
  const existing = await checkExistingServices();
  const allRunning = Object.values(existing).every(v => v);
  const someRunning = Object.values(existing).some(v => v);
  
  if (allRunning) {
    log('All GPU services already running!', 'green');
  } else {
    // Start GPU services in background (don't wait)
    if (!someRunning) {
      log('Starting GPU services in background...', 'yellow');
    } else {
      log('Starting missing GPU services in background...', 'yellow');
    }
    startGPUServices(); // Don't await - let it run in background
  }
  
  // Start Next.js IMMEDIATELY - don't wait for GPU services
  logHeader('STARTING DEV SERVER');
  
  console.log('  URL: http://localhost:3010');
  console.log('  GPU Gateway: http://localhost:8300/docs');
  console.log('  Earth2 API: http://localhost:8220/docs');
  console.log('');
  log('Next.js starting NOW - GPU services loading in background', 'cyan');
  console.log('');
  
  startNextDev();
  
  // Monitor GPU services in background (non-blocking)
  monitorGPUServicesBackground().catch(err => {
    log(`GPU monitor error: ${err.message}`, 'yellow');
  });
}

// Handle shutdown
process.on('SIGINT', () => {
  log('\nShutting down...', 'yellow');
  log('Note: GPU services continue running in background.', 'cyan');
  log('To stop them: Close the GPU Services window or kill Python processes.', 'cyan');
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// Run
main().catch((err) => {
  log(`Error: ${err.message}`, 'red');
  process.exit(1);
});
