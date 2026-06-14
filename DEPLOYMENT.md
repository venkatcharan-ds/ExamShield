# ExamShield — Production Deployment

## Step 1: Backend → Render

**Create a new Web Service on [render.com](https://render.com):**

| Setting | Value |
|---|---|
| Repository | your GitHub repo |
| Root directory | `backend` |
| Runtime | Python 3 |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

After deploy, validate:
```bash
curl https://YOUR-APP.onrender.com/api/health
# Expected: {"status":"ok","model_trained":true,"active_sessions":0,"dashboard_listeners":0}
```

Note your Render URL — you'll need it for the next step.

---

## Step 2: Frontend → Vercel

**Import your GitHub repo on [vercel.com](https://vercel.com):**

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Framework | Next.js |
| Install command | `npm install --legacy-peer-deps` |

**Add environment variables** (Settings → Environment Variables → add for all environments):

```
NEXT_PUBLIC_WS_URL   = wss://YOUR-APP.onrender.com
NEXT_PUBLIC_API_URL  = https://YOUR-APP.onrender.com
```

Redeploy after adding env vars.

---

## Step 3: Production WebSocket validation

```bash
# 1. Health check
curl https://YOUR-APP.onrender.com/api/health

# 2. Open side by side:
open https://YOUR-FRONTEND.vercel.app/dashboard
open https://YOUR-FRONTEND.vercel.app/exam
```

On the dashboard, click **Cheating Candidate**. Expected sequence:
- t=0s: Score 14 (green)
- t=2s: Score 38 (yellow) — tab switch events appear in timeline
- t=4s: Score 67 (yellow) — copy event
- t=6s: Score 89 (RED) — paste event, red glow fires, alert banner slides in
- t=9s: Score 94 (RED) — second paste confirms

---

## Demo script for judges (3 minutes)

**Before the demo:** Open two side-by-side browser windows.
- Left: `/dashboard`
- Right: `/exam`

**Script:**
1. [Dashboard] "This is the invigilator view. Watch the gauge."
2. [Dashboard] Click **Normal Candidate** → "Score stays below 20. No flags."
3. [Dashboard] Click **Suspicious Candidate** → "Long pauses, a tab switch. Score rises to ~52. Yellow."
4. [Dashboard] Click **Cheating Candidate** → Watch the gauge climb to 94.
   - At 89, the red glow fires and the alert banner slides in.
   - Point to the event timeline showing the exact timestamps.
5. [Exam] Switch to right window. "This is what the student sees. No camera. No recording."
6. Type into a text box — switch to dashboard and point to risk pill updating every 3 seconds.

**Key line:** "We don't watch students. We understand how they behave."

---

## Render cold start note

Render free tier spins down after 15 minutes of inactivity. The first request takes ~30 seconds.
For the demo, visit `https://YOUR-APP.onrender.com/api/health` **5 minutes before** presenting
to wake the instance. The demo scenarios are fully client-side and never depend on the backend.
