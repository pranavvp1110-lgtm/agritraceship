# MoFPI AgriTrace: Offline-First IoT + Blockchain Farm-to-Fork Traceability

**Problem Statement:** Low-Cost IoT Blockchain Nodes for Farm-to-Fork Traceability  
**Organization:** Ministry of Food Processing Industries (MoFPI)  
**Theme:** Agriculture, FoodTech & Rural Development  
**Category:** Hardware & Distributed Ledger Systems

---

## 1. Overview & Architecture

AgriTrace is an **offline-first**, rugged, low-bandwidth-friendly traceability system designed for Small and Medium Enterprises (SMEs), Farmer Producer Organizations (FPOs), cold storage operators, and consumers.

It tracks agricultural produce through all 8 stages of the supply chain:
```
🚜 Farm → 🏢 Collection Center → ⚙️ Processing → ❄️ Cold Storage → 🚛 Transportation → 🏬 Distribution → 🛒 Retail → 🍽️ Fork
```

### The Offline-First Invariant
In remote orchards, village collection mandis, or inside insulated metal refrigerated containers (reefer trucks), cellular and internet connectivity is frequently unavailable.

**AgriTrace guarantees 100% data preservation and operational continuity:**
```
IoT Sensors (SHT31 / Membrapor Ethylene / GPS / Battery / Solar)
          ↓
ESP32 Hardware Node (Collects & buffers telemetry in SPIFFS Flash Memory)
          ↓
Local Communication (BLE 5.0 Peer-to-Peer or Local Wi-Fi AP)
          ↓
Mobile / Web Application
          ↓
Local Encrypted Database (Dexie.js / IndexedDB)
          ↓
Full Offline Operation (Live telemetry, charts, spoilage alerts, stage handoffs)
          ↓
Network Becomes Available (Cellular tower acquired / Wi-Fi hub connected)
          ↓
Automatic Synchronization (Atomic sync queue worker)
          ↓
Distributed Ledger / Blockchain (Cryptographic Merkle Root & SHA-256 Block Anchoring)
```

---

## 2. Technology Stack

* **Frontend Framework:** React 19, TypeScript, Vite
* **Styling & Design System:** Tailwind CSS v4, Glassmorphic dark theme + High-contrast outdoor sunlight "Field Mode"
* **Local Offline Storage:** IndexedDB via Dexie.js (8 atomic tables: `batches`, `products`, `stages`, `sensorReadings`, `devices`, `syncQueue`, `auditLogs`, `blockchainBlocks`)
* **PWA & Offline Resilience:** Service Worker (`sw.js`) precaching and Web App Manifest (`manifest.json`)
* **IoT Hardware Layer:** Web Bluetooth API (BLE) integration + ESP32 Hardware Simulator with Chaos Anomaly Injectors
* **Blockchain & Cryptography:** Native Web Cryptography API SHA-256 hashing, Merkle Tree aggregation, and cryptographic batch proof generation
* **QR & Consumer Verification:** Dynamic QR Code generator (`qrcode`) & interactive scanner

---

## 3. Key Features

### A. Role-Based Login & Food Identity Portal
* **Offline-First Authentication:** Session persistence stored securely in encrypted local browser storage without requiring external OAuth servers.
* **Commodity / Food Type Declaration:** Users declare which agricultural produce or food category they are cultivating, transporting, storing, or inspecting:
  - Fresh Fruits & Horticulture (e.g. GI-Tagged Ratnagiri Alphonso Mangoes, Himachal Royal Apples)
  - Organic Dairy & Cold-Chain Milk (Gir A2 Chilled Raw Milk)
  - Fresh Vegetables & Hydroponic Greenhouse Greens
  - Marine Catch & Seafood (Deep-Freeze Tiger Prawns)
  - Spices, Plantation Crops & Cold-Pressed Edible Oils
  - Option to declare custom crop/food types on demand.
* **1-Click Quick Demo Sign-in:** Immediate demonstration access with pre-configured official roles and declared commodities:
  - **Dr. Vikram Joshi:** *MoFPI National Quality Auditor & Blockchain Inspector (Multi-Commodity)*
  - **Ganesh Vitthal Patil:** *Certified Organic Farmer / FPO President (Ratnagiri Alphonso Mangoes)*
  - **Mahesh Solanki:** *Cold-Chain Reefer Logistics Pilot (Dairy & Mangoes)*
  - **Sanjay Deshmukh:** *Controlled Atmosphere Cold Vault Operator (Himachal Apples)*
  - **Ananya Iyer:** *Informed Consumer (Organic Certified Produce)*
* **Custom Sign-in Form:** Allows entering Full Name, Role, Declared Food Type Supplied, Organization, Mandi/Facility Location, FSSAI Registration Number, and Security PIN.
* **Seamless Relocation:** Authenticates on-device and immediately transitions the user into the AgriTrace dashboard customized for their role.
* **Header Profile & Food Badge:** Displays the active user's name, role, and supplied food commodity badge on the top navigation bar.
* **Pre-Populated Batch Registration:** When creating new harvest lots, the modal automatically associates the batch with the logged-in supplier's declared food commodity.
* **Role Switcher / Logout:** Instant logout and role switching accessible right from the top navigation bar.

