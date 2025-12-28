#!/usr/bin/env python3
"""
MycoBrain Serial Communication Service
Provides REST API for communicating with MycoBrain devices via USB serial.

Run with: uvicorn mycobrain_service:app --host 0.0.0.0 --port 8765 --reload
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
import threading

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
    def __init__(self, port: str, baud: int = 115200):
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
        
    def connect(self) -> bool:
        try:
            self.serial = serial.Serial(self.port, self.baud, timeout=1)
            time.sleep(0.5)  # Wait for device to initialize
            self.serial.reset_input_buffer()
            self.serial.reset_output_buffer()
            self.connected = True
            self._running = True
            self._read_thread = threading.Thread(target=self._read_loop, daemon=True)
            self._read_thread.start()
            return True
        except serial.SerialException as e:
            print(f"Failed to connect to {self.port}: {e}")
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
                    line = self.serial.readline().decode('utf-8', errors='replace').strip()
                    if line:
                        self._process_message(line)
            except Exception as e:
                print(f"Read error: {e}")
                time.sleep(0.1)
    
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
    
    def send_command(self, cmd_id: int, dst: int = 0xA1, data: List[int] = None) -> bool:
        """Send a command to the MycoBrain"""
        if not self.connected or not self.serial:
            return False
        
        cmd = {"cmd": cmd_id, "dst": dst}
        if data:
            cmd["data"] = data
        
        try:
            with self._lock:
                msg = json.dumps(cmd) + "\n"
                self.serial.write(msg.encode('utf-8'))
            return True
        except Exception as e:
            print(f"Send error: {e}")
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
    
    def scan_ports(self) -> List[Dict[str, str]]:
        """Scan for available serial ports"""
        ports = []
        for port in serial.tools.list_ports.comports():
            ports.append({
                "port": port.device,
                "description": port.description,
                "hwid": port.hwid,
                "vid": port.vid,
                "pid": port.pid,
            })
        return ports
    
    def connect_device(self, port: str) -> bool:
        if port in self.devices and self.devices[port].connected:
            return True
        
        device = MycoBrainDevice(port)
        if device.connect():
            self.devices[port] = device
            return True
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
    cmd_id: int
    dst: int = 0xA1
    data: List[int] = []


# ============== FastAPI App ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Auto-connect to COM4 if available
    ports = device_manager.scan_ports()
    for port_info in ports:
        if "COM4" in port_info["port"] or "/dev/ttyACM" in port_info["port"]:
            print(f"Auto-connecting to {port_info['port']}...")
            device_manager.connect_device(port_info["port"])
    yield
    # Shutdown: Disconnect all devices
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
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "devices_connected": len(device_manager.devices),
    }


@app.get("/ports")
async def list_ports():
    """List all available serial ports"""
    return {"ports": device_manager.scan_ports()}


@app.get("/devices")
async def list_devices():
    """List all connected MycoBrain devices"""
    return {
        "devices": device_manager.get_all_devices(),
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/devices/connect/{port}")
async def connect_device(port: str):
    """Connect to a MycoBrain device on specified port"""
    # URL decode the port (COM4 -> COM4, %2Fdev%2FttyACM0 -> /dev/ttyACM0)
    from urllib.parse import unquote
    port = unquote(port)
    
    if device_manager.connect_device(port):
        return {"success": True, "message": f"Connected to {port}"}
    raise HTTPException(status_code=500, detail=f"Failed to connect to {port}")


@app.post("/devices/disconnect/{port}")
async def disconnect_device(port: str):
    """Disconnect from a MycoBrain device"""
    from urllib.parse import unquote
    port = unquote(port)
    
    device_manager.disconnect_device(port)
    return {"success": True, "message": f"Disconnected from {port}"}


@app.get("/devices/{port}/status")
async def get_device_status(port: str):
    """Get status of a specific device"""
    from urllib.parse import unquote
    port = unquote(port)
    
    device = device_manager.get_device(port)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device.get_status()


@app.get("/devices/{port}/sensors")
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


@app.post("/devices/{port}/neopixel")
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
async def send_raw_command(port: str, cmd: CommandRequest):
    """Send a raw command to the device"""
    from urllib.parse import unquote
    port = unquote(port)
    
    device = device_manager.get_device(port)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    success = device.send_command(cmd.cmd_id, cmd.dst, cmd.data)
    return {"success": success}


@app.websocket("/ws/{port}")
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

