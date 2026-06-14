<div align="center">

# ExamShield

### Privacy-first AI exam integrity platform

**No camera. No screen recording. No face recognition.**
AI that understands behaviour — not surveillance.

[![FAR AWAY 2026](https://img.shields.io/badge/FAR%20AWAY-2026%20%C2%B7%20Top%20100%20Submission-6366F1?style=for-the-badge)](https://unstop.com)
[![Theme](https://img.shields.io/badge/Theme-Examinations-10B981?style=for-the-badge)](#)
[![Stack](https://img.shields.io/badge/Stack-Next.js%20%2B%20FastAPI%20%2B%20Isolation%20Forest-0D1120?style=for-the-badge)](#)

</div>

---

## The Problem

India had **6 major exam paper leaks in 2024** — NEET, UGC-NET, CSIR-NET, and more. Existing online proctoring responds with more surveillance: webcams, screen recording, face recognition.

These solutions fail because:
- **60% of Indian candidates** lack reliable cameras or stable broadband
- Screen capture creates **privacy liabilities at scale**
- False positives **penalise anxious and disabled students**
- Camera-based systems are **trivially defeated** by printed answer sheets

## Our Solution

ExamShield monitors **how** students behave — not what they do.

> *"We don't watch students. We understand them."*

Using AI-powered behavioral biometrics, we analyse:
- **Keystroke dynamics** — typing speed, inter-key intervals, rhythm variance
- **Mouse entropy** — movement patterns and activity levels
- **Browser signals** — tab visibility, window focus, idle periods
- **Action events** — copy/paste detection

Every 3 seconds, these signals are fused into a **real-time Risk Score (0–100)** — visible to invigilators, invisible to students.

---

## Live Demo

| | URL |
|---|---|
| 🏠 Landing page | https://exam-shield-beta.vercel.app |
| 📝 Student exam | https://exam-shield-beta.vercel.app/exam |
| 📊 Admin dashboard | https://exam-shield-beta.vercel.app/dashboard |
| 🔌 API health | https://examshield-api-production-1e2c.up.railway.app/api/health |

**Demo in 30 seconds:** Open dashboard → click *Cheating Candidate* → watch the gauge climb from 14 → 94 with the red glow firing and alert banner sliding in.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  STUDENT BROWSER                   INVIGILATOR BROWSER              │
│  ┌──────────────────┐              ┌──────────────────────────────┐ │
│  │  Exam Portal      │              │  Admin Dashboard             │ │
│  │  3 Questions      │              │  • Live risk gauge (SVG)     │ │
│  │  Keystroke capture│              │  • Event timeline            │ │
│  │  Mouse tracking   │              │  • Behavioral charts         │ │
│  │  Focus events     │              │  • Red alert on score > 70   │ │
│  └────────┬─────────┘              └──────────────┬───────────────┘ │
└───────────│────────────────────────────────────────│─────────────────┘
            │ WS /ws/{session_id}                    │ WS /ws-dashboard
            │ BehaviorSnapshot every 3s              │ RiskAssessment push
            ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FASTAPI BACKEND  (Railway)                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  WebSocket Hub                                               │    │
│  │  /ws/{session_id} ──► ML Pipeline ──► /ws-dashboard push   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                          │                                          │
│  ┌───────────────────────▼──────────────────────────────────────┐  │
│  │  ExamShield ML Engine (Three-stage pipeline)                 │  │
│  │                                                              │  │
│  │  Stage 1: Isolation Forest (continuous patterns → 0–55)     │  │
│  │    • Trained on 600 synthetic samples, 3 typing profiles    │  │
│  │    • Piecewise linear mapping via training percentile anchors│  │
│  │    • All legitimate typing styles → ML score 0–15           │  │
│  │                                                              │  │
│  │  Stage 2: Rule Boosters (categorical events → 0–84)         │  │
│  │    • 1 tab switch → 35  •  copy + paste → 75               │  │
│  │    • 2 tab switches → 52  •  2+ pastes → 84                │  │
│  │    • 3+ tabs → 62  •  speed > 600kpm → 70+                │  │
│  │                                                              │  │
│  │  Stage 3: Synergy (+10, cap 99)                             │  │
│  │    • Fires when: ML > 35 AND Rule > 60                      │  │
│  │    • Compounding evidence bonus                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────┐                             │
│  │  In-Memory Session Store           │                             │
│  │  • risk_history (last 60 windows) │                             │
│  │  • timeline events (last 30)      │                             │
│  │  • current features               │                             │
│  └────────────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 15, TypeScript | Production-grade, Vercel-native |
| Styling | Tailwind CSS, Framer Motion | Premium dark UI, smooth animations |
| Charts | Recharts | Real-time area chart, no canvas issues |
| Backend | FastAPI, Python 3.12 | Async WS, fast startup, Railway-friendly |
| ML Engine | scikit-learn Isolation Forest | Real anomaly detection, not rule-based |
| Real-time | Native WebSocket (both sides) | Zero library overhead, reliable |
| Deployment | Vercel + Railway | Free tier, instant deploy from GitHub |

---

## AI Engine — Calibration Report

The Isolation Forest is pre-trained at startup on 600 synthetic samples across three legitimate typing profiles:

| Profile | Speed | Key interval | Mouse | Expected ML score |
|---|---|---|---|---|
| Slow thinker | 150 kpm (~30 wpm) | 400ms | Low | 0–12 |
| Average typist | 250 kpm (~50 wpm) | 240ms | Medium | 0–8 |
| Fast typist | 400 kpm (~80 wpm) | 150ms | High | 0–6 |

**Validated end-to-end:**

| Scenario | Expected | Actual score | Level |
|---|---|---|---|
| Normal typing, no events | 0–25 | **7.3** | 🟢 low |
| One tab switch + pause | 30–50 | **35.0** | 🟡 medium |
| Copy + paste + 3 tabs | 80–99 | **94.0** | 🔴 high |

---

## Setup — Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Visit http://localhost:8000/api/health
```

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
cp .env.example .env.local
# .env.local: NEXT_PUBLIC_WS_URL=ws://localhost:8000
npm run dev
# Visit http://localhost:3000
```

---

## Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the complete Vercel + Railway guide including the judge demo script.

**Backend → Railway:**
- Root: `backend/`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Frontend → Vercel:**
- Root: `frontend/`
- Env: `NEXT_PUBLIC_WS_URL=wss://examshield-api-production-1e2c.up.railway.app`

---

## Demo Scenarios (client-side, no backend needed)

| Scenario | Description | Expected score |
|---|---|---|
| 🟢 Normal Candidate | Steady typing, no events | < 20 |
| 🟡 Suspicious Candidate | Long pauses, one tab switch | 35–60 |
| 🔴 Cheating Candidate | Copy-paste, multiple tabs, abnormal speed | 85–95 |

All three scenarios run **entirely client-side** — they work even if the Railway backend is sleeping. This is the demo reliability guarantee.

---

## Repository Structure

```
examshield/
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── exam/page.tsx     # Student exam portal
│   │   ├── dashboard/page.tsx # Admin dashboard
│   │   ├── globals.css       # Design token system + animations
│   │   └── layout.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts   # WS with exponential backoff reconnect
│   │   └── useBehaviorTracker.ts  # All browser event capture
│   ├── services/
│   │   └── demoScenarios.ts  # 3 client-side demo scenario definitions
│   └── types/index.ts        # Shared TypeScript types
│
├── backend/
│   ├── main.py               # FastAPI app entry
│   ├── api/routes.py         # /ws/{id}, /ws-dashboard, REST endpoints
│   ├── ml/isolation_forest.py # Three-stage ML risk engine
│   ├── models/session.py     # In-memory session store
│   └── schemas/events.py     # Pydantic models
│
├── DEPLOYMENT.md             # Vercel + Railway guide + judge demo script
└── README.md                 # This file
```

---

## Built for FAR AWAY 2026

**Theme:** Examinations — Reimagine the future of examinations with secure, fair and intelligent solutions.

**Core thesis:** The Indian examination crisis is not a cheating problem — it is a trust infrastructure problem. ExamShield rebuilds that trust without trading it for surveillance.

**Built in 24 hours.** Every line written during the FAR AWAY window.

---

<div align="center">
<em>ExamShield · FAR AWAY 2026 · India's Biggest International Hackathon</em>
</div>
