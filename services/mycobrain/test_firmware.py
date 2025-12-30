#!/usr/bin/env python3
"""
MycoBrain Firmware Testing Script
Tests current firmware capabilities and compatibility
"""

import serial
import time
import json
import sys

def test_com4_connection():
    """Test basic connection to COM4"""
    print("=" * 60)
    print("MycoBrain Firmware Test - COM4")
    print("=" * 60)
    
    try:
        print("\n[1] Opening COM4 connection...")
        ser = serial.Serial('COM4', 115200, timeout=2)
        time.sleep(1)  # Wait for device to initialize
        ser.reset_input_buffer()
        ser.reset_output_buffer()
        print("    ✓ Connected to COM4")
        
        # Test 1: Send PING command (JSON format)
        print("\n[2] Testing PING command (JSON)...")
        ping_cmd = json.dumps({"cmd": 1, "dst": 0xA1}) + "\n"
        ser.write(ping_cmd.encode('utf-8'))
        time.sleep(0.5)
        
        response = ser.read(ser.in_waiting).decode('utf-8', errors='replace')
        if response:
            print(f"    ✓ Response received: {response.strip()[:200]}")
            try:
                data = json.loads(response.strip())
                print(f"    ✓ Valid JSON response")
                if "side" in data:
                    print(f"    → Device Side: {data['side']}")
                if "mdp" in data or "mdp_version" in data:
                    print(f"    → MDP Version: {data.get('mdp') or data.get('mdp_version', 'Unknown')}")
                if "status" in data:
                    print(f"    → Status: {data['status']}")
            except json.JSONDecodeError:
                print(f"    ⚠ Non-JSON response (may be MDP binary)")
        else:
            print("    ⚠ No response received")
        
        # Test 2: Request sensor data
        print("\n[3] Testing GET_SENSOR_DATA command...")
        sensor_cmd = json.dumps({"cmd": 2, "dst": 0xA1}) + "\n"
        ser.write(sensor_cmd.encode('utf-8'))
        time.sleep(0.5)
        
        response = ser.read(ser.in_waiting).decode('utf-8', errors='replace')
        if response:
            print(f"    ✓ Response received: {response.strip()[:200]}")
            try:
                data = json.loads(response.strip())
                if "temperature" in data or "bme688" in str(data):
                    print(f"    ✓ Sensor data detected")
            except:
                pass
        else:
            print("    ⚠ No response received")
        
        # Test 3: Test NeoPixel command
        print("\n[4] Testing SET_NEOPIXEL command (Red)...")
        neopixel_cmd = json.dumps({"cmd": 10, "dst": 0xA1, "data": [255, 0, 0, 128]}) + "\n"
        ser.write(neopixel_cmd.encode('utf-8'))
        time.sleep(0.5)
        print("    ✓ Command sent - Check if LED turned red")
        
        # Test 4: Test Buzzer command
        print("\n[5] Testing BUZZER_BEEP command...")
        buzzer_cmd = json.dumps({"cmd": 20, "dst": 0xA1, "data": [0x03, 0xE8, 0x00, 0xC8]}) + "\n"  # 1000Hz, 200ms
        ser.write(buzzer_cmd.encode('utf-8'))
        time.sleep(0.5)
        print("    ✓ Command sent - Check if buzzer beeped")
        
        # Test 5: Read any additional messages
        print("\n[6] Reading any additional messages...")
        time.sleep(1)
        response = ser.read(ser.in_waiting).decode('utf-8', errors='replace')
        if response:
            print(f"    ✓ Additional data: {response.strip()[:200]}")
        
        ser.close()
        print("\n" + "=" * 60)
        print("Test Complete!")
        print("=" * 60)
        
    except serial.SerialException as e:
        print(f"\n✗ Connection failed: {e}")
        if "Access is denied" in str(e):
            print("   → Port is locked. Close any serial monitors or Arduino IDE.")
        return False
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    test_com4_connection()











