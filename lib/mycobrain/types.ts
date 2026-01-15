/**
 * MycoBrain Sensor Library Types
 * 
 * Comprehensive type definitions for all MycoBrain sensors, peripherals,
 * and device profiles. Designed for plug-and-play detection.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type SensorCategory = 
  | "environmental"    // BME688, BMV080, temperature, humidity, pressure
  | "air_quality"      // VOC, VSC, CO2, particulate matter
  | "spectral"         // Spectroscopy, color sensing, IR
  | "acoustic"         // MEMS microphones, speakers, acoustic modems
  | "optical"          // LiDAR, cameras, optical modems
  | "electromagnetic"  // NFC, RFID, EM field sensors
  | "biological"       // pH probes, moisture, nutrient sensors
  | "communication"    // 4G/LTE, LoRa, WiFi, Bluetooth
  | "actuator"         // LEDs, buzzers, relays, motors
  | "navigation"       // GPS, IMU, compass, altimeter

export type SensorInterface = 
  | "i2c"
  | "spi"
  | "uart"
  | "analog"
  | "gpio"
  | "usb"
  | "can"
  | "onewire"

export type ConnectionStatus = "connected" | "disconnected" | "error" | "initializing"

// ============================================================================
// SENSOR DEFINITIONS
// ============================================================================

export interface SensorDefinition {
  id: string
  name: string
  manufacturer: string
  partNumber: string
  category: SensorCategory
  interface: SensorInterface
  i2cAddresses?: number[]
  spiChipSelect?: number[]
  capabilities: string[]
  dataFields: DataFieldDefinition[]
  defaultUpdateRate: number // Hz
  powerConsumption: {
    active: number  // mA
    sleep: number   // mA
  }
  operatingRange: {
    tempMin: number   // °C
    tempMax: number   // °C
    voltageMin: number // V
    voltageMax: number // V
  }
  documentation?: string
  widgetComponent?: string
}

export interface DataFieldDefinition {
  id: string
  name: string
  unit: string
  type: "number" | "string" | "boolean" | "array"
  min?: number
  max?: number
  precision?: number
  description?: string
}

// ============================================================================
// SENSOR LIBRARY
// ============================================================================

export const SENSOR_LIBRARY: Record<string, SensorDefinition> = {
  // Environmental Sensors
  BME688: {
    id: "bme688",
    name: "BME688 Environmental Sensor",
    manufacturer: "Bosch",
    partNumber: "BME688",
    category: "environmental",
    interface: "i2c",
    i2cAddresses: [0x76, 0x77],
    capabilities: ["temperature", "humidity", "pressure", "gas_resistance", "iaq", "voc", "co2"],
    dataFields: [
      { id: "temperature", name: "Temperature", unit: "°C", type: "number", min: -40, max: 85, precision: 2 },
      { id: "humidity", name: "Humidity", unit: "%", type: "number", min: 0, max: 100, precision: 2 },
      { id: "pressure", name: "Pressure", unit: "hPa", type: "number", min: 300, max: 1100, precision: 2 },
      { id: "gas_resistance", name: "Gas Resistance", unit: "Ω", type: "number", min: 0, max: 1000000 },
      { id: "iaq", name: "IAQ", unit: "", type: "number", min: 0, max: 500 },
      { id: "iaq_accuracy", name: "IAQ Accuracy", unit: "", type: "number", min: 0, max: 3 },
      { id: "bvoc", name: "bVOC", unit: "ppm", type: "number", min: 0, max: 100, precision: 2 },
      { id: "eco2", name: "eCO₂", unit: "ppm", type: "number", min: 400, max: 10000 },
    ],
    defaultUpdateRate: 1,
    powerConsumption: { active: 3.7, sleep: 0.0015 },
    operatingRange: { tempMin: -40, tempMax: 85, voltageMin: 1.7, voltageMax: 3.6 },
    documentation: "https://www.bosch-sensortec.com/products/environmental-sensors/gas-sensors/bme688/",
    widgetComponent: "peripheral-widget"
  },

  BMV080: {
    id: "bmv080",
    name: "BMV080 Particulate Matter Sensor",
    manufacturer: "Bosch",
    partNumber: "BMV080",
    category: "air_quality",
    interface: "i2c",
    i2cAddresses: [0x57],
    capabilities: ["pm1", "pm2_5", "pm4", "pm10", "particle_count"],
    dataFields: [
      { id: "pm1", name: "PM1.0", unit: "µg/m³", type: "number", min: 0, max: 1000, precision: 1 },
      { id: "pm2_5", name: "PM2.5", unit: "µg/m³", type: "number", min: 0, max: 1000, precision: 1 },
      { id: "pm4", name: "PM4.0", unit: "µg/m³", type: "number", min: 0, max: 1000, precision: 1 },
      { id: "pm10", name: "PM10", unit: "µg/m³", type: "number", min: 0, max: 1000, precision: 1 },
      { id: "particle_count", name: "Particle Count", unit: "#/cm³", type: "number", min: 0, max: 100000 },
    ],
    defaultUpdateRate: 1,
    powerConsumption: { active: 35, sleep: 0.05 },
    operatingRange: { tempMin: -10, tempMax: 50, voltageMin: 3.0, voltageMax: 3.6 },
    documentation: "https://www.bosch-sensortec.com/products/environmental-sensors/particulate-matter-sensors/bmv080/",
    widgetComponent: "pm-sensor-widget"
  },

  SCD41: {
    id: "scd41",
    name: "SCD41 True CO₂ Sensor",
    manufacturer: "Sensirion",
    partNumber: "SCD41",
    category: "air_quality",
    interface: "i2c",
    i2cAddresses: [0x62],
    capabilities: ["true_co2", "temperature", "humidity"],
    dataFields: [
      { id: "co2", name: "CO₂", unit: "ppm", type: "number", min: 400, max: 5000, precision: 0 },
      { id: "temperature", name: "Temperature", unit: "°C", type: "number", min: -10, max: 60, precision: 2 },
      { id: "humidity", name: "Humidity", unit: "%", type: "number", min: 0, max: 100, precision: 2 },
    ],
    defaultUpdateRate: 0.2, // 5 second measurement cycle
    powerConsumption: { active: 30, sleep: 0.005 },
    operatingRange: { tempMin: -10, tempMax: 60, voltageMin: 2.4, voltageMax: 5.5 },
    documentation: "https://sensirion.com/products/catalog/SCD41/",
    widgetComponent: "co2-sensor-widget"
  },

  SGP41: {
    id: "sgp41",
    name: "SGP41 VOC/NOx Sensor",
    manufacturer: "Sensirion",
    partNumber: "SGP41",
    category: "air_quality",
    interface: "i2c",
    i2cAddresses: [0x59],
    capabilities: ["voc_index", "nox_index", "vsc"],
    dataFields: [
      { id: "voc_index", name: "VOC Index", unit: "", type: "number", min: 1, max: 500 },
      { id: "nox_index", name: "NOx Index", unit: "", type: "number", min: 1, max: 500 },
      { id: "sraw_voc", name: "VOC Raw", unit: "", type: "number" },
      { id: "sraw_nox", name: "NOx Raw", unit: "", type: "number" },
    ],
    defaultUpdateRate: 1,
    powerConsumption: { active: 3, sleep: 0.04 },
    operatingRange: { tempMin: -20, tempMax: 55, voltageMin: 1.7, voltageMax: 3.6 },
    documentation: "https://sensirion.com/products/catalog/SGP41/",
    widgetComponent: "voc-sensor-widget"
  },

  // MEMS Microphones
  SPH0645: {
    id: "sph0645",
    name: "SPH0645 MEMS Microphone",
    manufacturer: "Knowles",
    partNumber: "SPH0645LM4H-B",
    category: "acoustic",
    interface: "i2c", // I2S actually but via I2C control
    capabilities: ["audio_capture", "spectrum_analysis", "sound_level", "acoustic_modem_rx"],
    dataFields: [
      { id: "sound_level", name: "Sound Level", unit: "dB", type: "number", min: 20, max: 120, precision: 1 },
      { id: "frequency_peak", name: "Peak Frequency", unit: "Hz", type: "number", min: 20, max: 20000 },
      { id: "spectrum", name: "Frequency Spectrum", unit: "", type: "array" },
    ],
    defaultUpdateRate: 10,
    powerConsumption: { active: 0.6, sleep: 0.015 },
    operatingRange: { tempMin: -40, tempMax: 85, voltageMin: 1.6, voltageMax: 3.6 },
    widgetComponent: "microphone-widget"
  },

  ICS43434: {
    id: "ics43434",
    name: "ICS-43434 MEMS Microphone",
    manufacturer: "TDK InvenSense",
    partNumber: "ICS-43434",
    category: "acoustic",
    interface: "i2c",
    capabilities: ["audio_capture", "spectrum_analysis", "sound_level", "voice_detection"],
    dataFields: [
      { id: "sound_level", name: "Sound Level", unit: "dB", type: "number", min: 28, max: 120, precision: 1 },
      { id: "frequency_peak", name: "Peak Frequency", unit: "Hz", type: "number" },
      { id: "voice_activity", name: "Voice Activity", unit: "", type: "boolean" },
    ],
    defaultUpdateRate: 10,
    powerConsumption: { active: 0.95, sleep: 0.012 },
    operatingRange: { tempMin: -40, tempMax: 85, voltageMin: 1.65, voltageMax: 3.6 },
    widgetComponent: "microphone-widget"
  },

  // Speakers
  MAX98357A: {
    id: "max98357a",
    name: "MAX98357A I2S Amplifier",
    manufacturer: "Analog Devices",
    partNumber: "MAX98357A",
    category: "acoustic",
    interface: "i2c",
    capabilities: ["audio_playback", "acoustic_modem_tx", "alert_tones"],
    dataFields: [
      { id: "volume", name: "Volume", unit: "%", type: "number", min: 0, max: 100 },
      { id: "playing", name: "Playing", unit: "", type: "boolean" },
    ],
    defaultUpdateRate: 1,
    powerConsumption: { active: 20, sleep: 0.008 },
    operatingRange: { tempMin: -40, tempMax: 85, voltageMin: 2.5, voltageMax: 5.5 },
    widgetComponent: "speaker-widget"
  },

  // LiDAR
  VL53L1X: {
    id: "vl53l1x",
    name: "VL53L1X Time-of-Flight Sensor",
    manufacturer: "STMicroelectronics",
    partNumber: "VL53L1X",
    category: "optical",
    interface: "i2c",
    i2cAddresses: [0x29],
    capabilities: ["distance", "range_finding", "proximity"],
    dataFields: [
      { id: "distance", name: "Distance", unit: "mm", type: "number", min: 0, max: 4000 },
      { id: "signal_rate", name: "Signal Rate", unit: "MCPS", type: "number" },
      { id: "ambient_rate", name: "Ambient Rate", unit: "MCPS", type: "number" },
      { id: "range_status", name: "Range Status", unit: "", type: "string" },
    ],
    defaultUpdateRate: 50,
    powerConsumption: { active: 20, sleep: 0.005 },
    operatingRange: { tempMin: -20, tempMax: 85, voltageMin: 2.6, voltageMax: 3.5 },
    widgetComponent: "lidar-widget"
  },

  TFMini: {
    id: "tfmini",
    name: "TF-Mini LiDAR",
    manufacturer: "Benewake",
    partNumber: "TF-Mini Plus",
    category: "optical",
    interface: "uart",
    capabilities: ["distance", "long_range", "range_finding"],
    dataFields: [
      { id: "distance", name: "Distance", unit: "cm", type: "number", min: 10, max: 1200 },
      { id: "strength", name: "Signal Strength", unit: "", type: "number", min: 0, max: 65535 },
      { id: "temperature", name: "Temperature", unit: "°C", type: "number" },
    ],
    defaultUpdateRate: 100,
    powerConsumption: { active: 120, sleep: 10 },
    operatingRange: { tempMin: -20, tempMax: 60, voltageMin: 5.0, voltageMax: 5.5 },
    widgetComponent: "lidar-widget"
  },

  // Infrared / Thermal
  MLX90640: {
    id: "mlx90640",
    name: "MLX90640 Thermal Camera",
    manufacturer: "Melexis",
    partNumber: "MLX90640",
    category: "spectral",
    interface: "i2c",
    i2cAddresses: [0x33],
    capabilities: ["thermal_imaging", "temperature_array", "presence_detection"],
    dataFields: [
      { id: "thermal_image", name: "Thermal Image", unit: "", type: "array" },
      { id: "min_temp", name: "Min Temperature", unit: "°C", type: "number", min: -40, max: 300 },
      { id: "max_temp", name: "Max Temperature", unit: "°C", type: "number", min: -40, max: 300 },
      { id: "avg_temp", name: "Avg Temperature", unit: "°C", type: "number" },
    ],
    defaultUpdateRate: 16, // 16 Hz max
    powerConsumption: { active: 23, sleep: 0.06 },
    operatingRange: { tempMin: -40, tempMax: 85, voltageMin: 3.0, voltageMax: 3.6 },
    widgetComponent: "thermal-camera-widget"
  },

  AMG8833: {
    id: "amg8833",
    name: "AMG8833 Infrared Grid-Eye",
    manufacturer: "Panasonic",
    partNumber: "AMG8833",
    category: "spectral",
    interface: "i2c",
    i2cAddresses: [0x68, 0x69],
    capabilities: ["thermal_imaging", "temperature_grid", "presence_detection"],
    dataFields: [
      { id: "thermal_grid", name: "Thermal Grid (8x8)", unit: "", type: "array" },
      { id: "min_temp", name: "Min Temperature", unit: "°C", type: "number" },
      { id: "max_temp", name: "Max Temperature", unit: "°C", type: "number" },
      { id: "thermistor", name: "Thermistor", unit: "°C", type: "number" },
    ],
    defaultUpdateRate: 10,
    powerConsumption: { active: 4.5, sleep: 0.2 },
    operatingRange: { tempMin: -20, tempMax: 80, voltageMin: 3.0, voltageMax: 3.6 },
    widgetComponent: "thermal-grid-widget"
  },

  // Spectrometer
  AS7341: {
    id: "as7341",
    name: "AS7341 11-Channel Spectral Sensor",
    manufacturer: "AMS",
    partNumber: "AS7341",
    category: "spectral",
    interface: "i2c",
    i2cAddresses: [0x39],
    capabilities: ["spectroscopy", "color_analysis", "chlorophyll_detection", "mycelium_analysis"],
    dataFields: [
      { id: "f1_415nm", name: "F1 (415nm)", unit: "", type: "number" },
      { id: "f2_445nm", name: "F2 (445nm)", unit: "", type: "number" },
      { id: "f3_480nm", name: "F3 (480nm)", unit: "", type: "number" },
      { id: "f4_515nm", name: "F4 (515nm)", unit: "", type: "number" },
      { id: "f5_555nm", name: "F5 (555nm)", unit: "", type: "number" },
      { id: "f6_590nm", name: "F6 (590nm)", unit: "", type: "number" },
      { id: "f7_630nm", name: "F7 (630nm)", unit: "", type: "number" },
      { id: "f8_680nm", name: "F8 (680nm)", unit: "", type: "number" },
      { id: "clear", name: "Clear", unit: "", type: "number" },
      { id: "nir", name: "NIR", unit: "", type: "number" },
    ],
    defaultUpdateRate: 10,
    powerConsumption: { active: 10, sleep: 0.005 },
    operatingRange: { tempMin: -40, tempMax: 85, voltageMin: 1.7, voltageMax: 2.0 },
    documentation: "https://ams.com/as7341",
    widgetComponent: "spectrometer-widget"
  },

  // NFC / RFID
  PN532: {
    id: "pn532",
    name: "PN532 NFC/RFID Controller",
    manufacturer: "NXP",
    partNumber: "PN532",
    category: "electromagnetic",
    interface: "i2c",
    i2cAddresses: [0x24],
    capabilities: ["nfc_read", "nfc_write", "rfid_read", "card_emulation"],
    dataFields: [
      { id: "card_present", name: "Card Present", unit: "", type: "boolean" },
      { id: "card_uid", name: "Card UID", unit: "", type: "string" },
      { id: "card_type", name: "Card Type", unit: "", type: "string" },
      { id: "signal_strength", name: "Signal Strength", unit: "", type: "number" },
    ],
    defaultUpdateRate: 10,
    powerConsumption: { active: 100, sleep: 0.01 },
    operatingRange: { tempMin: -30, tempMax: 85, voltageMin: 2.7, voltageMax: 5.5 },
    widgetComponent: "nfc-widget"
  },

  // Moisture / Soil Sensors
  STEMMA_SOIL: {
    id: "stemma_soil",
    name: "Adafruit STEMMA Soil Sensor",
    manufacturer: "Adafruit",
    partNumber: "4026",
    category: "biological",
    interface: "i2c",
    i2cAddresses: [0x36],
    capabilities: ["soil_moisture", "soil_temperature"],
    dataFields: [
      { id: "moisture", name: "Moisture", unit: "", type: "number", min: 200, max: 2000 },
      { id: "moisture_percent", name: "Moisture %", unit: "%", type: "number", min: 0, max: 100 },
      { id: "temperature", name: "Soil Temperature", unit: "°C", type: "number" },
    ],
    defaultUpdateRate: 1,
    powerConsumption: { active: 0.3, sleep: 0.001 },
    operatingRange: { tempMin: -40, tempMax: 85, voltageMin: 3.0, voltageMax: 5.0 },
    widgetComponent: "soil-sensor-widget"
  },

  // pH Probe
  EZO_PH: {
    id: "ezo_ph",
    name: "Atlas Scientific EZO pH",
    manufacturer: "Atlas Scientific",
    partNumber: "EZO-pH",
    category: "biological",
    interface: "i2c",
    i2cAddresses: [0x63],
    capabilities: ["ph_measurement", "calibration"],
    dataFields: [
      { id: "ph", name: "pH", unit: "", type: "number", min: 0, max: 14, precision: 3 },
      { id: "temperature_comp", name: "Temperature Compensation", unit: "°C", type: "number" },
    ],
    defaultUpdateRate: 1,
    powerConsumption: { active: 12.6, sleep: 0.2 },
    operatingRange: { tempMin: 1, tempMax: 50, voltageMin: 3.3, voltageMax: 5.0 },
    documentation: "https://atlas-scientific.com/ezo-ph-circuit/",
    widgetComponent: "ph-sensor-widget"
  },

  // FCI Probe (Fuel Cell Interface)
  FCI_PROBE: {
    id: "fci_probe",
    name: "FCI Environmental Probe",
    manufacturer: "Mycosoft",
    partNumber: "FCI-01",
    category: "biological",
    interface: "analog",
    capabilities: ["substrate_monitoring", "mycelium_conductivity", "colonization_detection"],
    dataFields: [
      { id: "conductivity", name: "Conductivity", unit: "µS/cm", type: "number" },
      { id: "impedance", name: "Impedance", unit: "Ω", type: "number" },
      { id: "colonization_index", name: "Colonization Index", unit: "%", type: "number", min: 0, max: 100 },
      { id: "mycelium_activity", name: "Mycelium Activity", unit: "", type: "number", min: 0, max: 100 },
    ],
    defaultUpdateRate: 0.1,
    powerConsumption: { active: 5, sleep: 0.1 },
    operatingRange: { tempMin: 0, tempMax: 50, voltageMin: 3.3, voltageMax: 5.0 },
    widgetComponent: "fci-probe-widget"
  },

  // Communication Modules
  SIM7000G: {
    id: "sim7000g",
    name: "SIM7000G 4G/LTE Module",
    manufacturer: "Waveshare/SIMCOM",
    partNumber: "SIM7000G-H",
    category: "communication",
    interface: "uart",
    capabilities: ["4g_lte", "gnss", "sms", "data", "mqtt", "http"],
    dataFields: [
      { id: "signal_strength", name: "Signal Strength", unit: "dBm", type: "number" },
      { id: "network_type", name: "Network Type", unit: "", type: "string" },
      { id: "operator", name: "Operator", unit: "", type: "string" },
      { id: "data_connected", name: "Data Connected", unit: "", type: "boolean" },
      { id: "latitude", name: "GNSS Latitude", unit: "°", type: "number" },
      { id: "longitude", name: "GNSS Longitude", unit: "°", type: "number" },
      { id: "altitude", name: "GNSS Altitude", unit: "m", type: "number" },
      { id: "fix_quality", name: "Fix Quality", unit: "", type: "number" },
    ],
    defaultUpdateRate: 1,
    powerConsumption: { active: 500, sleep: 0.05 },
    operatingRange: { tempMin: -40, tempMax: 85, voltageMin: 3.4, voltageMax: 4.2 },
    documentation: "https://www.waveshare.com/sim7000g-h-4g-hat.htm",
    widgetComponent: "cellular-widget"
  },

  LORA_RFM95: {
    id: "lora_rfm95",
    name: "RFM95 LoRa Radio",
    manufacturer: "HopeRF",
    partNumber: "RFM95W",
    category: "communication",
    interface: "spi",
    capabilities: ["lora", "long_range", "mesh", "low_power"],
    dataFields: [
      { id: "rssi", name: "RSSI", unit: "dBm", type: "number" },
      { id: "snr", name: "SNR", unit: "dB", type: "number" },
      { id: "frequency", name: "Frequency", unit: "MHz", type: "number" },
      { id: "packets_rx", name: "Packets RX", unit: "", type: "number" },
      { id: "packets_tx", name: "Packets TX", unit: "", type: "number" },
    ],
    defaultUpdateRate: 1,
    powerConsumption: { active: 120, sleep: 0.0002 },
    operatingRange: { tempMin: -40, tempMax: 85, voltageMin: 1.8, voltageMax: 3.7 },
    widgetComponent: "lora-widget"
  },

  // Navigation / IMU
  BNO085: {
    id: "bno085",
    name: "BNO085 9-DOF IMU",
    manufacturer: "CEVA/Bosch",
    partNumber: "BNO085",
    category: "navigation",
    interface: "i2c",
    i2cAddresses: [0x4A, 0x4B],
    capabilities: ["accelerometer", "gyroscope", "magnetometer", "orientation", "step_counter"],
    dataFields: [
      { id: "accel_x", name: "Accel X", unit: "m/s²", type: "number" },
      { id: "accel_y", name: "Accel Y", unit: "m/s²", type: "number" },
      { id: "accel_z", name: "Accel Z", unit: "m/s²", type: "number" },
      { id: "gyro_x", name: "Gyro X", unit: "°/s", type: "number" },
      { id: "gyro_y", name: "Gyro Y", unit: "°/s", type: "number" },
      { id: "gyro_z", name: "Gyro Z", unit: "°/s", type: "number" },
      { id: "heading", name: "Heading", unit: "°", type: "number", min: 0, max: 360 },
      { id: "pitch", name: "Pitch", unit: "°", type: "number", min: -90, max: 90 },
      { id: "roll", name: "Roll", unit: "°", type: "number", min: -180, max: 180 },
      { id: "quaternion", name: "Quaternion", unit: "", type: "array" },
    ],
    defaultUpdateRate: 100,
    powerConsumption: { active: 3.5, sleep: 0.01 },
    operatingRange: { tempMin: -40, tempMax: 85, voltageMin: 2.4, voltageMax: 3.6 },
    widgetComponent: "imu-widget"
  },

  UBLOX_M10: {
    id: "ublox_m10",
    name: "u-blox MAX-M10 GNSS",
    manufacturer: "u-blox",
    partNumber: "MAX-M10S",
    category: "navigation",
    interface: "i2c",
    i2cAddresses: [0x42],
    capabilities: ["gps", "glonass", "galileo", "beidou", "rtk"],
    dataFields: [
      { id: "latitude", name: "Latitude", unit: "°", type: "number", precision: 7 },
      { id: "longitude", name: "Longitude", unit: "°", type: "number", precision: 7 },
      { id: "altitude", name: "Altitude", unit: "m", type: "number", precision: 1 },
      { id: "speed", name: "Speed", unit: "m/s", type: "number", precision: 2 },
      { id: "heading", name: "Heading", unit: "°", type: "number", min: 0, max: 360 },
      { id: "hdop", name: "HDOP", unit: "", type: "number" },
      { id: "satellites", name: "Satellites", unit: "", type: "number" },
      { id: "fix_type", name: "Fix Type", unit: "", type: "string" },
    ],
    defaultUpdateRate: 10,
    powerConsumption: { active: 25, sleep: 0.015 },
    operatingRange: { tempMin: -40, tempMax: 85, voltageMin: 2.7, voltageMax: 3.6 },
    widgetComponent: "gps-widget"
  },

  BMP390: {
    id: "bmp390",
    name: "BMP390 Barometric Altimeter",
    manufacturer: "Bosch",
    partNumber: "BMP390",
    category: "navigation",
    interface: "i2c",
    i2cAddresses: [0x76, 0x77],
    capabilities: ["pressure", "temperature", "altitude"],
    dataFields: [
      { id: "pressure", name: "Pressure", unit: "hPa", type: "number", precision: 2 },
      { id: "temperature", name: "Temperature", unit: "°C", type: "number", precision: 2 },
      { id: "altitude", name: "Altitude", unit: "m", type: "number", precision: 1 },
    ],
    defaultUpdateRate: 50,
    powerConsumption: { active: 0.7, sleep: 0.002 },
    operatingRange: { tempMin: -40, tempMax: 85, voltageMin: 1.7, voltageMax: 3.6 },
    widgetComponent: "altimeter-widget"
  },

  // Actuators - LEDs
  NEOPIXEL: {
    id: "neopixel",
    name: "NeoPixel/WS2812B LED Strip",
    manufacturer: "Various",
    partNumber: "WS2812B",
    category: "actuator",
    interface: "gpio",
    capabilities: ["rgb_led", "addressable", "animation", "status_indication"],
    dataFields: [
      { id: "led_count", name: "LED Count", unit: "", type: "number" },
      { id: "brightness", name: "Brightness", unit: "%", type: "number", min: 0, max: 100 },
      { id: "color", name: "Color", unit: "", type: "string" },
      { id: "animation", name: "Animation", unit: "", type: "string" },
    ],
    defaultUpdateRate: 30,
    powerConsumption: { active: 60, sleep: 0.001 }, // per LED
    operatingRange: { tempMin: -25, tempMax: 80, voltageMin: 3.5, voltageMax: 5.3 },
    widgetComponent: "led-control-widget"
  },

  // Optical Modem
  OPTICAL_TX: {
    id: "optical_tx",
    name: "Optical Modem TX (OPTX)",
    manufacturer: "Mycosoft",
    partNumber: "OPTX-01",
    category: "optical",
    interface: "gpio",
    capabilities: ["optical_communication", "underwater_comms", "line_of_sight", "high_bandwidth"],
    dataFields: [
      { id: "tx_power", name: "TX Power", unit: "%", type: "number", min: 0, max: 100 },
      { id: "modulation", name: "Modulation", unit: "", type: "string" },
      { id: "data_rate", name: "Data Rate", unit: "kbps", type: "number" },
      { id: "packets_sent", name: "Packets Sent", unit: "", type: "number" },
    ],
    defaultUpdateRate: 10,
    powerConsumption: { active: 200, sleep: 0.01 },
    operatingRange: { tempMin: -20, tempMax: 70, voltageMin: 5.0, voltageMax: 12.0 },
    widgetComponent: "optical-modem-widget"
  },

  OPTICAL_RX: {
    id: "optical_rx",
    name: "Optical Modem RX (OPRX)",
    manufacturer: "Mycosoft",
    partNumber: "OPRX-01",
    category: "optical",
    interface: "gpio",
    capabilities: ["optical_communication", "underwater_comms", "line_of_sight"],
    dataFields: [
      { id: "signal_strength", name: "Signal Strength", unit: "", type: "number", min: 0, max: 100 },
      { id: "snr", name: "SNR", unit: "dB", type: "number" },
      { id: "data_rate", name: "Data Rate", unit: "kbps", type: "number" },
      { id: "packets_received", name: "Packets Received", unit: "", type: "number" },
      { id: "bit_errors", name: "Bit Errors", unit: "", type: "number" },
    ],
    defaultUpdateRate: 10,
    powerConsumption: { active: 50, sleep: 0.01 },
    operatingRange: { tempMin: -20, tempMax: 70, voltageMin: 3.3, voltageMax: 5.0 },
    widgetComponent: "optical-modem-widget"
  },

  // Acoustic Modem
  ACOUSTIC_TX: {
    id: "acoustic_tx",
    name: "Acoustic Modem TX (AUTX)",
    manufacturer: "Mycosoft",
    partNumber: "AUTX-01",
    category: "acoustic",
    interface: "i2c",
    capabilities: ["underwater_acoustic", "long_range_comms", "low_bandwidth"],
    dataFields: [
      { id: "tx_power", name: "TX Power", unit: "dB", type: "number" },
      { id: "frequency", name: "Frequency", unit: "kHz", type: "number" },
      { id: "modulation", name: "Modulation", unit: "", type: "string" },
      { id: "packets_sent", name: "Packets Sent", unit: "", type: "number" },
    ],
    defaultUpdateRate: 1,
    powerConsumption: { active: 500, sleep: 0.05 },
    operatingRange: { tempMin: -5, tempMax: 50, voltageMin: 12.0, voltageMax: 24.0 },
    widgetComponent: "acoustic-modem-widget"
  },

  ACOUSTIC_RX: {
    id: "acoustic_rx",
    name: "Acoustic Modem RX (AURX)",
    manufacturer: "Mycosoft",
    partNumber: "AURX-01",
    category: "acoustic",
    interface: "i2c",
    capabilities: ["underwater_acoustic", "hydrophone", "ranging"],
    dataFields: [
      { id: "signal_strength", name: "Signal Strength", unit: "dB", type: "number" },
      { id: "noise_level", name: "Noise Level", unit: "dB", type: "number" },
      { id: "snr", name: "SNR", unit: "dB", type: "number" },
      { id: "packets_received", name: "Packets Received", unit: "", type: "number" },
      { id: "range", name: "Range", unit: "m", type: "number" },
    ],
    defaultUpdateRate: 1,
    powerConsumption: { active: 100, sleep: 0.01 },
    operatingRange: { tempMin: -5, tempMax: 50, voltageMin: 5.0, voltageMax: 12.0 },
    widgetComponent: "acoustic-modem-widget"
  },
}

// ============================================================================
// DEVICE PROFILES
// ============================================================================

export type DeviceProfileType = 
  | "drone"
  | "mushroom_1"
  | "sporebase"
  | "petreus"
  | "mycoprobe"
  | "alarm"
  | "weather_station"
  | "rover"
  | "buoy"
  | "custom"

export interface DeviceProfile {
  type: DeviceProfileType
  name: string
  description: string
  icon: string
  color: string
  requiredSensors: string[]  // Sensor IDs
  optionalSensors: string[]
  defaultWidgets: string[]
  capabilities: string[]
  dashboardLayout?: DashboardLayoutConfig
}

export interface DashboardLayoutConfig {
  columns: number
  rows: number
  widgets: WidgetPlacement[]
}

export interface WidgetPlacement {
  widgetId: string
  x: number
  y: number
  width: number
  height: number
}

export const DEVICE_PROFILES: Record<DeviceProfileType, DeviceProfile> = {
  drone: {
    type: "drone",
    name: "MycoDrone",
    description: "Autonomous aerial vehicle powered by MycoBrain",
    icon: "drone",
    color: "#00D9FF",
    requiredSensors: ["bno085", "ublox_m10", "bmp390"],
    optionalSensors: ["bme688", "vl53l1x", "mlx90640", "sph0645", "max98357a", "sim7000g", "neopixel"],
    defaultWidgets: [
      "attitude-indicator",
      "gps-map",
      "altimeter",
      "battery-status",
      "motor-status",
      "camera-feed",
      "telemetry",
      "flight-controls",
      "mission-planner"
    ],
    capabilities: ["flight", "autonomous", "fpv", "mapping", "surveillance", "delivery"],
  },

  mushroom_1: {
    type: "mushroom_1",
    name: "Mushroom 1",
    description: "Primary mushroom cultivation monitoring device",
    icon: "fungus",
    color: "#8B4513",
    requiredSensors: ["bme688"],
    optionalSensors: ["bmv080", "scd41", "sgp41", "as7341", "stemma_soil", "neopixel"],
    defaultWidgets: [
      "environment-monitor",
      "smell-detection",
      "growth-timeline",
      "substrate-status",
      "climate-control",
      "fruiting-conditions"
    ],
    capabilities: ["environmental_monitoring", "smell_detection", "growth_tracking", "climate_control"],
  },

  sporebase: {
    type: "sporebase",
    name: "SporeBase",
    description: "Spore collection and analysis station",
    icon: "database",
    color: "#9370DB",
    requiredSensors: ["bme688", "as7341"],
    optionalSensors: ["bmv080", "scd41", "mlx90640", "pn532"],
    defaultWidgets: [
      "spore-collector",
      "spectral-analysis",
      "species-identification",
      "sample-library",
      "environment-monitor"
    ],
    capabilities: ["spore_collection", "spectral_analysis", "species_id", "sample_management"],
  },

  petreus: {
    type: "petreus",
    name: "Petreus",
    description: "Petri dish cultivation and experiment tracking",
    icon: "petri-dish",
    color: "#00FF7F",
    requiredSensors: ["bme688"],
    optionalSensors: ["as7341", "mlx90640", "amg8833", "neopixel"],
    defaultWidgets: [
      "dish-grid",
      "growth-timelapse",
      "contamination-detection",
      "experiment-log",
      "thermal-view"
    ],
    capabilities: ["dish_monitoring", "timelapse", "contamination_detection", "experiment_tracking"],
  },

  mycoprobe: {
    type: "mycoprobe",
    name: "MycoProbe",
    description: "Subsurface mycelium and soil monitoring probe",
    icon: "probe",
    color: "#8FBC8F",
    requiredSensors: ["bme688", "stemma_soil"],
    optionalSensors: ["fci_probe", "ezo_ph", "scd41"],
    defaultWidgets: [
      "soil-profile",
      "colonization-map",
      "nutrient-levels",
      "mycelium-activity",
      "depth-readings"
    ],
    capabilities: ["soil_monitoring", "colonization_tracking", "nutrient_analysis", "ph_monitoring"],
  },

  alarm: {
    type: "alarm",
    name: "MycoAlarm",
    description: "Environmental alert and security device",
    icon: "alarm",
    color: "#FF4500",
    requiredSensors: ["bme688", "sph0645"],
    optionalSensors: ["vl53l1x", "amg8833", "pn532", "max98357a", "neopixel", "sim7000g"],
    defaultWidgets: [
      "alert-status",
      "trigger-history",
      "environment-monitor",
      "motion-detection",
      "sound-monitor"
    ],
    capabilities: ["alerts", "motion_detection", "sound_detection", "remote_notification"],
  },

  weather_station: {
    type: "weather_station",
    name: "MycoWeather",
    description: "Environmental weather monitoring station",
    icon: "cloud-sun",
    color: "#87CEEB",
    requiredSensors: ["bme688", "bmp390"],
    optionalSensors: ["bmv080", "scd41", "sgp41", "ublox_m10", "sim7000g", "lora_rfm95"],
    defaultWidgets: [
      "weather-dashboard",
      "forecast-chart",
      "aqi-index",
      "wind-rose",
      "precipitation",
      "solar-radiation"
    ],
    capabilities: ["weather_monitoring", "forecast", "air_quality", "data_logging"],
  },

  rover: {
    type: "rover",
    name: "MycoRover",
    description: "Ground-based mobile exploration platform",
    icon: "truck",
    color: "#D2691E",
    requiredSensors: ["bno085", "ublox_m10"],
    optionalSensors: ["bme688", "vl53l1x", "tfmini", "mlx90640", "sph0645", "sim7000g", "neopixel"],
    defaultWidgets: [
      "drive-controls",
      "navigation-map",
      "obstacle-view",
      "sensor-array",
      "camera-feed",
      "telemetry"
    ],
    capabilities: ["navigation", "obstacle_avoidance", "mapping", "sample_collection"],
  },

  buoy: {
    type: "buoy",
    name: "MycoBuoy",
    description: "Water-based environmental monitoring buoy",
    icon: "anchor",
    color: "#4169E1",
    requiredSensors: ["bme688", "ublox_m10"],
    optionalSensors: ["ezo_ph", "acoustic_rx", "acoustic_tx", "sim7000g", "lora_rfm95", "neopixel"],
    defaultWidgets: [
      "position-map",
      "water-quality",
      "wave-height",
      "temperature-profile",
      "acoustic-monitor",
      "battery-solar"
    ],
    capabilities: ["water_monitoring", "wave_measurement", "acoustic_communication", "solar_power"],
  },

  custom: {
    type: "custom",
    name: "Custom Device",
    description: "User-defined MycoBrain configuration",
    icon: "settings",
    color: "#808080",
    requiredSensors: [],
    optionalSensors: Object.keys(SENSOR_LIBRARY),
    defaultWidgets: ["device-overview", "sensor-array"],
    capabilities: ["custom"],
  },
}

// ============================================================================
// DETECTION HELPERS
// ============================================================================

export interface DetectedSensor {
  definition: SensorDefinition
  address?: number
  port?: string
  firmwareVersion?: string
  status: ConnectionStatus
  lastReading?: Record<string, unknown>
  lastUpdate?: string
}

export function identifySensorByI2CAddress(address: number): SensorDefinition | undefined {
  for (const sensor of Object.values(SENSOR_LIBRARY)) {
    if (sensor.i2cAddresses?.includes(address)) {
      return sensor
    }
  }
  return undefined
}

export function getWidgetForSensor(sensorId: string): string {
  return SENSOR_LIBRARY[sensorId.toUpperCase()]?.widgetComponent || "generic-sensor-widget"
}

export function getSensorsForCategory(category: SensorCategory): SensorDefinition[] {
  return Object.values(SENSOR_LIBRARY).filter(s => s.category === category)
}

export function getDeviceProfileByType(type: DeviceProfileType): DeviceProfile {
  return DEVICE_PROFILES[type]
}

export function detectDeviceProfile(sensorIds: string[]): DeviceProfileType {
  // Score each profile based on matching sensors
  let bestMatch: DeviceProfileType = "custom"
  let bestScore = 0

  for (const [profileType, profile] of Object.entries(DEVICE_PROFILES)) {
    const requiredMatched = profile.requiredSensors.filter(s => sensorIds.includes(s)).length
    const optionalMatched = profile.optionalSensors.filter(s => sensorIds.includes(s)).length
    
    // All required sensors must be present
    if (requiredMatched === profile.requiredSensors.length) {
      const score = requiredMatched * 10 + optionalMatched
      if (score > bestScore) {
        bestScore = score
        bestMatch = profileType as DeviceProfileType
      }
    }
  }

  return bestMatch
}
