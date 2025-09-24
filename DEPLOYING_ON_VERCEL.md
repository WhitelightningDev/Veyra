Deploying this monorepo on Vercel

Overview
- apps/web: Next.js 15 app (recommended to deploy)
- apps/docs: Next.js 15 app (optional)
- apps/mobile: Expo app — can export a static Web build for Vercel (optional)
- packages/*: shared packages (TS configs, UI, core-obd)

Prereqs
- Vercel account and CLI installed (`npm i -g vercel`)
- GitHub/GitLab/Bitbucket repo connected, or use `vercel link`

Monorepo projects
Create one Vercel Project per app you want to host:

1) Web (apps/web)
- Root Directory: apps/web
- Framework Preset: Next.js
- Build Command: (leave default) `next build`
- Install Command: (leave default) Vercel auto-detects workspaces and installs at repo root
- Output: .next (default)

2) Docs (apps/docs) [optional]
- Root Directory: apps/docs
- Framework Preset: Next.js
- Same defaults as Web

3) Mobile Web (apps/mobile) [optional]
This exports a static web build of the Expo app.
- Root Directory: apps/mobile
- Framework Preset: Other
- Build Command: `npm run vercel-build`
- Install Command: `npm install`
- Output: `dist`

Notes
- We configured `outputFileTracingRoot` in both Next.js apps to silence monorepo warnings on Vercel.
- Mobile `vercel.json` sets the output directory and build command. The export is static and does not require a Node runtime.
- Turborepo is already configured; Vercel will leverage remote caching automatically when enabled on the project.

CLI quickstart
Run from repo root:

1) Web
```sh
vercel link # choose apps/web as Root Directory when prompted
vercel --prod
```

2) Docs
```sh
vercel link # choose apps/docs
vercel --prod
```

3) Mobile (Web)
```sh
vercel link # choose apps/mobile
vercel --prod
```

Troubleshooting
- If Vercel installs in the app subfolder only, set “Install Command” to `npm install` so dependencies are installed from the workspace root.
- If you see “inferred workspace root” warnings, they are harmless. We set `outputFileTracingRoot` to the monorepo root to optimize tracing.
- For Expo Web export failures, ensure Expo can run in CI: Node 18+, and that bundling succeeds locally with `npm run -w mobile build:web`.

