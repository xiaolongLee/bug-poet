# Implementation Plan — Bug 诗人 (Bug Poet)

Greenfield project. All files are net-new. Implementation order follows dependency: scaffolding → backend → frontend core → frontend UI → tests → wiring.

---

- [ ] 1. Scaffold root workspace
      Create root `package.json` with workspaces `["frontend","backend"]` and convenience scripts `dev:frontend`, `dev:backend`, `dev` (concurrently). Create `README.md`.
      Files: `/Users/lndu/Documents/BugPoet/package.json`, `/Users/lndu/Documents/BugPoet/README.md`
      Verify: `node -e "require('./package.json')"` exits 0.

- [ ] 2. Scaffold backend (Node.js + Express + TypeScript)
      Run `npm init -y` in `backend/`, install dependencies: `express cors dotenv openai express-rate-limit`. Install devDeps: `typescript @types/express @types/node @types/cors ts-node-dev`. Create `tsconfig.json` targeting ES2020/CommonJS with `src` as rootDir and `dist` as outDir. Add `build` script (`tsc`) and `dev` script (`ts-node-dev --respawn src/index.ts`). Create `backend/.env.example` with `OPENAI_API_KEY=`, `OPENAI_BASE_URL=https://api.openai.com/v1`, `PORT=3001`, `MODEL_NAME=gpt-4o-mini`.
      Files: `backend/package.json`, `backend/tsconfig.json`, `backend/.env.example`
      Verify: `cd backend && npm run build` — exits 0, `dist/` appears.

- [ ] 3. Implement backend rate-limit middleware
      Create `backend/src/middleware/rateLimit.ts`. Use `express-rate-limit` with `windowMs: 60_000`, `max: 10`, `standardHeaders: true`, `legacyHeaders: false`. Export as `rateLimitMiddleware`.
      Files: `backend/src/middleware/rateLimit.ts`
      Verify: `cd backend && npm run build` — no TS errors.

- [ ] 4. Implement LLM service with validation + retry
      Create `backend/src/services/llm.ts`. Key implementation details:
      - Import `OpenAI` from `openai`, instantiate with `process.env.OPENAI_API_KEY` and `baseURL: process.env.OPENAI_BASE_URL`.
      - System prompt (hardcode as const): `你是一位见过无数 bug 的古典诗人，要用诗意表达技术错误，但必须让懂技术的人一眼看出你在说哪类 bug。只输出 JSON：{ "title": "...", "poem": ["句1","句2",...], "note": "..." }，严格遵守所选诗体的句数、字数要求，意象与报错类型相关。`
      - Map `poetryType` to format constraint string injected into user prompt: 七言绝句→"恰好4句，每句7个汉字", 五言绝句→"恰好4句，每句5个汉字", 俳句→"恰好3行，字数依次约为5/7/5", 宋词小令→"选一词牌，遵守词牌格律", 现代诗→"4~8行，自由格律"
      - Call `openai.chat.completions.create` with `model`, `temperature: 0.9`, `max_tokens: 300`, wrapped in `Promise.race` with a 10-second `setTimeout` reject for timeout.
      - Parse JSON from response content (strip markdown fences if present).
      - Validation function `validatePoem(poem: string[], type: string): string | null` returns error message or null: 七言绝句 → 4 lines, each 7 CJK chars; 五言绝句 → 4 lines, each 5 CJK chars; 俳句 → 3 lines. Count only CJK characters (`/[\u4e00-\u9fff]/g`).
      - Main export `generatePoem(errorText, poetryType)`: try → validate → if invalid, build retry prompt with failure reason → retry up to 2 times → after 2 retries still invalid, return result marked `isFreeForm: true`.
      - Fallback poem const array (at least 3 poems by type) returned on any unrecoverable error.
      Files: `backend/src/services/llm.ts`
      Verify: `cd backend && npm run build` — no TS errors.

- [ ] 5. Implement poem route
      Create `backend/src/routes/poem.ts`. POST `/api/poem` handler: read `errorText` and `poetryType` from `req.body`. Truncation: if `errorText.length > 5000` take first 2000 + last 1000 chars (with a separator `\n...[已截断]...\n`). Call `generatePoem`. Return `{ title, poem, note, isFreeForm, score }` — score is not computed server-side, just pass through `undefined`; the frontend computes it. On LLM error return 200 with `{ fallback: true, ...fallbackPoem, message: "诗人今天罢工了" }`.
      Files: `backend/src/routes/poem.ts`
      Verify: `cd backend && npm run build` — no TS errors.

