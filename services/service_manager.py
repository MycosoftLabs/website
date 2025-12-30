#!/usr/bin/env python3
"""
Service Manager for Mycosoft Services
Automatically starts, monitors, and maintains all system services.
"""

import subprocess
import time
import psutil
import requests
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime
import signal
import atexit

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class ServiceConfig:
    """Configuration for a service."""
    name: str
    command: List[str]
    port: Optional[int] = None
    health_check_url: Optional[str] = None
    working_dir: Optional[str] = None
    env: Optional[Dict[str, str]] = None
    restart_delay: int = 5
    max_restarts: int = 10
    restart_window: int = 300  # seconds


class ServiceManager:
    """Manages system services with auto-start and monitoring."""
    
    def __init__(self):
        self.services: Dict[str, ServiceConfig] = {}
        self.processes: Dict[str, subprocess.Popen] = {}
        self.restart_counts: Dict[str, int] = {}
        self.last_restart: Dict[str, float] = {}
        self.running = False
        
        # Register cleanup handlers
        atexit.register(self.cleanup)
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.cleanup()
        sys.exit(0)
    
    def register_service(self, config: ServiceConfig):
        """Register a service to be managed."""
        self.services[config.name] = config
        self.restart_counts[config.name] = 0
        self.last_restart[config.name] = 0
        logger.info(f"Registered service: {config.name}")
    
    def start_service(self, name: str) -> bool:
        """Start a service."""
        if name not in self.services:
            logger.error(f"Service {name} not registered")
            return False
        
        if name in self.processes:
            proc = self.processes[name]
            if proc.poll() is None:  # Still running
                logger.info(f"Service {name} already running")
                return True
            else:
                logger.warning(f"Service {name} process exists but not running, cleaning up")
                del self.processes[name]
        
        config = self.services[name]
        logger.info(f"Starting service: {name} with command: {' '.join(config.command)}")
        
        try:
            env = os.environ.copy()
            if config.env:
                env.update(config.env)
            
            working_dir = config.working_dir or os.getcwd()
            
            proc = subprocess.Popen(
                config.command,
                cwd=working_dir,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
            )
            
            self.processes[name] = proc
            self.last_restart[name] = time.time()
            
            logger.info(f"Service {name} started with PID {proc.pid}")
            
            # Wait a moment for service to initialize
            time.sleep(2)
            
            # Check if process is still alive
            if proc.poll() is not None:
                stdout, stderr = proc.communicate()
                logger.error(f"Service {name} exited immediately. stdout: {stdout.decode()[:200]}, stderr: {stderr.decode()[:200]}")
                del self.processes[name]
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to start service {name}: {e}")
            return False
    
    def stop_service(self, name: str) -> bool:
        """Stop a service."""
        if name not in self.processes:
            logger.warning(f"Service {name} not running")
            return True
        
        proc = self.processes[name]
        logger.info(f"Stopping service: {name} (PID {proc.pid})")
        
        try:
            # Try graceful shutdown
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # Force kill if it doesn't stop
                logger.warning(f"Service {name} didn't stop gracefully, forcing kill")
                proc.kill()
                proc.wait()
            
            del self.processes[name]
            logger.info(f"Service {name} stopped")
            return True
            
        except Exception as e:
            logger.error(f"Error stopping service {name}: {e}")
            return False
    
    def restart_service(self, name: str) -> bool:
        """Restart a service."""
        logger.info(f"Restarting service: {name}")
        self.stop_service(name)
        time.sleep(self.services[name].restart_delay)
        return self.start_service(name)
    
    def check_service_health(self, name: str) -> bool:
        """Check if a service is healthy."""
        if name not in self.processes:
            return False
        
        proc = self.processes[name]
        
        # Check if process is running
        if proc.poll() is not None:
            logger.warning(f"Service {name} process is not running (exit code: {proc.returncode})")
            return False
        
        # Check health endpoint if configured
        config = self.services[name]
        if config.health_check_url:
            try:
                response = requests.get(config.health_check_url, timeout=2)
                if response.status_code == 200:
                    return True
                else:
                    logger.warning(f"Service {name} health check returned {response.status_code}")
                    return False
            except Exception as e:
                logger.warning(f"Service {name} health check failed: {e}")
                return False
        
        # If no health check URL, just check process
        return True
    
    def monitor_services(self):
        """Monitor all services and restart if needed."""
        while self.running:
            try:
                for name in list(self.services.keys()):
                    if not self.check_service_health(name):
                        logger.warning(f"Service {name} is unhealthy")
                        
                        # Check restart limits
                        config = self.services[name]
                        now = time.time()
                        
                        # Reset restart count if outside window
                        if now - self.last_restart[name] > config.restart_window:
                            self.restart_counts[name] = 0
                        
                        if self.restart_counts[name] < config.max_restarts:
                            self.restart_counts[name] += 1
                            logger.info(f"Restarting {name} (attempt {self.restart_counts[name]}/{config.max_restarts})")
                            self.restart_service(name)
                        else:
                            logger.error(f"Service {name} exceeded max restarts, stopping attempts")
                            self.stop_service(name)
                
                time.sleep(10)  # Check every 10 seconds
                
            except Exception as e:
                logger.error(f"Error in monitor loop: {e}")
                time.sleep(10)
    
    def start_all(self):
        """Start all registered services."""
        logger.info("Starting all services...")
        self.running = True
        
        for name in self.services.keys():
            self.start_service(name)
        
        # Start monitoring in background
        import threading
        monitor_thread = threading.Thread(target=self.monitor_services, daemon=True)
        monitor_thread.start()
        
        logger.info("All services started, monitoring active")
    
    def stop_all(self):
        """Stop all services."""
        logger.info("Stopping all services...")
        self.running = False
        
        for name in list(self.processes.keys()):
            self.stop_service(name)
        
        logger.info("All services stopped")
    
    def cleanup(self):
        """Cleanup on exit."""
        self.stop_all()


# Global service manager instance
service_manager = ServiceManager()


def setup_services():
    """Setup all Mycosoft services."""
    # Get the website root directory
    website_root = Path(__file__).parent.parent
    
    # MycoBrain Service
    mycobrain_service_dir = website_root / "services" / "mycobrain"
    
    service_manager.register_service(ServiceConfig(
        name="mycobrain",
        command=[
            sys.executable, "-m", "uvicorn",
            "mycobrain_service:app",
            "--host", "0.0.0.0",
            "--port", "8765"
        ],
        working_dir=str(mycobrain_service_dir),
        port=8765,
        health_check_url="http://localhost:8765/health",
        restart_delay=5,
        max_restarts=10
    ))
    
    logger.info("Services configured")


def main():
    """Main entry point."""
    logger.info("Starting Mycosoft Service Manager...")
    
    setup_services()
    service_manager.start_all()
    
    try:
        # Keep running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        service_manager.stop_all()


if __name__ == "__main__":
    main()











