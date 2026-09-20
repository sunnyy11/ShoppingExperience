# AGENT.md — Playwright + TypeScript Test Automation Standards

> This is the binding coding standard for our Playwright E2E framework.
> **MUST/MUST NOT** = non-negotiable. **SHOULD/PREFER** = default, deviate only with a stated reason.
> An AI coding agent generating or modifying tests in this repo must conform to every rule below.

**Stack:** Playwright Test (`@playwright/test`) · TypeScript (strict) · Node.js LTS
**Owner:** QA Engineering / SDET · **Last reviewed:** 2026-09-18

---

## 0. Golden Rules - MUST

1. **Role-based locators.** `getByRole` / `getByLabel` / `getByText` first, `getByTestId` when semantics fall short. Never XPath or brittle CSS.
2. **Web-first, auto-retrying assertions.** `await expect(locator)…`. Never `page.waitForTimeout()`.
3. **Tests are independent** — no shared state, no ordering dependency, safe in parallel.
4. **Each test creates and cleans up its own data.**
5. **Page Objects model the page; specs own assertions and intent.**
6. **No secrets in code** — env vars / secret store only.
7. **A flaky test is a bug** — fix the root cause or quarantine it with a ticket.
8. **CI is the source of truth.** If it doesn't pass there, it isn't done.

---

## 1. Repository Structure

```
repo-root/
├─ tests/                # Specs only (*.spec.ts), mirrors app feature areas
├─ src/
│  ├─ pages/             # Page Objects — one class per page/view
│  ├─ components/        # Reusable component objects (nav, modals, header)
│  ├─ fixtures/          # Custom fixtures + merged `test` export
│  ├─ api/               # API clients / service wrappers
│  ├─ data/              # Test-data factories & builders (no static dumps)
│  ├─ utils/             # Pure helpers
│  └─ config/            # Env parsing, constants, endpoint maps
├─ playwright.config.ts
├─ .env.example          # Documents required env vars, no real values
└─ AGENT.md
```

- Specs live only in `tests/`, end in `.spec.ts`. No POMs/fixtures/helpers there.
- One Page Object per file: `PascalCasePage.ts`, class name matches file name.
- Mirror the app's information architecture in folder names.
- Extract component objects if a Page Object exceeds ~200 lines.

---

## 2. Tooling & Environment

- **Node LTS**, pinned in `.nvmrc` and `package.json engines`.
- One package manager, one committed lockfile.
- Install browsers in CI: `npx playwright install --with-deps`.
- Keep `@playwright/test` current; read the changelog before upgrading.
- Enforce in CI (not optional): ESLint (`@typescript-eslint`, `eslint-plugin-playwright`) + Prettier.

