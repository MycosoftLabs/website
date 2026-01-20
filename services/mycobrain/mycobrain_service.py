#!/usr/bin/env python3
"""
MycoBrain Serial Communication Service
Provides REST API for communicating with MycoBrain devices via USB serial.

Supports both JSON (legacy) and MDP v1 (COBS + CRC16) protocols.
Firmware repository: https://github.com/MycosoftLabs/mycobrain

Run with: uvicorn mycobrain_service:app --host 0.0.0.0 --port 8765 --reload
"""

import asyncio
import json
import time
import os
import sys
from datetime import datetime
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
import threading

# Try to import MDP v1 protocol from MAS codebase
try:
    # Add MAS codebase to path if available
    mas_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "MAS", "mycosoft-mas")
    if os.path.exists(mas_path):
        sys.path.insert(0, mas_path)
    from mycosoft_mas.protocols.mdp_v1 import (
        MDPEncoder, MDPDecoder, MDPCommand, MDPTelemetry, MDPMessageType
    )
    MDP_AVAILABLE = True
except ImportError:
    print("[Warning] MDP v1 protocol not available. Using JSON mode only.")
    MDP_AVAILABLE = False
    MDPEncoder = None
    MDPDecoder = None

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    print("Installing pyserial...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyserial"])
    import serial
    import serial.tools.list_ports

try:
    from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
except ImportError:
    print("Installing fastapi and uvicorn...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fastapi", "uvicorn[standard]"])
    from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel


# ============== Device State ==============

