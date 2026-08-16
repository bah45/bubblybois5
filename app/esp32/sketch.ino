// Bubbly Bois: Energy-Aware Self-Powered Predictive Maintenance Node
// Target: ESP32-C3 SuperMini
// Sensors: ADXL335 (analog x/y/z vibration), ACS712/SCT-013 (current), LTC3588-1 (supercap voltage sense)
//
// This firmware performs all statistical feature extraction on-device (edge computing) and only
// transmits derived features plus raw supercap voltage over HTTPS. Telemetry cadence is throttled
// dynamically by the harvested supercap voltage so the node can run indefinitely off ambient
// vibration/energy harvesting without depleting the 0.5F supercapacitor.

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <math.h>

// ---------------- Configuration ----------------
const char* WIFI_SSID       = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD   = "YOUR_WIFI_PASSWORD";
const char* SERVER_HOST     = "https://your-site.netlify.app/api/telemetry";
const char* DEVICE_API_KEY  = "YOUR_ESP32_DEVICE_API_KEY"; // must match ESP32_DEVICE_API_KEY env var
const char* NODE_ID         = "esp32-node-01";
const char* MACHINE_ID      = "machine-001";
const char* FIRMWARE_VERSION = "1.0.0";

// Analog pins (ADC1 channels recommended on ESP32-C3 so Wi-Fi radio does not interfere with ADC2)
const int PIN_ADXL_X   = 0; // GPIO0 / ADC1_CH0
const int PIN_ADXL_Y   = 1; // GPIO1 / ADC1_CH1
const int PIN_ADXL_Z   = 2; // GPIO2 / ADC1_CH2
const int PIN_CURRENT  = 3; // GPIO3 / ADC1_CH3 - ACS712 or SCT-013 conditioning output
const int PIN_SUPERCAP = 4; // GPIO4 / ADC1_CH4 - LTC3588-1 VOUT sense (via divider)

// Sensor calibration
const float ADC_VREF          = 3.3f;
const int   ADC_RESOLUTION    = 4095; // 12-bit
const float ADXL_ZERO_G_VOLTS = 1.65f; // ADXL335 mid-supply zero-g reference
const float ADXL_SENSITIVITY  = 0.330f; // V/g at 3.3V supply
const float ACS712_ZERO_VOLTS = 1.65f;
const float ACS712_SENSITIVITY = 0.100f; // V/A, model-dependent (ACS712-20A ~0.100 V/A)
const float SUPERCAP_DIVIDER_RATIO = 2.0f; // resistor divider from supercap voltage to ADC-safe range

// Windowed sampling for on-edge RMS / statistics
const int WINDOW_SIZE = 128;
float vibrationWindow[WINDOW_SIZE];

WiFiClientSecure secureClient;

// ---------------- Energy-aware interval logic ----------------
// Mirrors the exact thresholds used server-side in lib/energy.ts so the node's behavior
// and the dashboard's displayed energy_state always agree.
unsigned long intervalForSupercapVoltage(float voltage) {
  if (voltage >= 3.7f) return 2000UL;   // HIGH ENERGY: high-frequency telemetry
  if (voltage >= 3.4f) return 8000UL;   // NORMAL: standard interval
  if (voltage >= 3.1f) return 30000UL;  // ENERGY SAVING: reduced Wi-Fi tx frequency
  return 60000UL;                        // CRITICAL: essential emergency telemetry only
}

const char* energyStateForVoltage(float voltage) {
  if (voltage >= 3.7f) return "HIGH";
  if (voltage >= 3.4f) return "NORMAL";
  if (voltage >= 3.1f) return "ENERGY_SAVING";
  return "CRITICAL";
}

float readVoltage(int pin) {
  int raw = analogRead(pin);
  return (raw / (float)ADC_RESOLUTION) * ADC_VREF;
}

float readSupercapVoltage() {
  return readVoltage(PIN_SUPERCAP) * SUPERCAP_DIVIDER_RATIO;
}

float readCurrentAmps() {
  float v = readVoltage(PIN_CURRENT);
  return (v - ACS712_ZERO_VOLTS) / ACS712_SENSITIVITY;
}

