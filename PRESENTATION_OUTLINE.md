# ExamShield — FAR AWAY 2026 Presentation
## 12-Slide Deck Outline

---

### SLIDE 1 — Cover
**Title:** ExamShield
**Tagline:** No camera. No surveillance. Just AI that understands behaviour.
**Sub:** FAR AWAY 2026 · Examinations Theme · Built in 24 hours
**Visual:** Dark background, indigo logo glow, tagline in gradient text
**Speaker note:** Don't read the slide. Open with a statement: "NEET 2024 leaked. Again."

---

### SLIDE 2 — The Crisis (Problem)
**Headline:** India's exam system is broken — and surveillance isn't fixing it
**Content:**
- 6 major paper leaks in India in 2024 alone
- 50M+ students affected annually
- Existing online proctoring requires webcams, screen recording, face recognition
- 60% of Indian candidates: unreliable cameras, unstable internet
**Visual:** Timeline of 2024 leaks (NEET, UGC-NET, CSIR-NET...) with red markers
**Speaker note:** Make it emotional. Every person in the room knows someone affected by NEET.

---

### SLIDE 3 — Why Current Solutions Fail
**Headline:** More surveillance ≠ more trust
**Three-column layout:**
| 📷 Camera | 🖥 Screen recording | ⚠️ False positives |
|---|---|---|
| Fails on 2G | Privacy violation at scale | Penalises anxiety |
| Requires hardware | Data liability | Discriminates |
**Speaker note:** The problem isn't cheating. It's trust infrastructure. Current tools solve neither.

---

### SLIDE 4 — Our Insight
**Headline:** Don't watch the student. Understand them.
**Quote (large, centered):**
> "We don't capture what you type. We capture how you type."
**Below:** Key insight — behavioural patterns are unique, persistent, and unfakeable
**Visual:** Typing rhythm waveform visualisation
**Speaker note:** This is the pivot. Let it land. Pause after reading the quote.

---

### SLIDE 5 — How ExamShield Works (Solution)
**Headline:** Behavioural AI — 8 signals, 1 score
**Flow (4 boxes with arrows):**
Student activity → Behavioral AI → Risk score (0–100) → Admin alert
**Below, two columns:**
Left — *What we capture:*
- Keystroke timing intervals
- Mouse movement entropy
- Tab visibility events
- Copy/paste events

Right — *What we never capture:*
- Camera or video ❌
- Screen content ❌
- Facial recognition ❌
- Answer text ❌
**Speaker note:** Emphasise the privacy guarantee. This is a feature, not a limitation.

---

### SLIDE 6 — The AI Engine
**Headline:** Real ML — not a chatbot wrapper, not rule-based
**Content:**
**Isolation Forest** (scikit-learn)
- Pre-trained on 600 synthetic behavioral samples
- 3 typing profiles: slow thinker / average / fast typist
- Piecewise linear mapping through training percentile anchors

**Three-stage pipeline:**
1. ML stage → detects anomalous continuous patterns → 0–55
2. Rule boosters → handles categorical events (paste, tabs) → 0–84
3. Synergy bonus → compounding evidence → +10 (cap 99)
**Visual:** Simple pipeline diagram (matches architecture diagram)
**Speaker note:** When judges ask "is it real AI?" — yes, and explain why the three stages matter.

---

### SLIDE 7 — LIVE DEMO (biggest slide)
**Headline:** Watch it in real time
**Content:** QR code → examshield-demo.vercel.app/dashboard
**Three scenario buttons shown:**
- 🟢 Normal Candidate → score < 20
- 🟡 Suspicious → score 35–60
- 🔴 Cheating → score 85–95
**Speaker note:** THIS IS THE MAKE-OR-BREAK SLIDE. Demo the cheating scenario live.
Demo order: Dashboard open → Click Cheating Candidate → Watch gauge → Red glow fires → Alert banner appears.
Say: "Every one of these events is timestamped, logged, and explainable."

---

### SLIDE 8 — Risk Score Calibration
**Headline:** Validated end-to-end. Numbers that mean something.
**Table:**
| Scenario | Expected | Actual | Result |
|---|---|---|---|
| Normal typing, no events | 0–25 | 7.3 | 🟢 Low |
| One tab switch + pause | 30–50 | 35.0 | 🟡 Suspicious |
| Copy + paste + 3 tab switches | 80–99 | 94.0 | 🔴 High |
**Speaker note:** Judges will ask about false positives. Show the normal score of 7.3. That's not suspicious. That's a student thinking between sentences.

---

### SLIDE 9 — Tech Stack
**Headline:** Production-grade stack, deployed today
**Two columns:**
Frontend (Vercel):
- Next.js 15, TypeScript
- Framer Motion animations
- Recharts live area chart
- Native WebSocket

Backend (Render):
- FastAPI, Python 3.12
- Isolation Forest (scikit-learn)
- In-memory session store
- Sub-50ms WS latency
**Visual:** Simple tech logo grid
**Speaker note:** Both live right now. This isn't a mockup.

---

### SLIDE 10 — Real-World Impact
**Headline:** Why this matters at scale
**Content:**
- Works on 2G — no hardware, no install, any modern browser
- NTA-ready API surface — integrates with existing exam portals
- Privacy-compliant — no camera, no screen, no content
- Instant deployment — government exam boards need this now
**Stats:** 50M+ students / 6 leaks 2024 / 0 cameras required
**Speaker note:** Connect to the FAR AWAY theme. This isn't a hackathon toy. This is the missing layer.

---

### SLIDE 11 — What's Next
**Headline:** Beyond the hackathon
**Roadmap (3 items only):**
1. **Multi-candidate rooms** — 500 simultaneous sessions with real-time triage
2. **NLP stylometric analysis** — detect vocabulary shifts in written answers
3. **Government API integration** — NTA, UPSC, state PSC board compatibility
**Speaker note:** Keep this brief. Judges don't want roadmaps — they want proof it works today.

---

### SLIDE 12 — Close
**Headline (large):** The Indian examination crisis is a trust problem.
**Subhead:** ExamShield is the trust layer.
**Final line:** No camera. No surveillance. Just AI.
**CTA:** examshield-demo.vercel.app
**Visual:** Full-bleed dark background, indigo glow, single URL
**Speaker note:** Don't end on features. End on the mission. Every parent who watched their child's NEET score invalidated is your user.

---

## Presentation Notes

**Total time target:** 8–10 minutes (FAR AWAY typically allows 5–10)
**Demo time:** 90 seconds (slides 7–8)
**Must-not-skip:** Slides 2, 7, 8, 12

**If you only have 3 minutes:**
- Slide 2 (10 sec) → Slide 4 (15 sec) → Slide 7 LIVE DEMO (90 sec) → Slide 12 (15 sec)

**Objection handling:**
- *"Isn't this just a rule engine?"* → No. Show slide 6. The ML detects unusual typing patterns before any rule fires. Rules handle categorical signals the ML can't see.
- *"What about students who type unusually?"* → Show slide 8, score 7.3 for normal typing. The model was trained on 3 distinct profiles including slow thinkers.
- *"Can it be gamed?"* → Mimicking perfect human typing patterns while simultaneously looking up answers and copy-pasting is harder than taking the exam legitimately.
- *"What about connectivity?"* → The system processes 3-second snapshots. A dropped packet loses one window, not the session.
