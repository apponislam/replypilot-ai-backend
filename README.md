# 🚀 ReplyPilot AI — Backend Server

> **Autonomous AI Email Copilot & Real-Time Auto-Reply Engine**  
> Powered by Node.js, Express, TypeScript, MongoDB, Socket.io, Resend, and an open-source Ollama LLM (`llama3.2:3b`) running privately behind a Cloudflare Tunnel.

---

## 🌐 Live Deployments & Infrastructure

| Service | URL | Description |
|---|---|---|
| **Frontend Web App** | [https://replypilot.apponislam.top](https://replypilot.apponislam.top) | Next.js Dashboard & Management UI |
| **Backend API** | [https://replypilotapi.apponislam.top](https://replypilotapi.apponislam.top) | Express / TypeScript REST API & WebSockets |
| **Ollama AI Endpoint** | [https://ollama.apponislam.top](https://ollama.apponislam.top) | Self-hosted Open-Source `llama3.2:3b` exposed securely via **Cloudflare Tunnel** |

---

## 💡 Overview & Architecture

ReplyPilot AI is an intelligent email automation platform designed for individuals and teams who want instantaneous, context-aware email replies without expensive proprietary AI APIs.

### 🧠 Open-Source AI via Cloudflare Tunnel
Instead of relying on costly third-party AI APIs (such as OpenAI or Anthropic), ReplyPilot AI connects directly to a self-hosted **Ollama** server running the open-source **`llama3.2:3b`** model. The local Ollama server is securely bridged to the cloud using a **Cloudflare Tunnel** (`https://ollama.apponislam.top`). This delivers:
- **100% Data Privacy**: Sensitive email communications never train commercial LLMs.
- **Zero Token Fees**: Run hundreds or thousands of draft generations and summaries at zero incremental AI inference cost.
- **Low Latency & High Reliability**: Cloudflare Tunnel provides encrypted, DDoS-protected HTTP access directly to your local GPU/CPU hardware.

---

## 🦙 Open-Source AI Model (Running via Cloudflare Tunnel)

### 🔴 Live Model Status: Active & Ready
The open-source AI engine is **currently running 24/7 on my private machine** and exposed through my personal **Cloudflare Tunnel**:

- **Model**: `llama3.2:3b` (Meta's lightweight multilingual LLM)
- **Live Endpoint**: `https://ollama.apponislam.top`
- **Health Check**: `https://ollama.apponislam.top/api/tags`

You don't need to configure any tunnels or set up complicated cloud deployments. The backend is already configured out-of-the-box to connect to this live tunnel endpoint:

```env
OLLAMA_HOST=https://ollama.apponislam.top
OLLAMA_MODEL=llama3.2:3b
```

---

### 💻 (Optional) Running Ollama Locally on Your Own Machine

If you prefer to run the model completely offline on your own computer instead of using my live Cloudflare Tunnel:

1. **Install Ollama**:
   - **Windows**: Download from [ollama.com/download/windows](https://ollama.com/download/windows)
   - **macOS**: `brew install ollama`
   - **Linux**: `curl -fsSL https://ollama.com/install.sh | sh`

2. **Pull and Run `llama3.2:3b`**:
   ```bash
   ollama run llama3.2:3b
   ```
   Ollama will start serving locally at `http://localhost:11434`.

3. **Update your `.env`**:
   ```env
   OLLAMA_HOST=http://localhost:11434
   OLLAMA_MODEL=llama3.2:3b
   ```

---



## ✨ Core Features

1. **⚡ Inbound Email Ingestion (Resend Webhook)**
   - Listens to incoming real-world emails delivered to `replypilotai@apponislam.top` via Resend's Inbound SMTP.
   - Webhook payloads are securely verified using Svix cryptographic signatures before processing.

2. **🤖 Automated AI Drafts & Summarization**
   - Automatically parses subject, body text/HTML, and attachment metadata.
   - Generates an executive summary and a polished AI draft reply matching the recipient's query.

3. **🔁 Dual Reply Workflows**
   - **Auto-Pilot Mode (`AUTO_REPLIED`)**: If enabled in settings, ReplyPilot dispatches the generated reply immediately to the recipient via Resend and updates the email status to `AUTO_REPLIED`.
   - **Draft Review Mode (`UNREAD` / `REPLIED`)**: If auto-reply is disabled, drafts are held in an `UNREAD` state with an `"AI Draft Ready"` badge for admin review. Admins can edit, regenerate with custom tones (`professional`, `friendly`, `concise`, `formal`, `casual`), or dispatch manually.

4. **👤 Per-User Isolated AI Settings**
   - Every user and admin has their own dedicated settings record.
   - Configure individual instructions, preferred tone, sender name, and independent auto-reply toggles without affecting other users.

5. **📨 User Quick-Reply Module (`/api/v1/user-replies`)**
   - Allows authenticated users to input received messages, select an AI tone, generate replies, and send them directly through the platform.

6. **🔌 Real-Time WebSocket Synchronization (Socket.io)**
   - Instant event broadcasting (`email_draft_ready`, `email_replied`, `email_auto_replied`, `email_status_updated`, `email_updated`) keeps connected clients up to date without manual page reloads.
   - Opening an email automatically marks it from `UNREAD` to `READ` and broadcasts the state in real time.

7. **📊 Lightweight Dashboard Analytics (`/api/v1/dashboard`)**
   - Provides instant counters: `totalEmails`, `unreadEmails`, `readEmails`, `autoRepliedEmails`, `repliedEmails`, `totalUsers`, and `isAutoReply`.

8. **🔐 Enterprise-Grade Authentication**
   - JWT access & refresh tokens with secure HTTP-only cookies.
   - Password hashing with Bcrypt.
   - Email verification with direct token link and 6-digit OTP code sent upon registration.
   - Super Admin auto-seeding on first server boot.

---

## 🛠️ Technology Stack

- **Runtime & Language**: Node.js, TypeScript
- **Framework**: Express.js
- **Database**: MongoDB via Mongoose ODM
- **Real-Time Communication**: Socket.io
- **AI Engine**: Ollama (`llama3.2:3b`) over Cloudflare Tunnel
- **Email Delivery & Inbound SMTP**: Resend API & Svix Webhook Verification
- **Security & Validation**: JWT, Bcrypt, Multer (file uploads)

---

## ⚙️ Local Development Setup

### 1. Prerequisites
- **Node.js** (v18.x or v20.x recommended)
- **npm** or **yarn** / **pnpm**
- **MongoDB** (local database or MongoDB Atlas cluster connection string)
- **Resend Account** (API key & verified sending domain)
- **Ollama** (running locally with `ollama run llama3.2:3b` or accessed through Cloudflare Tunnel)

---

### 2. Clone Repository
```bash
git clone https://github.com/apponislam/replypilot-ai-backend.git
cd replypilot-ai-backend
```

---

### 3. Install Dependencies
```bash
npm install
```

---

### 4. Configure Environment Variables
Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Fill in your configuration:

```env
# Server
NODE_ENV=development
PORT=5057
IP=0.0.0.0

# Database
MONGODB_URL=mongodb+srv://<USERNAME>:<PASSWORD>@cluster0.mongodb.net/replypilot-ai?retryWrites=true&w=majority
BCRYPT_SALT_ROUNDS=12

# Client & Server URLs
CLIENT_URL=https://replypilot.apponislam.top
SERVER_URL=https://replypilotapi.apponislam.top

# JWT Secrets
JWT_ACCESS_SECRET=your_jwt_access_secret_key_here
JWT_ACCESS_EXPIRE=30d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_REFRESH_EXPIRE=365d
JWT_PASSWORD_RESET_SECRET=your_password_reset_secret_key_here

# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=replypilotai@apponislam.top
RESEND_WEBHOOK_SECRET=whsec_your_webhook_signing_secret_here

# Ollama AI Configuration (Local or Cloudflare Tunnel)
OLLAMA_HOST=https://ollama.apponislam.top
OLLAMA_MODEL=llama3.2:3b

# Initial Super Admin Seed (Created on first boot)
INITIAL_ADMIN_NAME=Super Admin
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=StrongPassword123!
INITIAL_ADMIN_PHONE=+1234567890
```

---

### 5. Running the Application

#### Development Mode (with hot-reloading):
```bash
npm run dev
```
The server will start on `http://localhost:5057`.

#### Production Build:
```bash
npm run build
npm run start
```

---

## 📡 API Reference Overview

All API routes are prefixed with `/api/v1`.

### 🔐 Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/register` | Register new user (sends email with OTP and link) | No |
| `POST` | `/login` | Log in with email & password | No |
| `GET` | `/verify-email` | Verify email address using query `?token=` or `?email=&otp=` | No |
| `POST` | `/resend-verification` | Resend verification email with new OTP | No |
| `POST` | `/refresh-token` | Refresh expired access token | No |
| `POST` | `/forgot-password` | Request password reset OTP | No |
| `POST` | `/verify-otp` | Verify password reset OTP | No |
| `POST` | `/reset-password` | Reset password using verified OTP | No |
| `GET` | `/me` | Get logged-in user profile | `auth()` |
| `GET` | `/check-email-verified` | Check if current user is verified | `auth()` |
| `POST` | `/logout` | Clear refresh token cookie | `auth()` |
| `PATCH`| `/profile` | Update profile information & image | `auth()` |
| `POST` | `/change-password` | Change account password | `auth()` |

---

### 📩 Inbound Emails & Admin (`/api/v1/email` or `/api/v1/emails`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/webhook` | Resend Svix inbound email webhook listener | Svix Signature |
| `GET` | `/` | List all inbound emails (supports `?page=`, `?limit=`, `?status=`, `?search=`) | `ADMIN` |
| `GET` | `/:id` | Get single email thread (auto-transitions `UNREAD` to `READ`) | `ADMIN` |
| `POST` | `/:id/generate-reply` | On-demand draft generation with custom tone or prompt | `ADMIN` |
| `POST` | `/:id/send-reply` | Send outbound reply via Resend (sets status to `REPLIED`) | `ADMIN` |
| `PATCH`| `/:id/status` | Update email status (`READ`, `ARCHIVED`, etc.) | `ADMIN` |
| `DELETE`| `/:id` | Delete email and threaded replies | `ADMIN` |

---

### ⚙️ User Settings (`/api/v1/settings`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/` | Get current user's AI settings & auto-reply status | `auth()` |
| `PATCH`| `/` | Update user's tone, custom instructions, or auto-reply toggle | `auth()` |

---

### 💬 User Replies (`/api/v1/user-replies`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/generate` | Generate AI reply for incoming text using user's settings | `auth()` |
| `POST` | `/:id/send` | Send the generated reply to recipient via Resend | `auth()` |
| `GET` | `/` | List all user-generated replies | `auth()` |
| `GET` | `/:id` | Get single reply details | `auth()` |
| `DELETE`| `/:id` | Delete generated reply record | `auth()` |

---

### 📊 Dashboard Statistics (`/api/v1/dashboard`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/` | Retrieve summary statistics for workspace metrics | `auth()` |
| `GET` | `/stats` | Alias for statistics endpoint | `auth()` |

---

## 🛡️ License

This project is licensed under the [ISC License](LICENSE).