// Sample the ADXL335 for one windowed burst and compute vibration magnitude RMS plus
// mean / variance / stddev / z-score / kurtosis directly on-device.
struct VibrationStats {
  float rms;
  float mean;
  float variance;
  float stddev;
  float zScoreOfLastSample;
  float kurtosis;
};

VibrationStats sampleVibrationWindow() {
  for (int i = 0; i < WINDOW_SIZE; i++) {
    float x = (readVoltage(PIN_ADXL_X) - ADXL_ZERO_G_VOLTS) / ADXL_SENSITIVITY;
    float y = (readVoltage(PIN_ADXL_Y) - ADXL_ZERO_G_VOLTS) / ADXL_SENSITIVITY;
    float z = (readVoltage(PIN_ADXL_Z) - ADXL_ZERO_G_VOLTS) / ADXL_SENSITIVITY;
    vibrationWindow[i] = sqrtf(x * x + y * y + z * z);
    delayMicroseconds(500); // ~2 kHz sampling within the window
  }

  double sumSq = 0, sum = 0;
  for (int i = 0; i < WINDOW_SIZE; i++) {
    sum += vibrationWindow[i];
    sumSq += (double)vibrationWindow[i] * vibrationWindow[i];
  }
  float mean = sum / WINDOW_SIZE;
  float rms = sqrtf(sumSq / WINDOW_SIZE);

  double varAccum = 0, m3 = 0, m4 = 0;
  for (int i = 0; i < WINDOW_SIZE; i++) {
    double d = vibrationWindow[i] - mean;
    varAccum += d * d;
    m3 += d * d * d;
    m4 += d * d * d * d;
  }
  float variance = varAccum / WINDOW_SIZE;
  float stddev = sqrtf(variance);
  float kurtosis = (stddev > 0.0001f) ? (float)((m4 / WINDOW_SIZE) / (variance * variance)) : 0.0f;
  float lastZ = (stddev > 0.0001f) ? (vibrationWindow[WINDOW_SIZE - 1] - mean) / stddev : 0.0f;

  VibrationStats stats = { rms, mean, variance, stddev, lastZ, kurtosis };
  return stats;
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(250);
  }
}

bool postTelemetry(const VibrationStats& stats, float current, float supercapVoltage, bool panic) {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (WiFi.status() != WL_CONNECTED) return false;

  secureClient.setInsecure(); // For production, pin the server's CA certificate instead.

  HTTPClient https;
  if (!https.begin(secureClient, SERVER_HOST)) return false;

  https.addHeader("Content-Type", "application/json");
  String authHeader = String("Bearer ") + DEVICE_API_KEY;
  https.addHeader("Authorization", authHeader);

  String payload = "{";
  payload += "\"node_id\":\"" + String(NODE_ID) + "\",";
  payload += "\"machine_id\":\"" + String(MACHINE_ID) + "\",";
  payload += "\"firmware_version\":\"" + String(FIRMWARE_VERSION) + "\",";
  payload += "\"vibration_rms\":" + String(stats.rms, 4) + ",";
  payload += "\"peak_current\":" + String(current, 4) + ",";
  payload += "\"supercap_voltage\":" + String(supercapVoltage, 4) + ",";
  payload += "\"variance\":" + String(stats.variance, 6) + ",";
  payload += "\"kurtosis\":" + String(stats.kurtosis, 4) + ",";
  payload += "\"z_score\":" + String(stats.zScoreOfLastSample, 4) + ",";
  payload += "\"panic\":" + String(panic ? "true" : "false");
  payload += "}";

  int code = https.POST(payload);
  https.end();
  return code == 200;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  connectWiFi();
}

void loop() {
  VibrationStats stats = sampleVibrationWindow();
  float current = readCurrentAmps();
  float supercapVoltage = readSupercapVoltage();

  bool panic = (stats.rms > 4.5f) || (current > 15.0f) || (supercapVoltage < 3.1f) ||
               (fabsf(stats.zScoreOfLastSample) > 3.0f) || (stats.kurtosis > 4.2f);

  postTelemetry(stats, current, supercapVoltage, panic);

  unsigned long sleepMs = intervalForSupercapVoltage(supercapVoltage);
  // If in panic, always send the next reading quickly regardless of energy state so an
  // emergency condition is never delayed by a low-power interval.
  if (panic) sleepMs = min(sleepMs, 2000UL);

  delay(sleepMs);
}
