# ExamShield — FAR AWAY 2026 Final Submission Checklist

## ✅ Required by FAR AWAY (mandatory)

- [ ] **GitHub Repository** — public, clean commit history (20+ commits over build period)
- [ ] **Project Submission** — Presentation OR Video (see below)
- [ ] **README.md** — present with setup instructions, architecture, demo link
- [ ] **Live demo URL** — paste into Unstop submission form

---

## ✅ GitHub Repository Checklist

- [ ] Repository is **public**
- [ ] All source code committed (no `.env` files, no secrets)
- [ ] `.gitignore` includes: `node_modules/`, `.next/`, `__pycache__/`, `.env*`
- [ ] Commit messages are clean and descriptive (not "fix fix fix")
- [ ] Commit history spans the hackathon period (not a single dump)
- [ ] `README.md` at root level with:
  - [ ] Live demo link
  - [ ] Setup instructions (backend + frontend)
  - [ ] Architecture description
  - [ ] ML engine explanation
  - [ ] Calibration results table

---

## ✅ Deployment Checklist

### Backend (Render)
- [ ] Service deployed and running
- [ ] Health check passes: `GET /api/health → {"status":"ok","model_trained":true}`
- [ ] WebSocket endpoint responsive: `wss://your-app.onrender.com/ws/test`
- [ ] CORS configured (allows all origins for hackathon)
- [ ] Free tier instance is awake (visit health endpoint 5 min before demo)

### Frontend (Vercel)
- [ ] Deployed and accessible at public URL
- [ ] `NEXT_PUBLIC_WS_URL` env var set to `wss://your-render-app.onrender.com`
- [ ] All three pages load: `/`, `/exam`, `/dashboard`
- [ ] No console errors in browser dev tools

---

## ✅ Demo Scenario Verification

Run each scenario and verify the expected outcome:

### 🟢 Normal Candidate
- [ ] Score stays below 25
- [ ] Risk level shows "low" (green dot)
- [ ] No alert banner appears
- [ ] Timeline shows only "Exam session started"

### 🟡 Suspicious Candidate  
- [ ] Score reaches 35–60
- [ ] Risk level shows "medium" (amber dot)
- [ ] Timeline shows tab switch + idle events
- [ ] No red alert banner (threshold is 70+)

### 🔴 Cheating Candidate
- [ ] Score reaches 85–95
- [ ] Risk level shows "high" (red dot + glow animation on card)
- [ ] Alert banner slides in from top
- [ ] Timeline shows: tab switches → copy event → paste event → risk escalation
- [ ] Risk trend chart shows clear upward arc
- [ ] Reset (↺) button returns to clean state

---

## ✅ Presentation Checklist

**Option A: Slide presentation (≤15 slides)**
- [ ] Slide 1: ExamShield + tagline + FAR AWAY badge
- [ ] Problem slide: statistics (6 leaks, 50M students)
- [ ] Solution slide: no camera approach
- [ ] AI engine slide: Isolation Forest + 3-stage pipeline
- [ ] Demo slide: live dashboard screenshot + QR code
- [ ] Calibration slide: before/after score table
- [ ] Tech stack slide
- [ ] Impact/scalability slide
- [ ] Close slide: mission statement + URL
- [ ] File format: PDF or PPTX

**Option B: Demo video (2–5 minutes)**
- [ ] Screen recording of full live demo
- [ ] Voiceover covering: problem → solution → live demo → tech stack
- [ ] Shows normal → suspicious → cheating scenario progression
- [ ] Ends with live URL and call to action
- [ ] File uploaded to Unstop or Google Drive link

---

## ✅ Submission Form (Unstop)

- [ ] GitHub repository URL pasted
- [ ] Live demo URL pasted (`https://examshield-demo.vercel.app`)
- [ ] Presentation/video attached or linked
- [ ] Team details confirmed
- [ ] Submitted before **June 14, 2026 at 11:59 PM IST**

---

## ✅ 5-Minute Pre-Demo Checklist (Day of presentation)

- [ ] Wake backend: `curl https://your-render-app.onrender.com/api/health`
- [ ] Confirm response: `{"status":"ok","model_trained":true}`
- [ ] Open dashboard tab — connection shows "LIVE" or "Demo mode"
- [ ] Run Cheating scenario once end-to-end to verify
- [ ] Reset dashboard to clean state
- [ ] Backup demo video downloaded locally (offline fallback)
- [ ] Presentation open on secondary display or printed notes ready
- [ ] Demo script DEMO_SCRIPT.md reviewed

---

## ✅ Judges Will Ask — Be Ready For

| Question | Your answer |
|---|---|
| "Is the AI real or just rules?" | Three-stage pipeline: ML first detects anomalous patterns, then rules handle categorical events, synergy bonus for compound evidence |
| "What's your false positive rate?" | Normal typist scores 7–12; threshold for suspicious is 31; 20-point buffer for anxious students |
| "Can it be gamed?" | Mimicking perfect human typing patterns while simultaneously copying answers is harder than taking the exam honestly |
| "Why not use a camera?" | 60% of Indian candidates lack reliable cameras/internet; privacy violations at scale; fails poor connectivity |
| "How does it scale?" | Each session is a WebSocket + in-memory object; stateless ML inference; add Redis + PostgreSQL for production scale |
| "Who would pay for this?" | Government exam boards (NTA, UPSC), state PSC boards, private universities — currently paying for Mercer Mettl at ₹500–2000/student |

---

## ⏰ Submission Deadline

**June 14, 2026 at 11:59 PM IST**

Submit at least 1 hour early. Unstop can be slow under peak load.

---

*ExamShield · FAR AWAY 2026 · Examinations Track*