- [ ] 6. Implement backend entry point
      Create `backend/src/index.ts`. Load `dotenv/config`. Create Express app. Apply `cors({ origin: "*" })`, `express.json()`, and `rateLimitMiddleware` globally. Mount poem router at `/api`. Start listening on `process.env.PORT ?? 3001`. Log `Bug诗人后端启动于 http://localhost:{PORT}`.
      Files: `backend/src/index.ts`
      Verify: `cd backend && npm run build` — `dist/index.js` exists; `node dist/index.js` starts without crash (CTRL+C after).

- [ ] 7. Scaffold frontend (React + TypeScript + Vite)
      Run `npm create vite@latest frontend -- --template react-ts` inside `BugPoet/` (or manually create equivalent: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`). Install extra deps: `html2canvas`. Install devDeps: `vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom`. Add `test` script `vitest run`, add Vite proxy: `server.proxy['/api'] = { target: 'http://localhost:3001', changeOrigin: true }`. Add `VITE_API_BASE_URL` env var support in `vite.config.ts`.
      Files: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/index.html`, `frontend/src/main.tsx`
      Verify: `cd frontend && npm run build` — `dist/` appears.

- [ ] 8. Implement `aestheticScore.ts` pure function
      Create `frontend/src/utils/aestheticScore.ts`. Algorithm (pure, no side effects):
      ```
      function countStackLines(text): number — count lines matching /^\s+at | File "| line \d+|\tat /
      function hasRepeatedLines(text): boolean — any line appearing ≥3 times
      export function calcAestheticScore(errorText: string): number:
        let score = 0
        score += Math.min(40, Math.floor(errorText.length / 50))   // length: up to 40
        score += Math.min(30, countStackLines(errorText) * 2)       // stack depth: 2pts/line up to 30
        if (hasRepeatedLines(errorText)) score += 10                // repeated lines
        if (/Error|Exception/i.test(errorText)) score += 10        // error keyword
        if (/fatal|crash|segfault|SIGSEGV|killed/i.test(errorText)) score += 15  // fatal
        if (/warning/i.test(errorText)) score -= 5                 // warning penalty
        return Math.max(0, Math.min(100, score))
      export function getScoreLabel(score: number): string:
        if (score <= 30) return "小病呻吟"
        if (score <= 70) return "黯然神伤"
        return "肝肠寸断"
      ```
      Export both functions. No imports.
      Files: `frontend/src/utils/aestheticScore.ts`
      Verify: `cd frontend && npx vitest run src/__tests__/aestheticScore.test.ts` — all tests pass.

- [ ] 9. Implement `bugParser.ts` utility
      Create `frontend/src/utils/bugParser.ts`. Export `parseBugLocation(errorText: string): { filename: string | null, line: number | null }`. Try multiple patterns in order:
      1. `at .* \((.+):(\d+):\d+\)` — JS stack frame
      2. `File "(.+)", line (\d+)` — Python
      3. `(.+\.(?:java|cpp|c|go|rs|rb|php)):(\d+)` — generic file:line
      Return first match found, or `{ filename: null, line: null }`.
      Files: `frontend/src/utils/bugParser.ts`
      Verify: used in PoemDisplay; compile check via `cd frontend && npm run build`.

- [ ] 10. Implement `localStorage.ts` utility
      Create `frontend/src/utils/localStorage.ts`. Key: `bugPoetHistory`. Define interface `HistoryEntry { id: string, title: string, poem: string[], note: string, poetryType: string, score: number, label: string, date: string, isFreeForm?: boolean }`. Export `savePoem(entry)`: read array, prepend, keep latest 50, stringify back. Export `getHistory(): HistoryEntry[]`: parse or return `[]`. Export `clearHistory()`.
      Files: `frontend/src/utils/localStorage.ts`
      Verify: compile check via `cd frontend && npm run build`.

- [ ] 11. Write vitest unit tests for `aestheticScore.ts`
      Create `frontend/src/__tests__/aestheticScore.test.ts`. Test cases:
      - Empty string → 0
      - Short warning-only → score 0 (floored) or below 30 label "小病呻吟"
      - Short text with "Error" keyword → score includes +10
      - Long text (>2000 chars) → length component capped at 40
      - Stack trace with 15 stack lines → stack component = 30
      - "fatal" keyword → +15
      - repeated lines (3×) → +10
      - Score ≤30 → label "小病呻吟"; 31-70 → "黯然神伤"; 71-100 → "肝肠寸断"
      - Score always 0-100 (never negative, never >100)
      Use `describe/it/expect` from vitest.
      Files: `frontend/src/__tests__/aestheticScore.test.ts`
      Verify: `cd frontend && npx vitest run` — all tests pass.

- [ ] 12. Implement `PoetryTypeSelector.tsx` component
      Create `frontend/src/components/PoetryTypeSelector.tsx`. Props: `{ value: string, onChange: (v: string) => void }`. Render 5 radio-button-style tabs (styled as ink brushstrokes or bordered boxes): 七言绝句, 五言绝句, 俳句, 宋词（小令）, 现代诗. Default selection passed via `value`. Apply selected CSS class for active state. Fully accessible (`role="radiogroup"`, `aria-checked`).
      Files: `frontend/src/components/PoetryTypeSelector.tsx`
      Verify: compile check via `cd frontend && npm run build`.

- [ ] 13. Implement `InputPanel.tsx` component
      Create `frontend/src/components/InputPanel.tsx`. Props: `{ onGenerate: (text: string, type: string) => void, loading: boolean }`. Internal state: `errorText`, `poetryType` (default 七言绝句), `truncationWarning`. Includes:
      - `<textarea>` rows=8 placeholder="粘贴报错信息……"
      - `PoetryTypeSelector` wired to `poetryType` state
      - "试试示例" button: picks random from 5 built-in errors (NullPointerException java stack, Python 404, C Segmentation fault, JS Stack Overflow, Node ECONNREFUSED); sets `errorText`
      - "作诗" button: validates non-empty (alert "先给我一个 bug 吧"), applies truncation if >5000 chars and sets `truncationWarning`, then calls `onGenerate`
      - Shows `truncationWarning` message when set
      - Button disabled when `loading`
      Files: `frontend/src/components/InputPanel.tsx`
      Verify: compile check via `cd frontend && npm run build`.

- [ ] 14. Implement `PoemDisplay.tsx` component
      Create `frontend/src/components/PoemDisplay.tsx`. Props: `{ title: string, poem: string[], note: string, score: number, isFreeForm?: boolean, errorText: string, poetryType: string }`. Implementation:
      - Use `parseBugLocation(errorText)` for footer filename/line
      - `calcAestheticScore` and `getScoreLabel` for display (passed via props is preferred; compute from errorText as fallback)
      - Main display uses CSS `writing-mode: vertical-rl; text-orientation: mixed` for title and each poem line, laid out RTL with flexbox `flex-direction: row-reverse`
      - Shows: title (竖排右首), poem lines (竖排), 凄美指数 bar/number + label, 诗人自注, footer (date + location)
      - `isFreeForm` badge: shows "自由体" tag
      - "导出卡片" button: calls `html2canvas(ref.current)` on the display div, then triggers download as `bug-poem-${Date.now()}.png`
      - Responsive: media query `@media (max-width: 600px)` switches to `writing-mode: horizontal-tb`, text-align center
      Files: `frontend/src/components/PoemDisplay.tsx`
      Verify: compile check via `cd frontend && npm run build`.

- [ ] 15. Implement `PoetryHistory.tsx` component
      Create `frontend/src/components/PoetryHistory.tsx`. No props. Reads history via `getHistory()`. Renders a scrollable list; each entry shows title, poetryType, score label, date. Clicking an entry shows full poem in a modal/expanded view. "清空诗集" button calls `clearHistory()` + refreshes. Handles empty state: "诗集尚空，去写下第一首吧".
      Files: `frontend/src/components/PoetryHistory.tsx`
      Verify: compile check via `cd frontend && npm run build`.

- [ ] 16. Implement `App.tsx` — main orchestration
      Create `frontend/src/App.tsx`. State: `poem | null`, `loading`, `error`, `currentView: 'main' | 'history'`. API base from `import.meta.env.VITE_API_BASE_URL ?? ''`. `handleGenerate(errorText, poetryType)`:
      1. Set `loading = true`, clear prior poem/error
      2. Compute `score = calcAestheticScore(errorText)` + `label`
      3. POST to `/api/poem` with `{ errorText, poetryType }`, `AbortController` timeout 10s
      4. On success: if `res.fallback` show error message "诗人今天罢工了"; else set poem state and call `savePoem({...entry, score, label, date: new Date().toLocaleDateString('zh-CN')})`
      5. On network error or timeout: show fallback message
      6. Set `loading = false`
      Layout:
      - Header with app title "Bug 诗人" + nav links 作诗/我的诗集
      - `currentView === 'main'`: InputPanel + (loading spinner with text "诗人正在酝酿情绪……") + PoemDisplay
      - `currentView === 'history'`: PoetryHistory
      Files: `frontend/src/App.tsx`
      Verify: `cd frontend && npm run build` — dist/ built cleanly.

- [ ] 17. Apply global CSS — ancient aesthetic
      Create/edit `frontend/src/index.css`. Rules:
      - Import Google Font `@import url('https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&family=Noto+Serif+SC:wght@400;700&display=swap')`
      - `:root` vars: `--bg: #1a1208; --paper: #2a1f0e; --gold: #c8a96e; --ink: #e8d5b0; --accent: #8b3a3a`
      - `body`: `background: var(--bg); color: var(--ink); font-family: 'Noto Serif SC', serif; min-height: 100vh`
      - `.xuan-paper`: xuan paper simulation — `background: var(--paper)` with `radial-gradient` noise texture, subtle `box-shadow` inset, `border: 1px solid var(--gold)`
      - `.vertical-poem`: `writing-mode: vertical-rl; text-orientation: mixed; font-family: 'ZCOOL XiaoWei', serif`
      - `.poem-container`: `display: flex; flex-direction: row-reverse; gap: 2rem`
      - `@media (max-width: 600px)` override: `.vertical-poem { writing-mode: horizontal-tb; text-align: center }`
      Files: `frontend/src/index.css`, `frontend/src/App.css`
      Verify: `cd frontend && npm run build` — no CSS import errors.

- [ ] 18. Wire root package.json scripts
      Update `/Users/lndu/Documents/BugPoet/package.json` to add `concurrently` devDep and scripts: `"dev:frontend": "npm run dev -w frontend"`, `"dev:backend": "npm run dev -w backend"`, `"dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\""`, `"build": "npm run build -w backend && npm run build -w frontend"`.
      Files: `/Users/lndu/Documents/BugPoet/package.json`
      Verify: `npm run build` from repo root — both builds succeed.

- [ ] 19. Final integration verification
      Run full validation suite from project root:
      1. `cd /Users/lndu/Documents/BugPoet/backend && npm run build` → exits 0
      2. `cd /Users/lndu/Documents/BugPoet/frontend && npx vitest run` → all tests pass
      3. `cd /Users/lndu/Documents/BugPoet/frontend && npm run build` → exits 0, `dist/` exists
      Files: none (verification only)
      Verify: all three commands above exit 0.

---

## Key implementation notes

### LLM retry prompt pattern (item 4)
On validation failure, the retry user prompt should be:
```
上一次生成不合格，原因：{failureReason}。
请重新生成，严格遵守{poetryType}格式：{formatConstraint}。
报错内容：{errorText}
只输出 JSON：{ "title": "...", "poem": [...], "note": "..." }
```

### Fallback poem (item 4, item 5)
Hardcode in `llm.ts` a `FALLBACK_POEMS` map keyed by poetryType. Example for 七言绝句:
```json
{
  "title": "空指针叹",
  "poem": ["虚无之处指针悬","万里寻址不得还","堆栈层层皆是梦","一声 Null 天地宽"],
  "note": "空指针异常，对象未初始化即被调用"
}
```

### Truncation logic (item 5)
```ts
const MAX = 5000, KEEP_HEAD = 2000, KEEP_TAIL = 1000
if (text.length > MAX) {
  text = text.slice(0, KEEP_HEAD) + '\n...[已截断]...\n' + text.slice(-KEEP_TAIL)
}
```
The truncation happens on the **backend** (route handler), not frontend — frontend just warns.
Actually per requirement 1.3: frontend shows the warning ("已截断") AND sends the truncated text. Do truncation + warn in `InputPanel.tsx` before calling `onGenerate`. Backend can do it too as a safety net but the user-facing warning is frontend.

### html2canvas gotcha (item 14)
- Pin `html2canvas` to `^1.4.1` to avoid breaking changes.
- The export button must use `useRef<HTMLDivElement>` on the display container.
- Call `html2canvas(el, { useCORS: true, scale: 2 })` for retina quality.
- Trigger download: `const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = ...; a.click()`.

### CJK character counting (item 4)
Count only characters in the Unicode CJK Unified Ideographs block `[\u4e00-\u9fff]`. Punctuation (，。！？) does NOT count toward the line length check.

### Rate limiting (item 3)
`express-rate-limit` v6+ uses `req.ip` by default. If behind a proxy, set `app.set('trust proxy', 1)` in `index.ts` for correct IP detection.

### Vite proxy (item 7)
In `vite.config.ts`:
```ts
server: {
  proxy: {
    '/api': {
      target: `http://localhost:${process.env.BACKEND_PORT ?? 3001}`,
      changeOrigin: true,
    }
  }
}
```

### Built-in example errors (item 13)
```ts
const EXAMPLES = [
  `java.lang.NullPointerException\n\tat com.example.App.main(App.java:42)`,
  `404 Not Found: GET /api/users/999\n    at Request.<anonymous> (app.js:88:15)`,
  `Segmentation fault (core dumped)\nProgram received signal SIGSEGV\n#0  0x00007f main() at main.c:17`,
  `RangeError: Maximum call stack size exceeded\n    at factorial (math.js:3:10)\n    at factorial (math.js:3:10)\n    at factorial (math.js:3:10)`,
  `Error: connect ECONNREFUSED 127.0.0.1:5432\n    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1148:16)`
]
```
