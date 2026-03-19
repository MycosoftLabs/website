# Deploy Today Checklist — Mar 15, 2026

**Status:** Reference  
**Purpose:** One-time VM setup + merge-to-main so CI/CD deploys.

---

## 1. VM ready (one-time setup)

SSH in manually and run:

```bash
ssh production
mkdir -p /opt/mycosoft/website
cd /opt/mycosoft/website
git clone https://github.com/MycosoftLabs/website.git .
cp /opt/mycosoft/.env .env   # if that env file exists
```

After this, the repo lives at **`/opt/mycosoft/website`** (CI/CD uses this path for pull).

---

## 2. Merge to main

- CI/CD **auto-deploys on push to `main`**.
- Merge your branch into `main` and push (or push `main`).
- GitHub Actions will run: lint → test → build → deploy to production VM.

---

## 3. Verify

- Check the [Actions tab](https://github.com/MycosoftLabs/website/actions) for the run.
- Confirm "Pull latest code" uses `cd /opt/mycosoft/website` (fixed in ci-cd.yml on main).