class MycoBrainDevice:
    def __init__(self, port: str, baud: int = 115200, use_mdp: bool = True):
        self.port = port
        self.baud = baud
        self.serial: Optional[serial.Serial] = None
        self.connected = False
        self.last_message = None
        self.last_message_time = None
        self.sensor_data: Dict[str, Any] = {}
        self.device_info: Dict[str, Any] = {}
        self._lock = threading.Lock()
        self._read_thread: Optional[threading.Thread] = None
        self._running = False
        self.use_mdp = use_mdp and MDP_AVAILABLE
        self.mdp_encoder = MDPEncoder() if MDP_AVAILABLE and use_mdp else None
        self.mdp_decoder = MDPDecoder() if MDP_AVAILABLE and use_mdp else None
        self._read_buffer = bytearray()  # Buffer for COBS frame assembly
        
    def connect(self) -> bool:
        try:
            # Check if port exists
            available_ports = [p.device for p in serial.tools.list_ports.comports()]
            if self.port not in available_ports:
                print(f"[Connection] Port {self.port} not found in available ports: {available_ports}")
                self.connected = False
                return False
            
            print(f"[Connection] Attempting to connect to {self.port} at {self.baud} baud...")
            
            # Try to open port - handle access denied errors
            try:
                self.serial = serial.Serial(self.port, self.baud, timeout=1)
            except serial.SerialException as e:
                error_str = str(e)
                if "Access is denied" in error_str or "PermissionError" in error_str or "could not open port" in error_str.lower():
                    print(f"[Connection] Port {self.port} is locked by another application.")
                    print(f"[Connection] Close any serial monitors, Arduino IDE, PuTTY, TeraTerm, or other tools using {self.port}")
                    raise serial.SerialException(f"Port {self.port} is in use by another application. Close serial monitors or Arduino IDE.")
                raise
            
            time.sleep(0.5)  # Wait for device to initialize
            self.serial.reset_input_buffer()
            self.serial.reset_output_buffer()
            self.connected = True
            self._running = True
            self._read_thread = threading.Thread(target=self._read_loop, daemon=True)
            self._read_thread.start()
            print(f"[Connection] Successfully connected to {self.port}")
            
            # Send initial commands to check firmware
            self.send_command(Commands.PING)
            time.sleep(0.2)
            self.send_command(Commands.GET_SENSOR_DATA)
            time.sleep(0.2)
            
            return True
        except serial.SerialException as e:
            error_str = str(e)
            if "Access is denied" in error_str or "in use" in error_str.lower():
                print(f"[Connection] Port {self.port} access denied: {e}")
            else:
                print(f"[Connection] Failed to connect to {self.port}: {e}")
            self.connected = False
            return False
        except Exception as e:
            print(f"[Connection] Unexpected error connecting to {self.port}: {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        self._running = False
        if self._read_thread:
            self._read_thread.join(timeout=2)
        if self.serial:
            self.serial.close()
        self.connected = False
    
    def _read_loop(self):
        """Background thread to continuously read from serial"""
        while self._running and self.serial:
            try:
                if self.serial.in_waiting:
                    if self.use_mdp and self.mdp_decoder:
                        # MDP v1 mode: read binary data and decode COBS frames
                        data = self.serial.read(self.serial.in_waiting)
                        self._read_buffer.extend(data)
                        self._process_mdp_frames()
                    else:
                        # JSON mode: read text lines
                        line = self.serial.readline().decode('utf-8', errors='replace').strip()
                        if line:
                            self._process_message(line)
            except Exception as e:
                print(f"Read error: {e}")
                time.sleep(0.1)
    
    def _process_mdp_frames(self):
        """Process MDP v1 frames from read buffer"""
        if not self.mdp_decoder:
            return
        
        # Look for 0x00 frame delimiters (COBS uses 0x00 as delimiter)
        while True:
            delimiter_idx = self._read_buffer.find(0x00)
            if delimiter_idx == -1:
                # No complete frame yet
                if len(self._read_buffer) > 1024:  # Prevent buffer overflow
                    self._read_buffer.clear()
                break
            
            # Extract frame (including delimiter)
            frame_data = bytes(self._read_buffer[:delimiter_idx + 1])
            self._read_buffer = self._read_buffer[delimiter_idx + 1:]
            
            if len(frame_data) < 2:  # Need at least delimiter
                continue
            
            try:
                # Decode MDP frame
                frame, parsed = self.mdp_decoder.decode(frame_data)
                
                # Process based on message type
                if frame.message_type == MDPMessageType.TELEMETRY:
                    self._process_telemetry(parsed)
                elif frame.message_type == MDPMessageType.EVENT:
                    self._process_event(parsed)
                elif frame.message_type == MDPMessageType.ACK:
                    self._process_ack(parsed)
                    
            except Exception as e:
                print(f"[MDP] Frame decode error: {e}")
                # Try JSON fallback for this message
                try:
                    line = frame_data.decode('utf-8', errors='replace').strip()
                    if line:
                        self._process_message(line)
                except:
                    pass
    
    def _process_message(self, line: str):
        """Process incoming JSON message from MycoBrain"""
        with self._lock:
            self.last_message = line
            self.last_message_time = datetime.now().isoformat()
            
            try:
                data = json.loads(line)
                
                # Handle different message types
                if "lora_init" in data:
                    self.device_info["lora_status"] = data["lora_init"]
                elif "side" in data:
                    self.device_info["side"] = data["side"]
                    self.device_info["mdp_version"] = data.get("mdp")
                    self.device_info["status"] = data.get("status")
                elif "bme688" in data or "temp" in data or "humidity" in data:
                    # Sensor data from BME688
                    self.sensor_data.update(data)
                    self.sensor_data["last_update"] = datetime.now().isoformat()
                elif "src" in data:
                    # MDP message received
                    self.last_message = data
                    
            except json.JSONDecodeError:
                pass  # Non-JSON message
    
    def send_command(self, cmd_id: int, dst: int = 0xA1, data: List[int] = None, command_type: str = None) -> bool:
        """Send a command to the MycoBrain
        
        Supports both MDP v1 (preferred) and JSON (fallback) protocols.
        """
        if not self.connected or not self.serial:
            return False
        
        try:
            with self._lock:
                if self.use_mdp and self.mdp_encoder:
                    # Use MDP v1 protocol
                    # Map command IDs to command types
                    cmd_type_map = {
                        0: "nop",
                        1: "ping",
                        2: "get_sensor_data",
                        10: "set_neopixel",
                        11: "neopixel_off",
                        12: "neopixel_rainbow",
                        20: "buzzer_beep",
                        21: "buzzer_melody",
                        22: "buzzer_off",
                        30: "get_bme688_1",
                        31: "get_bme688_2",
                    }
                    
                    cmd_type = command_type or cmd_type_map.get(cmd_id, f"cmd_{cmd_id}")
                    parameters = {}
                    
                    # Build parameters based on command
                    if cmd_id == 10 and data and len(data) >= 4:  # SET_NEOPIXEL
                        parameters = {"r": data[0], "g": data[1], "b": data[2], "brightness": data[3]}
                    elif cmd_id == 20 and data and len(data) >= 4:  # BUZZER_BEEP
                        frequency = (data[0] << 8) | data[1]
                        duration = (data[2] << 8) | data[3]
                        parameters = {"frequency": frequency, "duration_ms": duration}
                    elif data:
                        parameters = {"data": data}
                    
                    mdp_cmd = MDPCommand(
                        command_id=cmd_id,
                        command_type=cmd_type,
                        parameters=parameters
                    )
                    
                    # Encode and send MDP frame
                    frame_bytes = self.mdp_encoder.encode_command(mdp_cmd)
                    # Add frame delimiter (0x00) for COBS
                    self.serial.write(frame_bytes + b'\x00')
                else:
                    # Fallback to JSON mode
                    cmd = {"cmd": cmd_id, "dst": dst}
                    if data:
                        cmd["data"] = data
                    msg = json.dumps(cmd) + "\n"
                    self.serial.write(msg.encode('utf-8'))
                
            return True
        except Exception as e:
            print(f"Send error: {e}")
            # Try JSON fallback if MDP failed
            if self.use_mdp:
                try:
                    cmd = {"cmd": cmd_id, "dst": dst}
                    if data:
                        cmd["data"] = data
                    msg = json.dumps(cmd) + "\n"
                    self.serial.write(msg.encode('utf-8'))
                    print(f"[Fallback] Sent command as JSON")
                    return True
                except:
                    pass
            return False
    
    def send_plaintext_command(self, cmd: str) -> bool:
        """Send a plaintext CLI command to the MycoBrain (December 29 firmware format)
        
        Supported commands:
        - LED: led rgb <r> <g> <b>, led off
        - Buzzer: coin, bump, power, 1up, morgio, buzzer beep, buzzer off
        - Mode: mode machine, mode human, dbg on, dbg off, fmt json, fmt lines
        - Sensors: status, scan, probe, live on, live off
        """
        if not self.connected or not self.serial:
            return False
        
        try:
            with self._lock:
                # Ensure command ends with newline
                if not cmd.endswith('\n'):
                    cmd = cmd + '\n'
                
                print(f"[CLI] Sending plaintext command: {cmd.strip()}")
                self.serial.write(cmd.encode('utf-8'))
                self.serial.flush()
                
                # Give device time to process
                time.sleep(0.05)
                
            return True
        except Exception as e:
            print(f"[CLI] Send error: {e}")
            return False
    
    def get_status(self) -> Dict[str, Any]:
        return {
            "connected": self.connected,
            "port": self.port,
            "last_message": self.last_message,
            "last_message_time": self.last_message_time,
            "device_info": self.device_info,
            "sensor_data": self.sensor_data,
        }


# ============== Command IDs ==============

class Commands:
    NOP = 0
    PING = 1
    GET_SENSOR_DATA = 2
    SET_NEOPIXEL = 10
    NEOPIXEL_OFF = 11
    NEOPIXEL_RAINBOW = 12
    BUZZER_BEEP = 20
    BUZZER_MELODY = 21
    BUZZER_OFF = 22
    GET_BME688_1 = 30
    GET_BME688_2 = 31


# ============== Global Device Manager ==============

class DeviceManager:
    def __init__(self):
        self.devices: Dict[str, MycoBrainDevice] = {}
        self.websockets: List[WebSocket] = []
        self.discovered_ports: Dict[str, Dict[str, Any]] = {}  # port -> port info
        self._discovery_running = False
        self._discovery_thread: Optional[threading.Thread] = None
        self._mindex_url = os.getenv("MINDEX_API_URL", "http://localhost:8000")
    
    def scan_ports(self) -> List[Dict[str, str]]:
        """Scan for available serial ports"""
        ports = []
        for port in serial.tools.list_ports.comports():
            port_info = {
                "port": port.device,
                "description": port.description,
                "hwid": port.hwid,
                "vid": port.vid,
                "pid": port.pid,
            }
            ports.append(port_info)
            # Track discovered ports
            self.discovered_ports[port.device] = port_info
        return ports
    
    def _is_mycobrain_port(self, port_info: Dict[str, Any]) -> bool:
        """Check if a port is a MycoBrain device (ESP32-S3)"""
        # ESP32-S3 VID:PID = 303A:1001 (decimal: 12346:4097)
        vid = port_info.get("vid")
        pid = port_info.get("pid")
        
        # Primary check: ESP32-S3 USB VID:PID
        if vid == 12346 and pid == 4097:  # 0x303A:0x1001
            return True
        if vid == 0x303A and pid == 0x1001:
            return True
        
        # Secondary check: description/hwid indicators
        desc = port_info.get("description", "").upper()
        hwid = port_info.get("hwid", "").upper()
        
        # Check for ESP32-S3 indicators in description
        esp32_indicators = ["ESP32", "ESP32-S3", "303A"]
        if any(indicator in desc or indicator in hwid for indicator in esp32_indicators):
            return True
        
        # Exclude system COM ports (no VID/PID)
        if vid is None and pid is None:
            return False
        
        return False
    
    def _discovery_loop(self):
        """Continuous device discovery loop"""
        import requests
        
        while self._discovery_running:
            try:
                # Scan for new ports
                available_ports = self.scan_ports()
                current_ports = set(self.discovered_ports.keys())
                new_ports = set(p["port"] for p in available_ports) - current_ports
                
                # Try to connect to new MycoBrain ESP32-S3 devices only
                for port_info in available_ports:
                    port = port_info["port"]
                    
                    # Skip if already connected
                    if port in self.devices and self.devices[port].connected:
                        continue
                    
                    # Only auto-connect to actual MycoBrain ESP32-S3 devices
                    if self._is_mycobrain_port(port_info):
                        if port not in self.devices:
                            print(f"[Discovery] Found MycoBrain device at {port} (VID={port_info.get('vid')}, PID={port_info.get('pid')})")
                            print(f"[Discovery] Attempting to connect to {port}...")
                            if self.connect_device(port):
                                print(f"[Discovery] Successfully connected to {port}")
                                # Register with MINDEX
                                self._register_with_mindex(port)
                            else:
                                print(f"[Discovery] Failed to connect to {port}")
                
                # Check for disconnected devices
                for port in list(self.devices.keys()):
                    device = self.devices[port]
                    if device.connected:
                        # Verify connection is still alive
                        try:
                            if device.serial and not device.serial.is_open:
                                print(f"[Discovery] Device {port} lost connection")
                                device.connected = False
                        except:
                            device.connected = False
                    else:
                        # Try to reconnect
                        if port in self.discovered_ports:
                            print(f"[Discovery] Attempting to reconnect to {port}...")
                            if self.connect_device(port):
                                print(f"[Discovery] Reconnected to {port}")
                
                time.sleep(5)  # Scan every 5 seconds
                
            except Exception as e:
                print(f"[Discovery] Error in discovery loop: {e}")
                time.sleep(5)
    
    def _register_with_mindex(self, port: str):
        """Register device with MINDEX"""
        try:
            import requests
            device = self.devices.get(port)
            if not device:
                return
            
            device_id = f"mycobrain-{port.replace('/', '-').replace('\\', '-')}"
            device_info = device.device_info or {}
            
            payload = {
                "device_id": device_id,
                "device_type": "mycobrain",
                "serial_number": port,
                "firmware_version": device_info.get("mdp_version", "1.0.0"),
                "status": "online" if device.connected else "offline",
                "connection_type": "usb",
                "port": port,
                "metadata": {
                    "side": device_info.get("side"),
                    "lora_status": device_info.get("lora_status"),
                    "last_seen": device.last_message_time,
                }
            }
            
            # Try to register with MINDEX
            try:
                response = requests.post(
                    f"{self._mindex_url}/api/devices/register",
                    json=payload,
                    timeout=2
                )
                if response.status_code in [200, 201]:
                    print(f"[MINDEX] Registered device {device_id}")
            except:
                pass  # MINDEX not available, continue anyway
                
        except Exception as e:
            print(f"[MINDEX] Failed to register device: {e}")
    
    def start_discovery(self):
        """Start continuous device discovery"""
        if not self._discovery_running:
            self._discovery_running = True
            self._discovery_thread = threading.Thread(target=self._discovery_loop, daemon=True)
            self._discovery_thread.start()
            print("[Discovery] Device discovery started")
    
    def stop_discovery(self):
        """Stop device discovery"""
        self._discovery_running = False
        if self._discovery_thread:
            self._discovery_thread.join(timeout=2)
        print("[Discovery] Device discovery stopped")
    
    def connect_device(self, port: str, use_mdp: bool = True) -> bool:
        if port in self.devices and self.devices[port].connected:
            print(f"[DeviceManager] Device {port} already connected")
            return True
        
        # Check if port exists
        available_ports = [p.device for p in serial.tools.list_ports.comports()]
        if port not in available_ports:
            print(f"[DeviceManager] Port {port} not available. Available ports: {available_ports}")
            return False
        
        # Check if this is actually a MycoBrain device
        port_info = self.discovered_ports.get(port, {})
        if not port_info:
            # Scan to get port info
            self.scan_ports()
            port_info = self.discovered_ports.get(port, {})
        
        if not self._is_mycobrain_port(port_info):
            print(f"[DeviceManager] Port {port} is not a MycoBrain device (VID={port_info.get('vid')}, PID={port_info.get('pid')})")
            print(f"[DeviceManager] Skipping non-MycoBrain port")
            return False
        
        print(f"[DeviceManager] Creating device connection for {port} (MycoBrain ESP32-S3 detected)...")
        # Try MDP first, fallback to JSON
        device = MycoBrainDevice(port, use_mdp=use_mdp)
        if device.connect():
            self.devices[port] = device
            print(f"[DeviceManager] Device {port} connected successfully (MDP mode: {device.use_mdp})")
            # Register with MINDEX
            self._register_with_mindex(port)
            return True
        else:
            # Try JSON mode as fallback
            if use_mdp:
                print(f"[DeviceManager] MDP mode failed, trying JSON mode...")
                device = MycoBrainDevice(port, use_mdp=False)
                if device.connect():
                    self.devices[port] = device
                    print(f"[DeviceManager] Device {port} connected successfully (JSON mode)")
                    self._register_with_mindex(port)
                    return True
            print(f"[DeviceManager] Failed to connect device {port}")
            return False
    
    def disconnect_device(self, port: str):
        if port in self.devices:
            self.devices[port].disconnect()
            del self.devices[port]
    
    def get_device(self, port: str) -> Optional[MycoBrainDevice]:
        return self.devices.get(port)
    
    def get_all_devices(self) -> List[Dict[str, Any]]:
        return [
            {"port": port, **device.get_status()}
            for port, device in self.devices.items()
        ]


device_manager = DeviceManager()


# ============== Pydantic Models ==============

class NeoPixelCommand(BaseModel):
    r: int = 0
    g: int = 0
    b: int = 0
    brightness: int = 128
    mode: str = "solid"  # solid, rainbow, pulse, off

class BuzzerCommand(BaseModel):
    frequency: int = 1000
    duration_ms: int = 100
    pattern: str = "beep"  # beep, melody, off

class CommandRequest(BaseModel):
    cmd_id: int = None
    dst: int = 0xA1
    data: List[int] = []
    # Support for plaintext CLI commands (December 29 firmware format)
    command: Optional[Dict[str, str]] = None  # {"cmd": "coin"} or {"cmd": "led rgb 255 0 0"}


# ============== FastAPI App ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Scan ports but don't auto-connect (let discovery loop handle it)
    print("[Startup] Starting MycoBrain device discovery service...")
    
    # Initial scan - just identify devices
    ports = device_manager.scan_ports()
    print(f"[Startup] Found {len(ports)} serial port(s)")
    
    # Find all MycoBrain ESP32-S3 devices (VID=303A, PID=1001)
    mycobrain_ports = [p for p in ports if device_manager._is_mycobrain_port(p)]
    print(f"[Startup] Found {len(mycobrain_ports)} MycoBrain ESP32-S3 device(s)")
    
    for port_info in mycobrain_ports:
        print(f"  - {port_info['port']}: VID={port_info.get('vid')}, PID={port_info.get('pid')}, {port_info.get('description')}")
    
    if not mycobrain_ports:
        print("[Startup] No MycoBrain devices found. Available ports:")
        for port_info in ports:
            print(f"  - {port_info['port']}: VID={port_info.get('vid')}, PID={port_info.get('pid')}, {port_info.get('description')}")
    
    # Start background discovery (will connect to devices)
    device_manager.start_discovery()
    print("[Startup] Background device discovery started - devices will connect automatically")
    
    yield
    
    # Shutdown: Stop discovery and disconnect all devices
    print("[Shutdown] Stopping device discovery...")
    device_manager.stop_discovery()
    for port in list(device_manager.devices.keys()):
        device_manager.disconnect_device(port)


app = FastAPI(
    title="MycoBrain Service",
    description="REST API for MycoBrain device communication",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== API Endpoints ==============

@app.get("/health")
@app.get("/api/mycobrain/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "devices_connected": len(device_manager.devices),
    }


@app.get("/ports")
@app.get("/api/mycobrain/ports")
async def list_ports():
    """List all available serial ports"""
    ports = device_manager.scan_ports()
    # Mark which ports are MycoBrain-like
    for port_info in ports:
        port_info["is_mycobrain"] = device_manager._is_mycobrain_port(port_info)
        port_info["is_connected"] = port_info["port"] in device_manager.devices and device_manager.devices[port_info["port"]].connected
    return {"ports": ports, "discovery_running": device_manager._discovery_running}


@app.get("/devices")
@app.get("/api/mycobrain/devices")
async def list_devices():
    """List all connected MycoBrain devices"""
    return {
        "devices": device_manager.get_all_devices(),
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/devices/connect/{port}")
@app.post("/api/mycobrain/devices/connect/{port}")
async def connect_device(port: str):
    """Connect to a MycoBrain device on specified port"""
    # URL decode the port (COM4 -> COM4, %2Fdev%2FttyACM0 -> /dev/ttyACM0)
    from urllib.parse import unquote
    port = unquote(port)
    
    try:
        # Try MDP first, fallback to JSON
        if device_manager.connect_device(port, use_mdp=True):
            # Get device info after connection
            device = device_manager.get_device(port)
            diagnostics = None
            if device:
                try:
                    # Wait a moment for device to respond
                    await asyncio.sleep(0.5)
                    diagnostics = {
                        "firmware": {
                            "version": device.device_info.get("mdp_version", "Unknown"),
                            "side": device.device_info.get("side", "Unknown"),
                            "status": device.device_info.get("status", "Unknown"),
                            "lora_initialized": device.device_info.get("lora_status") == "ok",
                        },
                        "capabilities": {
                            "neopixel": True,
                            "buzzer": True,
                            "bme688_sensors": len([k for k in device.sensor_data.keys() if "bme688" in k.lower()]) > 0,
                            "side_a": device.device_info.get("side") == "A",
                            "side_b": device.device_info.get("side") == "B",
                            "mdp_protocol": device.device_info.get("mdp_version") is not None,
                            "lora": device.device_info.get("lora_status") is not None,
                        },
                        "device_info": device.device_info,
                        "sensor_data": device.sensor_data,
                        "protocol": "mdp_v1" if device.use_mdp else "json",
                    }
                except Exception as e:
                    print(f"[Diagnostics] Error getting diagnostics: {e}")
            
            return {
                "success": True, 
                "message": f"Connected to {port}",
                "diagnostics": diagnostics,
            }
        else:
            # Try JSON mode as fallback
            if device_manager.connect_device(port, use_mdp=False):
                device = device_manager.get_device(port)
                return {
                    "success": True,
                    "message": f"Connected to {port} (JSON mode)",
                    "diagnostics": {
                        "protocol": "json",
                        "firmware": {"version": "Unknown", "side": "Unknown"},
                    }
                }
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to connect to {port}. Port may be in use by another application. Close any serial monitors or Arduino IDE."
            )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "Access is denied" in error_msg or "PermissionError" in error_msg or "in use" in error_msg.lower():
            raise HTTPException(
                status_code=403,
                detail=f"Port {port} is locked by another application. Please close any serial monitors, Arduino IDE, PuTTY, TeraTerm, or other tools using this port."
            )
        raise HTTPException(status_code=500, detail=f"Connection error: {error_msg}")


@app.post("/devices/disconnect/{port}")
@app.post("/api/mycobrain/devices/disconnect/{port}")
async def disconnect_device(port: str):
    """Disconnect from a MycoBrain device"""
    from urllib.parse import unquote
    port = unquote(port)
    
    device_manager.disconnect_device(port)
    return {"success": True, "message": f"Disconnected from {port}"}


@app.get("/devices/{port}/status")
@app.get("/api/mycobrain/devices/{port}/status")
async def get_device_status(port: str):
    """Get status of a specific device"""
    from urllib.parse import unquote
    port = unquote(port)
    
    device = device_manager.get_device(port)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device.get_status()


@app.get("/devices/{port}/sensors")
@app.get("/api/mycobrain/devices/{port}/sensors")
async def get_sensor_data(port: str):
    """Get sensor data from device"""
    from urllib.parse import unquote
    port = unquote(port)
    
    device = device_manager.get_device(port)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Request fresh sensor data
    device.send_command(Commands.GET_BME688_1)
    await asyncio.sleep(0.2)
    device.send_command(Commands.GET_BME688_2)
    await asyncio.sleep(0.2)
    
    return {
        "port": port,
        "sensors": device.sensor_data,
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/devices/{port}/diagnostics")
@app.get("/api/mycobrain/devices/{port}/diagnostics")
async def get_device_diagnostics(port: str):
    """Get comprehensive device diagnostics including firmware version"""
    from urllib.parse import unquote
    port = unquote(port)
    
    device = device_manager.get_device(port)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Send PING to check responsiveness
    ping_sent = device.send_command(Commands.PING)
    
    # Request device info
    device.send_command(Commands.GET_SENSOR_DATA)
    await asyncio.sleep(0.3)  # Wait for response
    
    device_info = device.device_info.copy()
    sensor_data = device.sensor_data.copy()
    
    # Check firmware capabilities
    capabilities = {
        "neopixel": True,  # Assume supported if device responds
        "buzzer": True,
        "bme688_sensors": len([k for k in sensor_data.keys() if "bme688" in k.lower()]) > 0,
        "side_a": device_info.get("side") == "A",
        "side_b": device_info.get("side") == "B",
        "mdp_protocol": device_info.get("mdp_version") is not None,
        "lora": device_info.get("lora_status") is not None,
    }
    
    diagnostics = {
        "port": port,
        "connected": device.connected,
        "firmware": {
            "version": device_info.get("mdp_version", "Unknown"),
            "side": device_info.get("side", "Unknown"),
            "status": device_info.get("status", "Unknown"),
            "lora_initialized": device_info.get("lora_status", False),
        },
        "capabilities": capabilities,
        "device_info": device_info,
        "sensor_data": sensor_data,
        "last_message": device.last_message,
        "last_message_time": device.last_message_time,
        "ping_sent": ping_sent,
        "timestamp": datetime.now().isoformat(),
    }
    
    return diagnostics


@app.post("/devices/{port}/neopixel")
@app.post("/api/mycobrain/devices/{port}/neopixel")
async def control_neopixel(port: str, cmd: NeoPixelCommand):
    """Control NeoPixel LEDs on the device"""
    from urllib.parse import unquote
    port = unquote(port)
    
    device = device_manager.get_device(port)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    if cmd.mode == "off":
        device.send_command(Commands.NEOPIXEL_OFF)
    elif cmd.mode == "rainbow":
        device.send_command(Commands.NEOPIXEL_RAINBOW)
    else:
        # Solid color: send R, G, B, Brightness
        device.send_command(Commands.SET_NEOPIXEL, data=[cmd.r, cmd.g, cmd.b, cmd.brightness])
    
    return {"success": True, "mode": cmd.mode}


@app.post("/devices/{port}/buzzer")
@app.post("/api/mycobrain/devices/{port}/buzzer")
async def control_buzzer(port: str, cmd: BuzzerCommand):
    """Control buzzer on the device"""
    from urllib.parse import unquote
    port = unquote(port)
    
    device = device_manager.get_device(port)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    if cmd.pattern == "off":
        device.send_command(Commands.BUZZER_OFF)
    elif cmd.pattern == "melody":
        device.send_command(Commands.BUZZER_MELODY)
    else:
        # Beep: send frequency (2 bytes) and duration (2 bytes)
        freq_high = (cmd.frequency >> 8) & 0xFF
        freq_low = cmd.frequency & 0xFF
        dur_high = (cmd.duration_ms >> 8) & 0xFF
        dur_low = cmd.duration_ms & 0xFF
        device.send_command(Commands.BUZZER_BEEP, data=[freq_high, freq_low, dur_high, dur_low])
    
    return {"success": True, "pattern": cmd.pattern}


@app.post("/devices/{port}/command")
@app.post("/api/mycobrain/devices/{port}/command")
async def send_raw_command(port: str, cmd: CommandRequest):
    """Send a command to the device
    
    Supports two formats:
    1. Plaintext CLI (December 29 firmware): {"command": {"cmd": "coin"}} or {"command": {"cmd": "led rgb 255 0 0"}}
    2. MDP protocol (binary): {"cmd_id": 20, "data": [0, 0, 0, 100]}
    """
    from urllib.parse import unquote
    port = unquote(port)
    
    device = device_manager.get_device(port)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check if this is a plaintext CLI command
    if cmd.command and cmd.command.get("cmd"):
        cli_cmd = cmd.command["cmd"]
        print(f"[API] Received plaintext command for {port}: {cli_cmd}")
        success = device.send_plaintext_command(cli_cmd)
        
        # Wait briefly and try to get response
        await asyncio.sleep(0.2)
        response = device.last_message
        
        return {
            "success": success,
            "command": cli_cmd,
            "response": response,
            "mode": "plaintext_cli"
        }
    
    # Otherwise use MDP protocol
    if cmd.cmd_id is not None:
        success = device.send_command(cmd.cmd_id, cmd.dst, cmd.data)
        return {"success": success, "mode": "mdp_binary"}
    
    return {"success": False, "error": "No valid command provided"}


@app.websocket("/ws/{port}")
@app.websocket("/api/mycobrain/ws/{port}")
async def websocket_endpoint(websocket: WebSocket, port: str):
    """WebSocket for real-time device updates"""
    from urllib.parse import unquote
    port = unquote(port)
    
    await websocket.accept()
    device = device_manager.get_device(port)
    
    if not device:
        await websocket.send_json({"error": "Device not found"})
        await websocket.close()
        return
    
    try:
        last_sent = None
        while True:
            # Send status updates every 500ms
            status = device.get_status()
            if status != last_sent:
                await websocket.send_json(status)
                last_sent = status
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)

