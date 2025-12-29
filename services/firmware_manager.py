#!/usr/bin/env python3
"""
Firmware Manager for MycoBrain Devices
Automatically compiles, uploads, and tests firmware on ESP32 boards.
Supports PlatformIO and Arduino IDE workflows.
"""

import subprocess
import os
import sys
import time
import serial
import serial.tools.list_ports
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import json
import shutil

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class FirmwareConfig:
    """Configuration for firmware compilation and upload."""
    name: str
    firmware_path: Path
    side: str  # "A" or "B"
    platformio_env: Optional[str] = None
    arduino_board: Optional[str] = None
    upload_port: Optional[str] = None
    baud_rate: int = 115200
    build_flags: List[str] = None


class FirmwareManager:
    """Manages firmware compilation, upload, and testing for MycoBrain devices."""
    
    def __init__(self):
        self.firmware_configs: Dict[str, FirmwareConfig] = {}
        self.platformio_available = self._check_platformio()
        self.arduino_available = self._check_arduino()
        self.upload_history: List[Dict] = []
        
    def _check_platformio(self) -> bool:
        """Check if PlatformIO is available."""
        try:
            result = subprocess.run(
                ["pio", "--version"],
                capture_output=True,
                timeout=5
            )
            if result.returncode == 0:
                logger.info(f"PlatformIO available: {result.stdout.decode().strip()}")
                return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        # Try alternative command
        try:
            result = subprocess.run(
                ["platformio", "--version"],
                capture_output=True,
                timeout=5
            )
            if result.returncode == 0:
                logger.info(f"PlatformIO available: {result.stdout.decode().strip()}")
                return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        logger.warning("PlatformIO not found. Install with: pip install platformio")
        return False
    
    def _check_arduino(self) -> bool:
        """Check if Arduino CLI is available."""
        try:
            result = subprocess.run(
                ["arduino-cli", "version"],
                capture_output=True,
                timeout=5
            )
            if result.returncode == 0:
                logger.info(f"Arduino CLI available: {result.stdout.decode().strip()}")
                return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        # Check for Arduino IDE installation
        arduino_paths = [
            Path("C:/Program Files/Arduino/arduino.exe"),
            Path("C:/Program Files (x86)/Arduino/arduino.exe"),
            Path.home() / "AppData/Local/Arduino/arduino.exe",
        ]
        
        for path in arduino_paths:
            if path.exists():
                logger.info(f"Arduino IDE found at: {path}")
                return True
        
        logger.warning("Arduino CLI/IDE not found")
        return False
    
    def register_firmware(self, config: FirmwareConfig):
        """Register a firmware configuration."""
        if not config.firmware_path.exists():
            raise FileNotFoundError(f"Firmware path not found: {config.firmware_path}")
        
        self.firmware_configs[config.name] = config
        logger.info(f"Registered firmware: {config.name} (Side {config.side})")
    
    def detect_esp32_ports(self) -> List[Dict[str, str]]:
        """Detect ESP32 devices on serial ports."""
        ports = []
        for port in serial.tools.list_ports.comports():
            desc = port.description.upper()
            hwid = port.hwid.upper()
            
            # Check for ESP32 indicators
            esp32_indicators = ["ESP32", "CH340", "CH341", "CP210", "FTDI", "SILABS"]
            if any(indicator in desc or indicator in hwid for indicator in esp32_indicators):
                ports.append({
                    "port": port.device,
                    "description": port.description,
                    "hwid": port.hwid,
                })
        
        return ports
    
    def compile_firmware(self, firmware_name: str, use_platformio: bool = True) -> Tuple[bool, str]:
        """Compile firmware using PlatformIO or Arduino."""
        if firmware_name not in self.firmware_configs:
            return False, f"Firmware {firmware_name} not registered"
        
        config = self.firmware_configs[firmware_name]
        
        if use_platformio and self.platformio_available:
            return self._compile_platformio(config)
        elif not use_platformio and self.arduino_available:
            return self._compile_arduino(config)
        else:
            return False, "No build tools available (PlatformIO or Arduino)"
    
    def _compile_platformio(self, config: FirmwareConfig) -> Tuple[bool, str]:
        """Compile firmware using PlatformIO."""
        logger.info(f"Compiling {config.name} with PlatformIO...")
        
        try:
            # Change to firmware directory
            original_dir = os.getcwd()
            os.chdir(config.firmware_path)
            
            # Build command
            cmd = ["pio", "run"]
            if config.platformio_env:
                cmd.extend(["-e", config.platformio_env])
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            os.chdir(original_dir)
            
            if result.returncode == 0:
                logger.info(f"✓ {config.name} compiled successfully")
                return True, "Compilation successful"
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f"✗ Compilation failed: {error_msg[:500]}")
                return False, f"Compilation failed: {error_msg[:500]}"
                
        except subprocess.TimeoutExpired:
            os.chdir(original_dir)
            return False, "Compilation timeout (exceeded 5 minutes)"
        except Exception as e:
            os.chdir(original_dir)
            logger.error(f"Compilation error: {e}")
            return False, str(e)
    
    def _compile_arduino(self, config: FirmwareConfig) -> Tuple[bool, str]:
        """Compile firmware using Arduino CLI."""
        logger.info(f"Compiling {config.name} with Arduino CLI...")
        
        try:
            # Arduino CLI compile command
            cmd = [
                "arduino-cli", "compile",
                "--fqbn", config.arduino_board or "esp32:esp32:esp32",
                str(config.firmware_path)
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                logger.info(f"✓ {config.name} compiled successfully")
                return True, "Compilation successful"
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f"✗ Compilation failed: {error_msg[:500]}")
                return False, f"Compilation failed: {error_msg[:500]}"
                
        except subprocess.TimeoutExpired:
            return False, "Compilation timeout"
        except Exception as e:
            logger.error(f"Compilation error: {e}")
            return False, str(e)
    
    def upload_firmware(self, firmware_name: str, port: str, use_platformio: bool = True) -> Tuple[bool, str]:
        """Upload firmware to device."""
        if firmware_name not in self.firmware_configs:
            return False, f"Firmware {firmware_name} not registered"
        
        config = self.firmware_configs[firmware_name]
        
        # Check if port exists
        available_ports = [p["port"] for p in self.detect_esp32_ports()]
        if port not in available_ports:
            return False, f"Port {port} not found or not an ESP32 device"
        
        if use_platformio and self.platformio_available:
            return self._upload_platformio(config, port)
        elif not use_platformio and self.arduino_available:
            return self._upload_arduino(config, port)
        else:
            return False, "No upload tools available"
    
    def _upload_platformio(self, config: FirmwareConfig, port: str) -> Tuple[bool, str]:
        """Upload firmware using PlatformIO."""
        logger.info(f"Uploading {config.name} to {port}...")
        
        try:
            original_dir = os.getcwd()
            os.chdir(config.firmware_path)
            
            # Upload command
            cmd = ["pio", "run", "-t", "upload"]
            if config.platformio_env:
                cmd.extend(["-e", config.platformio_env])
            cmd.extend(["--upload-port", port])
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout
            )
            
            os.chdir(original_dir)
            
            if result.returncode == 0:
                logger.info(f"✓ {config.name} uploaded successfully to {port}")
                
                # Record upload
                self.upload_history.append({
                    "firmware": config.name,
                    "port": port,
                    "side": config.side,
                    "timestamp": datetime.now().isoformat(),
                    "success": True
                })
                
                return True, "Upload successful"
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f"✗ Upload failed: {error_msg[:500]}")
                return False, f"Upload failed: {error_msg[:500]}"
                
        except subprocess.TimeoutExpired:
            os.chdir(original_dir)
            return False, "Upload timeout"
        except Exception as e:
            os.chdir(original_dir)
            logger.error(f"Upload error: {e}")
            return False, str(e)
    
    def _upload_arduino(self, config: FirmwareConfig, port: str) -> Tuple[bool, str]:
        """Upload firmware using Arduino CLI."""
        logger.info(f"Uploading {config.name} to {port}...")
        
        try:
            cmd = [
                "arduino-cli", "upload",
                "-p", port,
                "--fqbn", config.arduino_board or "esp32:esp32:esp32",
                str(config.firmware_path)
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                logger.info(f"✓ {config.name} uploaded successfully to {port}")
                
                self.upload_history.append({
                    "firmware": config.name,
                    "port": port,
                    "side": config.side,
                    "timestamp": datetime.now().isoformat(),
                    "success": True
                })
                
                return True, "Upload successful"
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f"✗ Upload failed: {error_msg[:500]}")
                return False, f"Upload failed: {error_msg[:500]}"
                
        except subprocess.TimeoutExpired:
            return False, "Upload timeout"
        except Exception as e:
            logger.error(f"Upload error: {e}")
            return False, str(e)
    
    def test_firmware(self, port: str, timeout: int = 10) -> Tuple[bool, Dict]:
        """Test firmware after upload by checking device response."""
        logger.info(f"Testing firmware on {port}...")
        
        try:
            # Open serial connection
            ser = serial.Serial(port, 115200, timeout=2)
            time.sleep(2)  # Wait for device to reset
            
            # Clear any existing data
            ser.reset_input_buffer()
            ser.reset_output_buffer()
            
            # Send PING command (JSON format for compatibility)
            test_commands = [
                (b'{"cmd": 1}\n', "PING"),  # PING
                (b'{"cmd": 2}\n', "GET_SENSOR_DATA"),  # GET_SENSOR_DATA
            ]
            
            responses = []
            for cmd_bytes, cmd_name in test_commands:
                logger.info(f"Sending {cmd_name}...")
                ser.write(cmd_bytes)
                time.sleep(1)  # Wait for response
                
                if ser.in_waiting > 0:
                    response = ser.read(ser.in_waiting).decode('utf-8', errors='replace')
                    responses.append({
                        "command": cmd_name,
                        "response": response.strip(),
                        "length": len(response)
                    })
                    logger.info(f"Received response for {cmd_name}: {response[:100]}")
                else:
                    responses.append({
                        "command": cmd_name,
                        "response": None,
                        "error": "No response"
                    })
            
            ser.close()
            
            # Analyze responses
            ping_ok = any(r.get("response") for r in responses if r.get("command") == "PING")
            sensor_ok = any(r.get("response") for r in responses if r.get("command") == "GET_SENSOR_DATA")
            
            test_results = {
                "port": port,
                "ping_response": ping_ok,
                "sensor_response": sensor_ok,
                "responses": responses,
                "timestamp": datetime.now().isoformat()
            }
            
            success = ping_ok  # At least PING should work
            
            if success:
                logger.info(f"✓ Firmware test passed on {port}")
            else:
                logger.warning(f"✗ Firmware test failed on {port} - no responses received")
            
            return success, test_results
            
        except serial.SerialException as e:
            error_msg = str(e)
            if "Access is denied" in error_msg or "in use" in error_msg.lower():
                logger.error(f"Port {port} is locked by another application")
                return False, {"error": f"Port {port} is locked. Close serial monitors or Arduino IDE.", "port": port}
            logger.error(f"Serial error: {e}")
            return False, {"error": str(e), "port": port}
        except Exception as e:
            logger.error(f"Test error: {e}")
            return False, {"error": str(e), "port": port}
    
    def compile_and_upload(self, firmware_name: str, port: str, use_platformio: bool = True, test: bool = True) -> Dict:
        """Complete workflow: compile, upload, and test firmware."""
        logger.info(f"Starting firmware update: {firmware_name} -> {port}")
        
        result = {
            "firmware": firmware_name,
            "port": port,
            "compile_success": False,
            "upload_success": False,
            "test_success": False,
            "errors": [],
            "timestamp": datetime.now().isoformat()
        }
        
        # Step 1: Compile
        compile_success, compile_msg = self.compile_firmware(firmware_name, use_platformio)
        result["compile_success"] = compile_success
        if not compile_success:
            result["errors"].append(f"Compilation: {compile_msg}")
            return result
        
        # Step 2: Upload
        upload_success, upload_msg = self.upload_firmware(firmware_name, port, use_platformio)
        result["upload_success"] = upload_success
        if not upload_success:
            result["errors"].append(f"Upload: {upload_msg}")
            return result
        
        # Step 3: Test (if requested)
        if test:
            logger.info("Waiting for device to restart...")
            time.sleep(5)  # Wait longer for device to fully restart
            test_success, test_results = self.test_firmware(port)
            result["test_success"] = test_success
            result["test_results"] = test_results
            if not test_success:
                result["errors"].append("Firmware test failed - device may not be responding")
                if test_results.get("error"):
                    result["errors"].append(f"Test error: {test_results['error']}")
        
        logger.info(f"Firmware update complete: {firmware_name} -> {port}")
        return result
    
    def get_upload_history(self, limit: int = 10) -> List[Dict]:
        """Get recent upload history."""
        return self.upload_history[-limit:]


