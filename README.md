# 🖥️ Server Dashboard — Proxmox Infrastructure Management

A full-stack infrastructure management dashboard for **Proxmox VE** clusters with real-time monitoring, VM management, and role-based access control.

![Dashboard Preview](https://img.shields.io/badge/Status-Live-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- **Real-Time Monitoring** — CPU, RAM, Storage usage via WebSocket telemetry
- **Multi-Node Support** — Monitor 3+ Proxmox nodes simultaneously
- **VM Management** — Start, Stop, Restart, Shutdown VMs from the dashboard
- **4-Level RBAC** — Super Admin, Admin, Operator, Viewer roles
- **Dark Theme UI** — Glassmorphism design with smooth animations
- **Security Logs** — Full audit trail of user actions
- **Prometheus Metrics** — `/metrics` endpoint for Grafana integration

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React, Recharts |
| **Backend** | Node.js, Express.js |
| **Database** | sql.js (SQLite in WASM) |
| **Real-time** | WebSocket |
| **Auth** | JWT + bcryptjs |
| **Monitoring** | Prometheus client |
| **API** | Proxmox VE REST API |

## 🔐 Role-Based Access Control

| Role | Level | Permissions |
|------|-------|-------------|
| **Super Admin** | 4 | Full access — manage users, VMs, settings |
| **Admin** | 3 | Manage VMs, view users & logs |
| **Operator** | 2 | Start/Stop/Restart VMs, view data |
| **Viewer** | 1 | Read-only access |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Proxmox VE cluster (with API tokens)

### 1. Clone & Install

```bash
git clone https://github.com/shoeb-devops/serverdeshboard.git
cd serverdeshboard

# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 2. Configure Environment

```bash
cp .env.example server/.env
# Edit server/.env with your Proxmox credentials
```

### 3. Run

```bash
# Terminal 1 - Backend
cd server && node src/index.js

# Terminal 2 - Frontend
cd client && npx next dev
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000
- **Default Login:** `admin` / `admin123`

## 📁 Project Structure

```
serverdeshboard/
├── client/                 # Next.js 14 Frontend
│   ├── src/
│   │   ├── app/           # Pages (Dashboard, VMs, Storage, etc.)
│   │   ├── components/    # Reusable UI Components
│   │   ├── hooks/         # Custom React Hooks
│   │   └── lib/           # API client & constants
│   └── package.json
├── server/                 # Express.js Backend
│   ├── src/
│   │   ├── config/        # Database, Proxmox, Prometheus
│   │   ├── middleware/    # Auth, Encryption, Audit
│   │   ├── routes/        # API Routes
│   │   ├── services/      # Proxmox API, Telemetry, WebSocket
│   │   └── utils/         # DB initialization
│   └── package.json
├── prometheus/             # Prometheus configuration
├── .env.example           # Environment template
└── README.md
```

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Health check & mode |
| POST | `/api/auth/login` | No | User login |
| GET | `/api/nodes` | Yes | All node data |
| GET | `/api/vms` | Yes | All VMs |
| POST | `/api/vms/:id/:action` | Operator+ | VM actions |
| GET | `/api/storage` | Yes | Storage data |
| GET | `/api/network` | Yes | Network data |
| GET | `/api/users` | Admin+ | User list |
| GET | `/api/users/roles` | Yes | Available roles |
| GET | `/metrics` | No | Prometheus metrics |

## 🛡️ Security

- JWT authentication with 24h expiry
- bcryptjs password hashing
- AES-256-GCM encryption middleware
- Role-based access control
- Audit logging for all actions
- CORS restricted to localhost

## 📄 License

MIT License — Feel free to use and modify.
