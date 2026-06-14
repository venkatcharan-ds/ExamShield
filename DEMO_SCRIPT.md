# ExamShield — 90-Second Judge Demo Script

## Pre-demo setup (do this 5 minutes before)
1. Wake Render backend: `curl https://examshield-api.onrender.com/api/health`
2. Open Tab A: `https://examshield-demo.vercel.app/dashboard`
3. Open Tab B: `https://examshield-demo.vercel.app/exam`  
   (Keep Tab B visible but behind — you'll switch to it at the end)
4. Confirm dashboard shows "Demo mode" or "LIVE" badge in the top bar
5. Have backup demo video ready if anything goes wrong

---

## The Script

### [0:00 – 0:12] — The hook
*Switch to dashboard. Point at the screen.*

> "India had six major exam paper leaks in 2024. Every existing solution responds with more cameras. We went a different direction."

---

### [0:12 – 0:25] — Show the clean state
*Dashboard is empty. Point at the gauge showing zero.*

> "This is the invigilator view. The gauge shows risk in real time — zero to one hundred. Right now there's no active session. Let me start one."

---

### [0:25 – 0:45] — Run Normal scenario
*Click **Normal Candidate** on the right panel. Watch gauge.*

> "Normal student. Average typing speed, no suspicious events. Risk stays below 20. Green. This is what most of your students look like."

*Wait for the scenario to play out — score settles around 7–12.*

> "Fourteen. Well within the safe zone. No alerts."

---

### [0:45 – 1:05] — Reset and run Cheating scenario
*Click the reset button (↺). Then click **Cheating Candidate**.*

> "Now let's watch what happens when someone tries to cheat."

*The gauge starts climbing. Watch timestamps on the timeline panel.*

*At ~2s, yellow zone:*
> "Tab switches. The student left the exam window twice."

*At ~4s, red zone fires:*
> "Copy-paste. A block of text just appeared in the answer field. The risk hits 89..."

*Red glow fires on the card, alert banner slides down:*
> "And the alert fires. Timestamped to the second. Every event in the timeline is a piece of evidence."

*Score reaches 94.*

> "Ninety-four."

---

### [1:05 – 1:20] — Show what the student sees
*Switch to Tab B — the exam portal.*

> "This is what the student sees. Three questions, a text area. No camera permission was requested. No screen recording. The student never knew their behaviour was being analysed."

*Point at the header bar where the risk pill is visible.*

> "The risk score updates in the student's header — not visible to them, but it mirrors the dashboard in real time."

---

### [1:20 – 1:30] — Close
*Switch back to dashboard.*

> "We don't watch students. We understand how they behave. That's ExamShield."

*Point at the URL.*

> "It's live right now. Anyone with a phone can open it."

---

## If the live demo fails

1. **Backend cold start / timeout**: Say "let me pull up the recorded session" and open the backup video. Don't apologise extensively — just pivot.

2. **WebSocket disconnect**: The demo scenarios are 100% client-side. The scenarios still run even if the backend is unreachable. Say "backend connection is warming up — watch the demo scenarios work immediately."

3. **Score doesn't reach red**: Check if a previous scenario is still in state. Click reset (↺) first, then rerun Cheating.

4. **Alert banner doesn't appear**: The alert fires only once per scenario run (dismissed state persists). Reset and rerun.

---

## Key lines to memorise (in order of importance)

1. *"We don't watch students. We understand how they behave."*
2. *"No camera. No screen recording. No face recognition."*
3. *"Every event in the timeline is timestamped and explainable."*
4. *"Ninety-four."* (let the number land)

---

## If a judge asks a hard question during the demo

**"Is the AI actually doing anything, or is it just rules?"**
> "Both work together. The Isolation Forest detects unusual typing patterns in the continuous signal — things like rhythm breaking, abnormal key intervals, sudden idle. The rules handle categorical events that feature values can't capture, like paste events. Without the ML layer, you'd miss the behavioral anomalies that happen before someone pastes."

**"What's your false positive rate?"**
> "In our calibration, a normal student typing naturally scores 7–12. The suspicious threshold is 31. There's 20 points of headroom. An anxious student who types nervously might hit 18–22 — still green. The system only flags genuine anomalies in combination, not individual hesitations."

**"How does this work without a webcam?"**
> "The browser captures keystroke timestamps and mouse activity counts — not content, not video, not screen data. It's less than 1KB per 3-second window. No special permissions required."