### B. Real-Time Status Indicators
* 🟢 **ONLINE:** Connected to national grid ledger; real-time automatic synchronization active.
* 🟡 **SYNCING (X):** Background synchronization actively uploading queued offline packets.
* 🔵 **LOCAL BLE/MESH:** Directly connected to ESP32 node via Bluetooth Low Energy; zero cloud required.
* 🔴 **OFFLINE (X):** Zero internet/cellular; all telemetry safely logged in local IndexedDB.

### B. ESP32 Telemetry Node Integration & Pinout

AgriEarth natively interfaces with ESP32 DevKit V1 microcontrollers with offline flash buffering and automatic Wi-Fi sync:

| Component | ESP32 GPIO | Interface | Details |
| :--- | :--- | :--- | :--- |
| **KY-001 (DS18B20)** | **GPIO 5** | 1-Wire Digital | Precision core pulp temperature (4.7kΩ pull-up) |
| **DHT11** | **GPIO 4** | Single-Bus | Ambient temperature & relative humidity |
| **MQ-135 Gas Sensor** | **GPIO 34** | Analog (ADC1) | **10kΩ/15kΩ Voltage Divider** step-down to < 3.0V. Used as **Air Quality / Gas Anomaly Indicator** (*NOT ethylene ppm*). |
| **GPS (NEO-6M/8N)** | **GPIO 18 (RX) / GPIO 19 (TX)** | UART2 @ 9600 | Live coordinates, breadcrumb geofencing, and satellites fix |
| **Local Storage** | **Internal Flash** | LittleFS / SPIFFS | Persistent local JSONL buffering when offline |

#### Ingestion API: `POST /api/iot/sensor-data`
Both direct ESP32 hardware POSTs and browser offline sync queues submit telemetry using the standardized JSON payload:
```json
{
  "record_id": "ESP32_NODE_01-000102",
  "device_id": "ESP32_NODE_01",
  "batch_id": "BATCH_001",
  "sequence_number": 102,
  "timestamp": "2026-10-05T12:00:00Z",
  "temperature_ky001": 34.63,
  "temperature_dht11": 27.0,
  "humidity": 56.8,
  "mq135_raw": 1920,
  "mq135_adc_voltage": 1.547,
  "gps_fix": false,
  "latitude": null,
  "longitude": null,
  "satellites": 0
}
```

* **Idempotency & Deduplication:** The backend tracks `${device_id}-${sequence_number}-${record_id}` to prevent duplicate inserts if an upload is retried.
* **Firmware Location:** Full Arduino C++ firmware is in [`firmware/esp32_sensor_node.ino`](firmware/esp32_sensor_node.ino) with modular [`firmware/StorageBackend.h`](firmware/StorageBackend.h) ready for microSD expansion.

---

## 4. How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Run the Vite development server (includes IoT Ingestion middleware)
npm run dev

# 3. Open in your browser
http://localhost:5173/
```

To test offline functionality:
1. Open the app in your browser.
2. Click **"DEMO OFFLINE"** in the top navigation bar.
3. Capture new sensor readings from the **Offline Records** page (`/offline-records`) or via the IoT Controller.
4. Notice records saved immediately into IndexedDB (`offlineSensorRecords`) marked with `PENDING_SYNC`.
5. Switch back to **"ONLINE"**; observe the status indicator transition from **OFFLINE** → **SYNCING** → **SYNC COMPLETE** with live counters updating (`Pending: 0, Synced: X`).
6. Reload the page or close and reopen the browser: all offline records and synced states are persistently preserved.

---

## 5. 24/7 Free Cloud Hosting & Netlify Serverless API

The repository includes:
* `netlify/functions/sensor-data.ts`: Serverless API route handling `POST /api/iot/sensor-data` and `GET /api/iot/sensor-data`.
* `netlify.toml`: Redirect configuration mapping `/api/iot/*` to Netlify serverless functions.
* `public/manifest.json` & `public/sw.js`: PWA service worker precaching shell assets for 100% offline startup.

---

## 6. How Anyone Can Install the App (Android / iPhone / PC)

Once opened on the live link:
* **Android:** Tap the three dots `(⋮)` in Chrome → Tap **"Install app"** or **"Add to Home screen"**.
* **iPhone (iOS):** Tap the **Share** button `(📤)` in Safari → Tap **"Add to Home Screen"**.
* **Windows / Mac / Linux (PC):** Look at the right side of the address bar in Chrome/Edge and click the **Install icon** `(⊕)`.

Once installed, **AgriEarth works 100% offline** — users can open the app, log sensor telemetry, record farm batches, and verify certificates even with zero cellular signal or when the cloud server is unreachable!