# Global firmware manager instance
firmware_manager = FirmwareManager()


def setup_firmware_configs():
    """Setup default firmware configurations."""
    # Get the website root directory
    website_root = Path(__file__).parent.parent
    
    # Try to find firmware directories
    # Check common locations
    firmware_locations = [
        website_root.parent.parent / "mycobrain" / "firmware",
        website_root.parent.parent / "MYCOBRAIN" / "firmware",
        Path.home() / "Documents" / "mycobrain" / "firmware",
        Path("C:/Users/admin2/Desktop/MYCOSOFT/CODE/mycobrain/firmware"),
    ]
    
    for base_path in firmware_locations:
        if base_path.exists():
            logger.info(f"Found firmware directory: {base_path}")
            
            # Side A firmware
            side_a_path = base_path / "sideA"
            if side_a_path.exists():
                firmware_manager.register_firmware(FirmwareConfig(
                    name="sideA",
                    firmware_path=side_a_path,
                    side="A",
                    platformio_env="esp32-s3-devkitc-1",
                    arduino_board="esp32:esp32:esp32s3",
                ))
            
            # Side B firmware
            side_b_path = base_path / "sideB"
            if side_b_path.exists():
                firmware_manager.register_firmware(FirmwareConfig(
                    name="sideB",
                    firmware_path=side_b_path,
                    side="B",
                    platformio_env="esp32-s3-devkitc-1",
                    arduino_board="esp32:esp32:esp32s3",
                ))
            
            break
    
    if not firmware_manager.firmware_configs:
        logger.warning("No firmware directories found. Register firmware manually.")


