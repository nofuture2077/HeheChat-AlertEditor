# CLAUDE.md

## Workflow rules

- Keep changes minimal — touch only what the task requires.
- Base all work on the `release` branch (not `main`).
- For every change, create a new branch off `release`:
  - `feature/<short-name>` for new features
  - `bugfix/<short-name>` for fixes
- Before every commit, run `npm run lint` and `npm run build` — commits must build cleanly and must not add lint errors.
- Never commit `.env` or build output (`dist/`).

## Versioning (required)

Every change must bump `version` in `package.json` (semver, `0.MINOR.PATCH`):

- **Minor** (`0.21.x` → `0.22.0`) for new features (`feat:` commits)
- **Patch** (`0.21.2` → `0.21.3`) for bug fixes and small changes (`fix:` commits)

Bump exactly once per change, in the same commit as the change. Do not touch the major version.

## Commits

Use conventional prefixes, short and lowercase: `feat: ...`, `fix: ...`.

## Project overview

HeheChat-AlertEditor is a standalone single-page app for designing HeheChat alert configs. Built with Vite + React 18 + TypeScript + Mantine v8 (some MUI icons/components). Media conversion runs in the browser with `ffmpeg.wasm`.

Package manager: **npm** (`package-lock.json`).

## System overview

HeheChat consists of three projects that are developed side by side (sibling folders under `~/Development`):

| Project | Folder | Role |
| --- | --- | --- |
| **HeheChat** (frontend) | `HeheChat/` | Vite + React app: multi-channel Twitch chat for streamers/mods, admin dashboard, OBS browser sources (alerts, chat overlay), alert replay, scene switcher |
| **HeheServer** (backend) | `HeheServer/` | Node.js/Express + `ws` server: Twitch auth, chat/EventSub ingestion, alert pipeline, profiles, premium, analytics, TTS, integrations; PostgreSQL storage |
| **HeheChat-AlertEditor** | `HeheChat-AlertEditor/` | Standalone Vite + React app to design alert configs (media, text, TTS, conditions) and import StreamElements overlays |

How they talk to each other:

- All frontends call the backend over HTTP at `VITE_BACKEND_URL`. The backend allows these origins via CORS (`FRONTEND_ORIGIN`, `BROWSERSOURCE_ORIGIN`, `EDITOR_ORIGIN`, `REPLAY_ORIGIN`, `ADMIN_ORIGIN`, `PROMO_ORIGIN`).
- Live data (chat messages, events, alerts, profile updates, OBS commands) flows from the backend to clients over a single WebSocket server. Inside the backend, modules publish to PubSub.js topics (`WS-<channel>`, `SINK-<token>`, `PROFILE-<id>`, ...) and `HeheServer/src/websocket.js` forwards them to subscribed sockets.
- The chat app opens the alert editor via `VITE_EDITOR_URL?token=<editor token>`. The editor loads and saves the alert config through `/event/config/*` and fetches the sink via `/sink/get`.
- The alert browser source (`alert.html` in HeheChat, URL `VITE_SINK_URL#token=<sink>`) connects to the WebSocket with its sink token and plays the alerts the backend publishes to `SINK-<token>`. The editor embeds it in preview mode (`&preview=true&embed=true`) and triggers test alerts via `/event/replay`.

Changes that touch an HTTP endpoint or a WebSocket message type usually require matching changes in the other project(s) — check both sides.

## Architecture overview (AlertEditor)

### Startup and backend access

- [src/main.tsx](src/main.tsx) → [src/App.tsx](src/App.tsx). Without a `?token=` query parameter only the landing page ([src/pages/Home.page.tsx](src/pages/Home.page.tsx)) is shown.
- With a token, `App.tsx` loads everything from the backend (`VITE_BACKEND_URL`): the alert config (`/event/config/get`), the sink (`/sink/get`), premium status (`/premium/status`) and the TTS voices (`/tts/ai/voices`, `/tts/voices`). Saving posts the full config to `/event/config/set/:token` and a copy without files to `/event/config/meta/:token`; test alerts go to `/event/replay`.
- All backend calls live in `App.tsx` (plus TTS preview in `components/helper.ts`) and are exposed through `AppContext` ([src/ApplicationContext.tsx](src/ApplicationContext.tsx)): `alertConfig`, `setAlertConfig` (updates `meta.lastUpdate` and the SHA-256 `meta.hash`), `uploadAlertConfig`, `replayEvent`, `sink`, voices, `isPremium`. No other state library.

### Components ([src/components/](src/components/))

- `AlertEditor.tsx` — main screen: list of alerts, add/import/export, save, preview and StreamElements import entry points
- `AlertConfigurator.tsx` — form for a single alert (event type and conditions, image/video/audio, text and styling, TTS, volume, timing)
- `types.ts` — the alert config data model (`EventAlertConfig`, `EventAlert`, event types, `getAlert` matching logic). Must stay compatible with the backend (`HeheServer/src/modules/event/event.js`) and the alert browser source in HeheChat.
- `DefaultVoiceEditor.tsx`, `TTSReplacementsEditor.tsx` — default TTS voice and text replacement rules
- `DropZone.tsx`, `FileLoader.tsx`, `FileSaver.tsx`, `FilePreviewModal.tsx`, `ImportConfigModal.tsx` — media upload, JSON import/export of configs
- `media.ts`, `useFileOptimizer.ts` — format detection and ffmpeg.wasm conversion/optimization (webp/webm/mp3, loudness normalization, max width); files are stored base64-encoded in the config
- `preview/` — live preview: `OverlayPreviewFrame.tsx` embeds the HeheChat alert browser source (`VITE_SINK_URL`) in an iframe, `buildPreview.ts` builds sample events (incl. hype train, currencies, localized texts)
- `PreviewModal.tsx` — opens/sends alerts to the real overlay
- `converter/` — StreamElements import: `seApi.ts` (StreamElements API), `SourcePicker.tsx`, `StreamElementsImportModal.tsx`, `mapping.ts` / `convert.ts` / `style.ts` (map SE widgets to HeheChat alerts)
- `helper.ts` — hashing, base64, formatting, TTS preview

### Other folders

- `data/` — local (git-ignored) sample alert configs and StreamElements exports for manual testing
- [public/manifest.json](public/manifest.json) — PWA manifest; the build injects the package version (see [vite.config.mjs](vite.config.mjs))
- [test-utils/](test-utils/), [vitest.setup.mjs](vitest.setup.mjs) — testing helpers (no tests or vitest script yet)

## Commands

- `npm run dev` – start dev server (Vite, HTTPS via mkcert)
- `npm run build` – typecheck (`tsc`) and build
- `npm run lint` – ESLint (currently fails to start because `eslint-config-mantine`, referenced in [.eslintrc.cjs](.eslintrc.cjs), is not installed)
- `npm run preview` – preview the production build