Minimum npm scripts (contract other tooling relies on):
```jsonc
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:smoke": "playwright test --grep @smoke",
    "report": "playwright show-report",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## 3. TypeScript Standards

---

### Typing Rules
- No `any` — use `unknown` and narrow it, or define a proper interface/type
- Explicit return types on exported functions and class methods
- Prefer `interface` for object shapes that may be extended; `type` for unions/intersections/utility types
- Use `readonly` for arrays/properties that shouldn't mutate (e.g., test data fixtures)
- Avoid non-null assertions (`!`) — handle the null/undefined case explicitly

### Naming Conventions
- PascalCase for classes, interfaces, types, enums (`LoginPage`, `UserPayload`)
- camelCase for variables, functions, methods (`addToCart`, `productQuantity`)
- UPPER_SNAKE_CASE for constants (`DEFAULT_TIMEOUT`, `BASE_URL`)
- Test files: `*.spec.ts`; Page Objects: `*.page.ts`; fixtures: `*.fixture.ts`

### Project Structure
- One class per file for Page Objects, named exports (not default exports)
- Locators defined as `readonly` class properties, initialized in constructor
- Shared types/interfaces in a `types/` or `models/` folder
- Test data separated into fixtures/JSON, not hardcoded in specs

### Playwright-Specific
- Use Playwright's built-in `test.step()` for readable reporting
- Fixtures (`test.extend`) typed explicitly — no implicit `any` in custom fixtures
- Avoid `page.waitForTimeout()` — use web-first assertions (`expect(locator).toBeVisible()`) instead
- Async/await everywhere — no floating promises (enforce via ESLint `@typescript-eslint/no-floating-promises`)

### Linting & Formatting
- ESLint with `@typescript-eslint/recommended` + `plugin:playwright/recommended`
- Prettier for formatting (no style debates in code review)
- Pre-commit hook (husky + lint-staged) to run lint/format before commit

### Documentation
- JSDoc comments on exported functions/classes describing purpose, params, return type
- README per module explaining page object responsibilities where non-obvious
---

## 4. Naming Conventions - MUST

| Element | Convention | Example |
|---|---|---|
| Spec file | `feature.spec.ts` | `login.spec.ts` |
| Page Object | `PascalCasePage` | `CheckoutPage.ts` |
| Component object | `PascalCaseComponent` | `NavBarComponent` |
| Fixture | `camelCase` | `loginPage`, `authedRequest` |
| Variables/functions | `camelCase` | `expectedTotal`, `createUser()` |
| Constants/enums | `UPPER_SNAKE` / `PascalCase` | `DEFAULT_TIMEOUT`, `UserRole.Admin` |
| Test titles | behavior sentence | `'prevents checkout when the cart is empty'` |

Test titles describe user-facing behavior, never implementation (`'test checkout 2'` is not acceptable).

---

## 5. Locator Strategy -MUST

Priority order — stop at the first that fits:

1. **Role + accessible name** — `getByRole('button', { name: 'Sign in' })`
2. **Label / placeholder / text** — `getByLabel('Email')`
3. **Test id** — `getByTestId('cart-total')` (coordinate `data-testid` with devs; treat it as a real contract)
4. **CSS scoped to a stable attribute** — last resort only, never styling classes

**Examples — GOOD vs BAD:**

```ts
// GOOD
await page.getByRole('button', { name: 'Sign in' }).click();

// BAD — forbidden
await page.locator('//div[2]/form/input[1]').fill(user.email); // XPath
await page.click('#app > div > div:nth-child(3) button');      // structural CSS
```

5. **data-testid (or a custom test attribute)** — Still the strongest fallback. If the DOM has nothing addressable, this is the ask to raise with dev, not a locator workaround.
   ```ts
   page.getByTestId('cart-summary-total')
   ```

6. **Chain and filter instead of writing a longer selector** — Combine a loose locator with `.filter()` or `.and()` to narrow scope without hardcoding structure.
   ```ts
   await page.getByRole('listitem').filter({ hasText: 'Pro plan' }).getByRole('button')
   await page.locator('.product-card').filter({ has: page.getByText('Out of stock') })
   ```

7. **`:has-text()` / `hasText` as a text-anchor when there's no role or label**
   ```ts
   await page.locator('.dropdown-item', { hasText: 'Settings' })
   ```

8. **Structural CSS or `nth()` — last resort, always commented why** — Only when nothing above resolves uniquely (e.g. a repeated row with no distinguishing text or attribute).
   ```ts
   await page.locator('table tbody tr').nth(2) // no unique id/text available in this grid — flag for a11y fix
   ```

9. **Frame and Shadow DOM cases**
   ```ts
   page.frameLocator('iframe[name="checkout"]').getByRole(...)
   ```

- **MUST NOT** use XPath, `nth-child` chains, hashed class names, or wording likely to change often.
- Chain/filter for scope instead of long selectors: `.filter({ hasText: 'Pro plan' })`.
- Store locators as Page Object properties, not copy-pasted across specs.
- If a locator resolves to multiple elements unintentionally, scope it — don't hide ambiguity with `.first()`.
   
- **MUST NOT** use XPath, `nth-child` chains, hashed class names, or wording likely to change often.
- Chain/filter for scope instead of long selectors: `.filter({ hasText: 'Pro plan' })`.
- Store locators as Page Object properties, not copy-pasted across specs.
- If a locator resolves to multiple elements unintentionally, scope it — don't hide ambiguity with `.first()`.

---

## 6. Assertions - MUST

- Use Playwright's auto-retrying assertions (`expect(locator)…`, `expect(page)…`, `expect(response)…`) — they poll until the condition holds or times out.
- **Always `await` an `expect`** on a locator/page/response — a missing `await` makes it a no-op.
- Prefer semantic matchers (`toBeVisible`, `toHaveText`, `toHaveCount`) over manual extraction + `toBe`.
- `expect.soft` when checking several independent facts and you want every failure reported; don't overuse it where a hard failure should stop the test.
- Assert intent (the outcome the user cares about), not incidental detail.
- Assertions live in the spec (Page Object exception: §8).

```ts
// GOOD — retries until true or times out
await expect(page.getByRole('alert')).toHaveText('Payment received');