def main():
    """Main entry point for firmware manager CLI."""
    import argparse
    
    parser = argparse.ArgumentParser(description="MycoBrain Firmware Manager")
    parser.add_argument("action", choices=["compile", "upload", "test", "full", "list", "detect"],
                       help="Action to perform")
    parser.add_argument("--firmware", "-f", help="Firmware name (sideA or sideB)")
    parser.add_argument("--port", "-p", help="Serial port (e.g., COM4)")
    parser.add_argument("--platformio", action="store_true", default=True,
                       help="Use PlatformIO (default)")
    parser.add_argument("--arduino", action="store_true",
                       help="Use Arduino CLI instead of PlatformIO")
    
    args = parser.parse_args()
    
    setup_firmware_configs()
    
    if args.action == "list":
        print("Registered firmware:")
        for name, config in firmware_manager.firmware_configs.items():
            print(f"  - {name} (Side {config.side}): {config.firmware_path}")
    
    elif args.action == "detect":
        ports = firmware_manager.detect_esp32_ports()
        print(f"Found {len(ports)} ESP32 device(s):")
        for port in ports:
            print(f"  - {port['port']}: {port['description']}")
    
    elif args.action == "compile":
        if not args.firmware:
            print("Error: --firmware required")
            return
        success, msg = firmware_manager.compile_firmware(
            args.firmware,
            use_platformio=not args.arduino
        )
        print(f"{'✓' if success else '✗'} {msg}")
    
    elif args.action == "upload":
        if not args.firmware or not args.port:
            print("Error: --firmware and --port required")
            return
        success, msg = firmware_manager.upload_firmware(
            args.firmware,
            args.port,
            use_platformio=not args.arduino
        )
        print(f"{'✓' if success else '✗'} {msg}")
    
    elif args.action == "test":
        if not args.port:
            print("Error: --port required")
            return
        success, results = firmware_manager.test_firmware(args.port)
        print(f"{'✓' if success else '✗'} Test {'passed' if success else 'failed'}")
        print(f"Results: {json.dumps(results, indent=2)}")
    
    elif args.action == "full":
        if not args.firmware or not args.port:
            print("Error: --firmware and --port required")
            return
        result = firmware_manager.compile_and_upload(
            args.firmware,
            args.port,
            use_platformio=not args.arduino,
            test=True
        )
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()






