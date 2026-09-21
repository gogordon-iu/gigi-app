# 📱 Gigi Classroom Assistant Mobile & Web Portal

[![CI](https://github.com/gogordon-iu/gigi-app/actions/workflows/ci.yml/badge.svg)](https://github.com/gogordon-iu/gigi-app/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg)](https://reactnative.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg)](https://vitejs.dev)

The **Gigi Classroom Assistant Portal** is the official multi-platform mobile and web application for the **Gigi Social Robot platform**. It allows teachers, researchers, and students to interact with, control, customize, and author educational curriculum for Gigi robots in real-time.

---

## ✨ Features

### 1. 🔌 Multi-Transport Robot Communication
- **Web Serial Bluetooth Classic**: Connect directly to Gigi's Bluetooth SPP RFCOMM port from Chrome/Edge on desktop and Android without installing any native drivers.
- **Native Bluetooth Classic**: Low-latency RFCOMM connection on native Android and iOS mobile devices.
- **WebSocket & TCP Sockets**: Local WiFi network connectivity for testing, simulation, and high-bandwidth telemetry.
- **Bi-directional Protocol**: Real-time status reporting, process PID tracking, execution logs, and script lifecycle callbacks.

### 2. 🛡️ Motor Calibration Safety Lockout
- **Physical Safety Guard**: Prohibits physical robot motion until servo motors have been verified and calibrated on the local robot.
- **Visual Status HUD**: Live `🟢 CALIBRATED`, `⚠️ UNCALIBRATED`, and `⚪ CHECKING` status badges on the header.
- **Interactive Calibration Wizard**: Trigger the motor calibration routine remotely over Bluetooth with a single tap.

### 3. 🤖 Robot Activities Manager
- **Dynamic Activity Discovery**: Query the connected robot to automatically discover all available Python activity scripts, lesson plans, and custom interactions.
- **Category Filtering**: Filter activities by standard demos, planned curriculum, or custom state machines.
- **One-Touch Execution**: Launch or stop robot activities cleanly with real-time feedback and execution status.

### 4. 📝 AI-Powered Lesson Planner
- **Pedagogy Synthesis**: Generate complete, structured classroom lesson plans using Azure OpenAI GPT-4o.
- **Step-by-Step Curriculum**: Alternate between fixed robot instructions (`canned`) and interactive student discussions (`open`).
- **Automated DALL-E 3 Illustrations**: Generate visual teaching aids and digital illustrations for on-robot display.
- **Direct Robot Deployment**: Package and dispatch lesson plans with embedded media directly to Gigi over Bluetooth.

### 5. 🧠 Dynamic Interaction Designer
- **State Machine Generation**: Synthesize complex conversational games, quizzes, and receptionist behaviors into JSON state machines.
- **Visual Flow Editor**: Inspect and edit state machine logic, speech phrases, gestures, and transitions before sending to the robot.

### 6. 🔐 Cryptographic Access Control & Manager Panel
- **Role-Based Access**: Multi-tier access for administrators and classroom users.
- **Cryptographic User Tokens**: Self-contained, signed access tokens using SHA-256 digests and stream ciphers.
- **QR Code Sharing**: Instantly share access tokens via QR codes for fast mobile browser login.
- **Revocation Blacklist**: Revoke individual student or teacher access locally with instant persistence.
- **Configuration Backup**: Export and restore issued tokens, keys, and security settings as JSON backups.

---

## 🏗️ Architecture

```
gigi-mobile-app/
├── App.tsx                     # Main application entry point & navigation orchestrator
├── src/
│   ├── components/             # Modular UI components
│   │   ├── Activities/         # Activities view & calibration banner
│   │   ├── Auth/               # LockScreen & login modal
│   │   ├── Common/             # Reusable UI (QRCodeDisplay, etc.)
│   │   ├── Console/            # Connection manager & log stream
│   │   ├── Interaction/        # Dynamic state machine interaction designer
│   │   ├── Manager/            # Admin access token manager & settings
│   │   └── Planner/            # AI lesson planner & DALL-E asset generator
│   ├── constants/              # Strategy catalog & system prompts
│   ├── styles/                 # Shared theme, design tokens & stylesheets
│   ├── types/                  # TypeScript definitions & interfaces
│   └── utils/                  # SHA-256 crypto, ciphers & token helpers
├── web/                        # Web platform mocks & HTML entry point
├── dist/                       # Production web build bundle
└── __tests__/                  # Unit & integration test suites
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `>= 22.11.0`
- **npm**: `>= 10.0.0`

### Installation
```bash
git clone https://github.com/gogordon-iu/gigi-app.git
cd gigi-app
npm install
```

### Web Development (Fastest for testing & Bluetooth Serial)
To run the local Vite development server:
```bash
npm run web
```
Open your browser at `http://localhost:5173`.

To build the optimized production web assets:
```bash
npm run build-web
```

### Running Tests
Execute the Jest test suite:
```bash
npm test
```

### Native Mobile Development
#### Android
```bash
npm run android
```
#### iOS (macOS only)
```bash
bundle exec pod install
npm run ios
```

---

## 🔒 Security & Admin Configuration

Administrator access and token signatures are protected cryptographically. By default, backward-compatible keys are loaded, but you can configure custom secrets via environment variables:

```bash
# Web / Vite (.env or environment)
VITE_ADMIN_PASSCODE="your-secure-admin-passcode"
VITE_TOKEN_SALT="your-unique-token-salt"

# React Native (.env)
REACT_APP_ADMIN_PASSCODE="your-secure-admin-passcode"
REACT_APP_TOKEN_SALT="your-unique-token-salt"
```

You can also change the admin passcode directly inside the application via the **Manager Panel** tab.

---

## 📄 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Gigi Robotics Team / Indiana University Bloomington.