// BAD — reads once, no retry
expect(await page.getByRole('alert').textContent()).toBe('Payment received');
```

---

## 7. Waiting & Synchronization - MUST

- **NEVER** `page.waitForTimeout(ms)` in committed code — always too short (flaky) or too long (slow). Enforce with `no-wait-for-timeout`.
- Rely on Playwright's auto-waiting for actions and web-first assertions for state.
- Wait for a specific signal, not the clock: `page.waitForResponse()`, `page.waitForURL()`.
- Set up the wait *before* triggering the action, to avoid races:

```ts
const responsePromise = page.waitForResponse('**/api/orders');
await page.getByRole('button', { name: 'Place order' }).click();
expect((await responsePromise).ok()).toBeTruthy();
```

---

## 8. Page Object Model - MUST

- A Page Object encapsulates locators and actions for one page/view.
- Expose locators as readonly properties/getters; expose intent-revealing actions (`login()`, `addToCart()`), not raw click wrappers.
- Take `page` (or fixtures) via the constructor — no global page.
- Pick one convention for navigation actions (return the next Page Object, or return `void` and let the test instantiate it) and stay consistent.
- Keep behavioral assertions in the spec. *Exception:* a small `expectLoaded()`-style self-check on a Page Object is fine.
- No test logic, test data, or business-rule conditionals inside a Page Object.

```ts
// src/pages/LoginPage.ts
export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByRole('textbox', { name: 'Email' });
    this.password = page.getByRole('textbox', { name: 'Password' });
    this.submit = page.getByRole('button', { name: 'Sign in' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
```

---

## 9. Fixtures - MUST

### Framework Architecture

### Fixture-Based Design
- Use `test.extend<Fixtures>()` to compose Page Objects and shared setup
- Fixtures typed explicitly via a `Fixtures` interface — no implicit `any`
- Page Objects are instantiated inside fixtures, not inside test bodies
- Base fixture file (e.g. `fixtures/base.ts`) merges all page object fixtures + custom fixtures (auth, API clients, test data)
- Tests import the extended `test` from the fixture file, not from `@playwright/test` directly

Example shape:
```typescript
// fixtures/base.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { CartPage } from '../pages/cart.page';

type Fixtures = {
  loginPage: LoginPage;
  cartPage: CartPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
});

export { expect } from '@playwright/test';
```

- Worker-scoped fixtures (`{ scope: 'worker' }`) for expensive setup shared across tests (e.g. API auth tokens)
- Auto-fixtures (`{ auto: true }`) for things every test needs without importing (e.g. tracing, logging)

### CI Enforcement
- Lint step runs before test execution in the pipeline; **pipeline fails on any ESLint error** (not just warnings)
- `tsc --noEmit` runs as a separate CI step to catch type errors before tests run
- Prettier check (`--check`, not `--write`) in CI — formatting issues fail the build, not auto-fixed silently
- Suggested pipeline order: `install → tsc --noEmit → eslint → prettier --check → playwright test`

---

## 10. Test Structure & Tagging

- One meaningful behavior per test — don't chain unrelated assertions.
- Arrange-Act-Assert, visually distinct.
- Group with `test.describe` by feature; keep nesting shallow.
- Use `test.step()` for readable structure in reports/traces.
- Keep hooks light — `beforeEach` for navigation/preconditions, fixtures for object creation.
- No conditionals/loops that change what's asserted — split into separate tests instead.
- Tag for selective runs: `@smoke`, `@regression`, `@slow`, `@flaky-quarantine`; select with `--grep`.
- Annotations (`test.fixme`, `test.skip`, `test.fail`) require a reason string and, ideally, a ticket link — a bare `test.skip()` is not allowed.

```ts
test('critical login path', { tag: '@smoke' }, async ({ loginPage }) => {
  await test.step('log in', async () => { /* ... */ });
});
```

---

## 11. Test Data Management - MUST

- Generate data (e.g. `@faker-js/faker`); don't hardcode it, so parallel runs don't collide.
- Each test owns its data lifecycle — create via API where possible (see §14), clean up in teardown.
- No dependence on pre-existing "magic" records in a shared environment.
- Credentials never live in data files — pull from env (§13a).

```ts
export function buildUser(overrides: Partial<User> = {}): User {
  return {
    email: faker.internet.email().toLowerCase(),
    password: `Pw!${faker.string.alphanumeric(12)}`,
    ...overrides,
  };
}
```

---

## 12. Configuration (`playwright.config.ts`) -MUST

Centralize run config; keep environment-specific values in env vars.

```ts
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['blob'], ['github'], ['junit', { outputFile: 'results.xml' }]]
    : [['html', { open: 'on-failure' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' }, dependencies: ['setup'] },
  ],
});
```

- `baseURL` in config; specs use relative paths only.
- `retries`: 0 locally, ≤2 in CI — treat any test that only passes on retry as a defect.
- `trace: 'on-first-retry'` so every CI failure is debuggable without a re-run.
- `forbidOnly` in CI so a stray `test.only` can't silently skip the suite.

---

## 13. Authentication & Session Reuse

- Log in once in a **setup project**, save `storageState`, and have other projects consume it. Don't log in through the UI in every test.
- One storage-state file per role (admin, standard user, etc.).
- For tests that must exercise the login UI itself, opt out with `test.use({ storageState: { cookies: [], origins: [] } })`.

```ts
// tests/global.setup.ts
setup('authenticate', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(process.env.E2E_USER!, process.env.E2E_PASSWORD!);
  await page.context().storageState({ path: '.auth/user.json' });
});
```

### 13a. Secret handling
- Credentials come only from env vars — never committed.
- `.auth/` (live session tokens) **must** be git-ignored.

---

## 14. API Testing & API-Assisted Setup

Use `request` context two ways: (1) pure API specs for backend contract/behavior, (2) API-assisted UI tests — set up/tear down state via API, exercise the feature through the UI.

```ts
test('displays orders created via API', async ({ page, request }) => {
  const res = await request.post('/api/orders', { data: buildOrder() });
  const { id } = await res.json();

  await page.goto(`/orders/${id}`);
  await expect(page.getByRole('heading', { name: 'Order details' })).toBeVisible();
});
```

- Assert on status *and* response body/schema, not just status.
- Reuse an authenticated `request` context via a fixture rather than re-authing per call.

---

## 15. Network Interception & Mocking

- Mock unstable third-party dependencies (payment providers, flaky external APIs) with `page.route()`; keep a small set of true E2E tests against real integrations.
- Never mock the system under test — that tests the mock, not your app.
- Prefer HAR replay (`routeFromHAR`) over hand-written fixtures for large response sets.

```ts
await page.route('**/api/payments', route =>
  route.fulfill({ status: 200, json: { status: 'approved' } })
);
```

---

## 16. Visual Regression Testing

- Use `toHaveScreenshot()`; review baseline changes in PRs like code.
- Mask dynamic regions (dates, avatars); keep `maxDiffPixelRatio` small to avoid noise.
- Generate/update baselines in the same OS/browser as CI (fonts and anti-aliasing differ across platforms).
- Keep visual tests in their own tagged group (`@visual`).


## 17. Parallelism & Isolation

- `fullyParallel: true` — tests must be safe to run concurrently.
- Every test gets a fresh browser context (Playwright default) — don't defeat this by sharing a context manually.
- No shared mutable module state and no "test A logs in so test B can run."
- Unique data per test (§11) so parallel workers don't collide.
- Shard across CI machines (`--shard=1/4`); merge blob reports afterward (§20).

---

## 18. Flakiness Policy

A test that passes and fails without code changes is a defect.

- Diagnose with the trace, not by adding waits — most flakiness is a missing `await`, a non-retrying assertion, or a real race in the app.
- Never "fix" flakiness by raising retries or adding waits.
- Quarantine, don't ignore: tag `@flaky-quarantine`, exclude from the blocking suite, open a ticket.
- Track flake rate in CI reporting; a rising rate blocks new feature work.

---

## 19. Reporting & Artifacts

- HTML reporter for local review; `blob` reporter in CI so sharded runs merge (`playwright merge-reports`).
- `junit`/`github` reporters for pipeline annotations and dashboards.
- Upload artifacts on failure: report, traces, screenshots, video — an unreviewable failure can't be fixed.
- Use `test.step()` and clear titles so reports are readable.

---

## 20. CI/CD Integration

- Run the full suite on every PR (or `@smoke` on PR + full on merge for very large suites).
- Install browsers with `--with-deps`; cache the browser download between runs.
- Shard long suites and merge blob reports; publish the HTML report + traces as artifacts.
- Fail closed: `forbidOnly`, non-zero exit on failure, no "allow failure" on the E2E job.

```yaml
# .github/workflows/e2e.yml (illustrative)
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix: { shard: [1, 2, 3, 4] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shard }}/4
```

---

## 21. Debugging & Local Workflow

Reach for these instead of `console.log` + sleeps:

- **UI Mode** (`test:ui`) — watch, time-travel, pick locators interactively.
- **Trace Viewer** — DOM snapshots, network, console, action timeline from any CI failure.
- **Codegen** (`npx playwright codegen <url>`) — bootstrap flows, then refactor into Page Objects; never commit raw output.
- **`--debug` / `PWDEBUG=1`** — step through with the inspector.

---

## 22. Version Control & PR Standards

- Small, focused PRs; new tests ship with the feature or a clearly scoped test PR.
- Conventional Commits (`test:`, `fix:`, `feat:`, `chore:`).
- CI must be green (lint, typecheck, tests) before merge — enforced by branch protection.
- Review test code like production code: locator quality, isolation, cleanup, no sleeps, no `only`.
- `.gitignore`: `node_modules/`, `test-results/`, `playwright-report/`, `blob-report/`, `.auth/`, `.env`.

---

## 23. Security & Secrets

- No credentials, tokens, or PII in the repo — including test data files.
- All secrets via env vars / CI secret store; `.env.example` documents variable *names* only.
- Rotate any secret that lands in git history.
- Least-privilege test accounts and CI tokens, scoped to the test environment.

---

## 24. Performance & Test Health Budgets

- Prefer API setup over UI setup — a multi-minute UI test is doing too much; split it.
- Target a p95 duration budget per test (e.g. < 30s) and watch total suite wall-clock time; regressions get reviewed.
- Delete dead tests — an unowned skip with no ticket is removed, not left to rot.

---

## 25. Forbidden List

- `page.waitForTimeout()` / hard sleeps
- XPath, `nth-child`/structural CSS, or styling-class locators
- Non-retrying assertions on extracted values
- Missing `await` on Playwright calls / floating promises
- `any`, unexplained `!`, or loosened `strict` settings
- Tests depending on execution order or another test's data
- Shared mutable state; reusing one context to "stay logged in"
- Assertions buried in Page Objects (beyond `expectLoaded()`)
- Secrets or real PII committed anywhere
- Committed `test.only`; `test.skip`/`fixme` without a reason + ticket
- Logging in through the UI in every test instead of `storageState`
- Raising `retries` or adding waits to hide flakiness

---

## 26. Definition of Done

- [ ] Tests are independent, isolated, pass with `--fully-parallel` in any order.
- [ ] Locators follow §5 priority order; no XPath/brittle CSS.
- [ ] Only web-first, awaited assertions; zero `waitForTimeout`.
- [ ] Page Objects hold locators/actions; specs hold intent + assertions.
- [ ] Reusable setup uses fixtures; expensive auth uses `storageState`.
- [ ] Each test creates and cleans up its own data.
- [ ] `strict` TypeScript passes; no `any`; lint/typecheck/format clean.
- [ ] No secrets committed; new env vars documented in `.env.example`.
- [ ] Passes in CI (all projects/shards) with trace-on-retry enabled.
- [ ] Meaningful test titles; `test.step` used for multi-step flows; correct tags applied.
- [ ] No `test.only`; any skip/fixme has a reason and ticket link.

---

### Appendix — How an AI agent should apply this file

1. Read existing Page Objects/fixtures first and reuse them — extend, don't duplicate.
2. Generate code that already satisfies §26 — don't rely on review to catch violations.
3. If a rule here conflicts with a request, surface the conflict and propose a compliant alternative.
4. When something isn't covered here, follow official Playwright best-practice guidance and note the decision so this document can be updated.
5. Follow the below browser rules
    #No Browser rule
    Never use browser action tool
    Never take browser screenshot
    Never send browser url to API request
    Only write and edit code in directly in files
    Do not open or launch any browser to test code