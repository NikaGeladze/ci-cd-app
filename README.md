# CI/CD Demo App

A lightweight Node.js/Express REST API with an automated CI/CD pipeline using **GitHub Actions** and **Render**. Every push to `main` is automatically tested, and — only if all tests pass — deployed to production.

---

## Live Application

> **https://ci-cd-app-7z2h.onrender.com/api/health**

---

## Screenshots

### Hosted Application
<img width="582" height="140" alt="image" src="https://github.com/user-attachments/assets/e0f99f29-2b61-4f4b-9a36-3404c73822f9" />


### Successful GitHub Actions Run
<img width="1022" height="482" alt="image" src="https://github.com/user-attachments/assets/ad66c1cc-f692-45ad-a9ec-5ceba8f206b6" />

*CI stage runs tests on Node 18 and 20 in parallel. CD stage triggers only after both matrix jobs pass.*

### Blocked Deployment (Failing Tests)
<img width="1002" height="762" alt="image" src="https://github.com/user-attachments/assets/06638d53-7167-4c5f-813f-795784d8aa3b" />

*When tests fail, the deploy job is skipped. Broken code never reaches production.*

### Test Scenario
I changed HTTP return status from ok to OK,thats why test failed and it never deployed to render,then i adjusted my test cases pushed again and it deployed,thus proving effectivnes of this CI/CD project.
---

## Pipeline Description

The pipeline is defined in `.github/workflows/main.yml` and consists of two sequential stages:

```
Push to main
     │
     ▼
┌────────────────────────────┐
│  STAGE 1 — CI (Test)       │  Runs on: push / pull_request
│  • npm ci                  │  Matrix: Node 18.x + 20.x
│  • npm test (Jest)         │
│  • Upload coverage artifact│
└────────────┬───────────────┘
             │  PASS on ALL matrix jobs?
             │
       YES ──┴──► NO → Pipeline stops. Deploy is skipped.
             │
             ▼
┌────────────────────────────┐
│  STAGE 2 — CD (Deploy)     │  Only on: push to main
│  • curl Render Deploy Hook │
│  • Render pulls latest     │
│    commit & restarts       │
└────────────────────────────┘
```

**Key rule:** The `deploy` job declares `needs: test`. GitHub Actions will not start the deploy job unless every job listed in `needs` succeeded. A single failing test in any Node version stops deployment completely.

### Trigger Conditions

| Event | CI runs? | CD runs? |
|---|---|---|
| Push to `main` | Yes | Yes (if CI passes) |
| Push to `develop` | Yes | No |
| Pull request to `main` | Yes | No |

---

## Project Structure

```
cicd-demo-app/
├── .github/
│   └── workflows/
│       └── main.yml          # CI/CD pipeline definition
├── public/
│   └── index.html            # Frontend UI
├── src/
│   ├── app.js                # Express app (routes, logic)
│   └── server.js             # HTTP server entry point
├── tests/
│   └── app.test.js           # Jest test suite (supertest)
├── .gitignore
├── package.json
└── README.md
```

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Returns `{ status: "ok", version, timestamp }` |
| `GET` | `/api/greet/:name` | Returns a greeting for the given name |
| `GET` | `/api/add?a=&b=` | Returns the sum of two query parameters |

---

## Update Strategy: Rolling Update (via Render)

### Strategy Chosen: Rolling Update

A **Rolling Update** replaces the old version of the application incrementally rather than all at once, or spinning up a completely separate environment. Render's free tier implements this natively: when a new deployment is triggered, Render starts the new container, waits for it to pass its health check, and then routes traffic to it — all without manual intervention.

### Why Rolling Update?

| Factor | Reasoning |
|---|---|
| **Free-tier constraints** | Blue-Green and Canary require running two live environments simultaneously, which is not possible on Render's free tier. |
| **Zero-downtime** | Rolling update keeps the old instance alive until the new one is healthy, so users see no outage. |
| **Simplicity** | No external load balancer, feature flags, or traffic-splitting infrastructure needed. |
| **Sufficient for this project** | The app is stateless — no sessions, no database migrations — making rolling perfectly safe. |

### How It Was Implemented

1. **Render service** is created with the repository connected (`cicd-demo-app` web service, Node runtime).
2. A **Deploy Hook URL** is generated in Render → Service Settings → Deploy Hooks.
3. The URL is stored as a **GitHub Actions secret** named `RENDER_DEPLOY_HOOK_URL`.
4. The `deploy` job in the pipeline fires a `curl POST` to this hook URL after tests pass.
5. Render then pulls the latest `main` commit, builds, and performs a rolling restart automatically.

The pipeline enforces safety with the `needs: test` gate — no broken code can ever trigger the hook.

---

## Rollback Guide

If a bug is discovered in production after a deployment, follow these steps to revert:

### Option A — Rollback via the Render Dashboard (Fastest)

1. Log in to [https://dashboard.render.com](https://dashboard.render.com).
2. Select your service (`cicd-demo-app`).
3. Click the **"Deploys"** tab in the left sidebar.
4. Find the last known-good deployment (look for the green ✓ and the commit message/SHA before the bad one).
5. Click the **three-dot menu (⋮)** on that deployment row.
6. Select **"Rollback to this deploy"**.
7. Render will immediately redeploy that exact build. No code changes needed.

> Time to restore: approximately 1–2 minutes.

### Option B — Git Revert + Push (Auditable)

Use this approach when you want a full audit trail in Git history.

```bash
# 1. Identify the bad commit SHA
git log --oneline -5

# 2. Revert it (creates a new commit that undoes the change)
git revert <bad-commit-sha> --no-edit

# 3. Push to main — this triggers the full CI/CD pipeline
git push origin main
```

The pipeline will run tests on the reverted code. If they pass, the rollback is deployed automatically. If the revert itself breaks tests, it is blocked — preventing a bad rollback from reaching production.

### Option C — Emergency: Force redeploy a specific commit

```bash
# Hard-reset main to a known-good SHA (destructive — coordinate with your team)
git checkout main
git reset --hard <known-good-sha>
git push origin main --force

# Or: trigger Render's deploy hook manually for that commit via the dashboard
```

### Rollback Decision Matrix

| Scenario | Recommended Option |
|---|---|
| Bug found minutes after deploy | Option A (Render Dashboard) |
| Need audit trail / compliance | Option B (git revert) |
| Critical outage, no time | Option A |
| Reverted code itself has issues | Option B (pipeline catches it) |

---

## Local Setup

```bash
git clone https://github.com/YOUR_USERNAME/cicd-demo-app.git
cd cicd-demo-app
npm install
npm test        # Run the test suite
npm start       # Start on http://localhost:3000
```

---

## Setting Up the Pipeline (for reproducibility)

1. **Fork / clone** this repository to your GitHub account.
2. **Create a Render Web Service** — connect your GitHub repo, set start command to `npm start`, Node runtime.
3. In Render: **Settings → Deploy Hooks → Create Hook** — copy the URL.
4. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: the URL copied from Render
5. Push any commit to `main` and watch the Actions tab — tests run first, then deployment fires automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Testing | Jest + Supertest |
| CI/CD | GitHub Actions |
| Hosting | Render (free tier) |
| Strategy | Rolling Update |
