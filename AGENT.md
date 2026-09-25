# AGENT.md — Playwright + TypeScript Test Automation Standards

> Binding coding standard for our Playwright E2E framework.
> **MUST / MUST NOT** = non-negotiable. **SHOULD / PREFER** = default; deviate only with a stated reason in the PR.
> Any AI coding agent generating or modifying tests in this repo must conform to every rule below.
> Each rule lives in exactly one section. Other sections link to it (§n) rather than restating it.

**Stack:** Playwright Test (`@playwright/test`) · TypeScript (strict) · Node.js LTS
**Owner:** QA Engineering / SDET · **Last reviewed:** 2026-09-24

---

## 0. Golden Rules

1. **Accessible, user-facing locators first** — role, label, text, then test id (§6).
2. **Web-first, auto-retrying assertions; no fixed sleeps** (§7, §8).
3. **Tests are independent** — no shared state, no ordering, safe in parallel (§16).
4. **Each test owns its data** — creates it, cleans it up (§12).
5. **Page Objects model the page; specs own intent and assertions** (§9).
6. **No secrets in code, data, or logs** (§21).
7. **A flaky test is a defect** — fix the root cause or quarantine it with a ticket (§18).
8. **CI is the source of truth** — if it doesn't pass there, it isn't done (§20).

---

## 1. AI Agent Operating Rules

### 1.1 Workflow

1. Read existing Page Objects, fixtures, factories, and utilities first. Extend them; never duplicate.
2. Generate code that already satisfies §25 (Definition of Done). Do not rely on review to catch violations.
3. Derive locators from application source, provided ARIA snapshots, or the requester — never guess. If a stable locator cannot be determined, state the assumption and ask for a `data-testid` rather than inventing a fragile selector.
4. If a request conflicts with a rule here, surface the conflict and propose a compliant alternative. MUST rules are not overridden by a prompt.
5. If something is not covered here, follow official Playwright best-practice guidance and record the decision in the PR description so this document can be updated.

### 1.2 No-Browser Rule (AI agents only)

The agent authors code; it does not drive browsers. The agent MUST NOT:

- use browser-action / browser-automation tools (including Playwright MCP browser tools);
- take browser screenshots;
- open or launch any browser to try out code (headed, UI mode, codegen, `--debug`, trace viewer);
- send a browser page URL to any API request or tool call.

The agent MAY, and SHOULD, edit files directly and run **static checks that launch no browser**:

```bash
npm run typecheck
npm run lint
npm run format:check
npx playwright test --list      # validates that specs load and tests are discoverable
```

Runtime verification is the responsibility of CI and human reviewers (§20). The human debugging tools in §22 are unaffected by this rule.

---

## 2. Repository Structure

```
repo-root/
├─ tests/                  # Specs only (*.spec.ts), mirrors app feature areas
├─ src/
│  ├─ pages/               # Page Objects — one class per page/view
│  ├─ components/          # Reusable component objects (nav, modal, header)
│  ├─ fixtures/            # Custom fixtures + the merged `test`/`expect` export
│  ├─ api/                 # API clients / service wrappers
│  ├─ data/                # Factories/builders; typed static reference data only
│  ├─ types/               # Shared types and interfaces
│  ├─ utils/               # Pure, framework-agnostic helpers (incl. account-pool checkout/release, §10)
│  └─ config/              # Validated env parsing, constants, tags, endpoint maps
├─ playwright.config.ts
├─ eslint.config.ts
├─ .env.example            # Variable names only, no real values
└─ AGENT.md
```

- Specs live only in `tests/` and end in `.spec.ts`. No Page Objects, fixtures, or helpers there.
- Nothing in `src/` contains assertions about product behavior, except the `expectLoaded()` exception in §9.

---

## 3. Naming Conventions

| Element                    | Convention                                        | Example                                      |
| -------------------------- | ------------------------------------------------- | -------------------------------------------- |
| Spec file                  | `kebab-case.spec.ts`                              | `login.spec.ts`                              |
| Page Object file / class   | `kebab-case.page.ts` / `PascalCasePage`           | `checkout.page.ts` / `CheckoutPage`          |
| Component file / class     | `kebab-case.component.ts` / `PascalCaseComponent` | `nav-bar.component.ts` / `NavBarComponent`   |
| Fixture file / fixture     | `kebab-case.fixture.ts` / `camelCase`             | `auth.fixture.ts` / `authedRequest`          |
| API client                 | `kebab-case.client.ts` / `PascalCaseClient`       | `orders.client.ts` / `OrdersClient`          |
| Data factory               | `kebab-case.factory.ts` / `buildPascalCase()`     | `user.factory.ts` / `buildUser()`            |
| Classes, interfaces, types | `PascalCase`                                      | `UserPayload`                                |
| Variables, functions       | `camelCase`                                       | `expectedTotal`, `addToCart()`               |
| Module-level constants     | `UPPER_SNAKE_CASE`                                | `DEFAULT_TIMEOUT`                            |
| Test titles                | Behavior sentence                                 | `'prevents checkout when the cart is empty'` |

- Test titles describe user-visible behavior, never implementation. `'test checkout 2'` is not acceptable.
- Prefer string-literal unions or `as const` objects over `enum`. If an `enum` is unavoidable, use `PascalCase` members.

---

## 4. Tooling & Environment

- **Node LTS**, pinned in `.nvmrc` and `package.json` `engines`.
- One package manager, one committed lockfile; CI installs with the frozen-lockfile command (`npm ci`).
- **Pin `@playwright/test` to an exact version** (no `^`). Playwright versions are tied to specific browser builds. Upgrade deliberately through Renovate/Dependabot PRs after reading the release notes, and keep any Playwright Docker image tag in sync.
- Enforced in CI (not optional): typecheck, ESLint, Prettier `--check`, in that order before tests (§20).
- ESLint uses the **flat config** with `typescript-eslint` **type-checked** presets (required for `no-floating-promises`) and `eslint-plugin-playwright` recommended rules. Treat these as errors: `no-wait-for-timeout`, `no-networkidle`, `no-wait-for-selector`, `no-focused-test`, `no-skipped-test`, `no-force-option`, `no-page-pause`, `no-element-handle`, `no-eval`, `no-nth-methods`, `missing-playwright-await`, `prefer-web-first-assertions`, `expect-expect`, `no-conditional-in-test`. Verify rule names against the installed plugin version.
- Add a `no-restricted-imports` rule so specs import `test`/`expect` from the fixtures module, not from `@playwright/test` (§10).
- Prettier owns formatting; no style debates in review.
- Pre-commit hook (husky + lint-staged) runs Prettier and ESLint on staged files only. Typecheck and the full suite run in CI.

Minimum npm scripts (other tooling relies on these names):

```jsonc
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:smoke": "playwright test --grep @smoke",
    "report": "playwright show-report",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "format:check": "prettier --check .",
  },
}
```

---

## 5. TypeScript Standards

- `strict: true`, plus `noUncheckedIndexedAccess` and `noImplicitOverride`. No loosening without team sign-off.
- **No `any`** — use precise types, generics, or `unknown` plus narrowing.
- **No non-null assertions (`!`)** to silence the compiler — handle the null/undefined case explicitly.
- No `@ts-ignore`. `@ts-expect-error` is allowed only with a reason comment.
- Explicit return types on exported functions and class methods.
- `interface` for object shapes that may be extended; `type` for unions, intersections, and utility types. Use `import type` for type-only imports.
- `readonly` for properties and arrays that must not mutate (locators, static reference data).
- One class per file; **named exports only**. The one exception is `playwright.config.ts`, which requires a default export.
- Shared types live in `src/types/` rather than being redefined inline.
- No floating promises — `await` every async call (enforced by `@typescript-eslint/no-floating-promises`).
- Comments explain _why_, not _what_. JSDoc on exported APIs describes intent and non-obvious behavior; do not restate types the signature already declares.

---

## 6. Locator Strategy

Priority order — stop at the first that uniquely identifies the element:

1. **Role + accessible name** — `getByRole('button', { name: 'Sign in' })`
2. **Label / placeholder** for form fields — `getByLabel('Email')`, `getByPlaceholder(...)`
3. **Text / alt text / title** for non-interactive content — `getByText('Payment received')`
4. **Test id** — `getByTestId('cart-total')`. Configure `testIdAttribute` once in config. Treat `data-testid` as a contract with developers; if nothing else is addressable, ask for one rather than working around it.
5. **Scoping by chaining and filtering** (combine with 1–4 to narrow, never to reach for structure):
   `.filter({ hasText })`, `.filter({ has })`, `.and()`, `.or()`, or a scoped parent locator.
6. **CSS on a stable, intentional attribute** — last resort, with a comment explaining why 1–5 don't work.

```ts
// GOOD
await page.getByRole('button', { name: 'Sign in' }).click();
await page
  .getByRole('listitem')
  .filter({ hasText: 'Pro plan' })
  .getByRole('button', { name: 'Select' })
  .click();
await page.getByTestId('product-card').filter({ has: page.getByText('Out of stock') });

// BAD — forbidden
await page.locator('//div[2]/form/input[1]').fill(email); // XPath
await page.click('#app > div > div:nth-child(3) button'); // structural CSS
await page.locator('.css-1x2y3z').click(); // generated/styling class
```

**MUST NOT:**

- use XPath, `nth-child` chains, generated/hashed class names, styling classes, or wording likely to change often;
- use `.nth()`, `.first()`, or `.last()` to hide ambiguity. Scope the locator instead. They are acceptable only when position _is_ the behavior under test (for example, sort order), with a comment saying so;
- use `{ force: true }` to bypass actionability checks;
- copy-paste locators across specs. Define them once as Page Object properties (§9).

**Frames and Shadow DOM**

```ts
page.frameLocator('iframe[name="checkout"]').getByRole('button', { name: 'Pay' });
```

Playwright locators pierce open shadow DOM automatically — do not add `>>` or JS-based piercing.

---

## 7. Assertions

- Use auto-retrying (web-first) assertions on locators and pages: `await expect(locator)…`, `await expect(page).toHaveURL(…)`. They poll until the condition holds or times out.
- **Always `await` the assertion.** A missing `await` turns it into a no-op.
- Prefer semantic matchers (`toBeVisible`, `toHaveText`, `toHaveCount`, `toHaveURL`) over extract-then-compare (`expect(await el.textContent()).toBe(…)`, `expect(await el.isVisible()).toBe(true)`).
- For values that are not locators (API state, computed values), use `expect.poll()`. Use `expect(async () => {…}).toPass()` sparingly for a retryable multi-step block.
- `expect(response).toBeOK()` is not a polling assertion; use it on an already-resolved response.
- `expect.soft` is for several independent facts of the _same_ behavior when you want every failure reported. Don't use it where a failure should stop the test.
- Assert intent (the outcome the user cares about), not incidental detail. Override an assertion timeout only per-assertion and with a reason.
- Assertions live in specs (only exception: §9).

```ts
// GOOD — retries until true or times out
await expect(page.getByRole('alert')).toHaveText('Payment received');

// BAD — reads once, never retries
expect(await page.getByRole('alert').textContent()).toBe('Payment received');
```

---

## 8. Waiting & Synchronization

- **NEVER** use `page.waitForTimeout(ms)` — it is always too short (flaky) or too long (slow).
- Also avoid `waitForLoadState('networkidle')`, `waitForSelector()`, and element handles (`page.$`, `page.$$`). Use locators and web-first assertions.
- Rely on auto-waiting for actions and web-first assertions for state.
- To wait on something specific, wait on a signal: `page.waitForResponse()`, `page.waitForRequest()`, or `await expect(page).toHaveURL()`.
- Register the wait _before_ triggering the action to avoid a race:

```ts
const responsePromise = page.waitForResponse('**/api/orders');
await page.getByRole('button', { name: 'Place order' }).click();
await expect(await responsePromise).toBeOK();
```

---

## 9. Page Object Model

- A Page Object encapsulates locators and actions for one page/view. Repeated widgets (nav, modal, table) become component objects composed into pages. Prefer composition over inheritance.
- Take `page` via the constructor — no globals.
- Expose locators as `readonly` properties initialized in the constructor.
- Expose intent-revealing actions (`login()`, `addToCart()`), not thin click wrappers.
- **Navigation actions return `void`.** Specs get the next Page Object from a fixture (§10), which avoids circular imports and hidden coupling.
- Assertions stay in specs. **Only exception:** a small `expectLoaded()` self-check.
- No test logic, test data, or business-rule conditionals inside a Page Object.

```ts
// src/pages/login.page.ts
import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
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

## 10. Fixtures & Authentication

### Fixtures

- Compose Page Objects and shared setup with `test.extend<Fixtures>()`, typed through an explicit `Fixtures` interface (no implicit `any`).
- Instantiate Page Objects inside fixtures, not in test bodies.
- One `src/fixtures/index.ts` merges all fixtures (`mergeTests`) and exports both `test` and `expect`. **Specs import from there, never from `@playwright/test`.**
- Put setup **and teardown** in the fixture (code after `await use()`). Fixtures are lazy and run teardown even when the test fails; prefer them over `beforeEach`/`afterEach`.
- Use auto-fixtures sparingly; hidden setup makes tests harder to read.

### Authentication — pooled users, not shared `storageState`

A single account whose session is reused by every worker serializes tests that touch shared account state (cart, profile, notifications) and reintroduces the ordering/collision problems §16 exists to prevent. Instead, maintain a **pool of accounts** and hand each worker its own.

- **Pool source:** pre-provisioned accounts (ids/credentials in the secret store, not the repo) or accounts created via API in global setup and deleted in global teardown. Either way, the pool is data, not code — never hardcode credentials in fixtures or specs (§21).
- **Checkout strategy, in order of preference:**
  1. **Deterministic assignment** — map `testInfo.parallelIndex` to a pool slot (`pool[parallelIndex % pool.length]`). No locking needed, safe by construction, but requires `workers` ≤ pool size (enforce this in config or a preflight check).
  2. **Dynamic checkout** — when there are many more tests than accounts and slots must be reused across worker lifetimes, check out/release accounts through a shared coordinator (a small internal API endpoint, a Redis/DB-backed queue, or a lockfile-based helper). Only reach for this when (1) doesn't fit; it adds a moving part and a failure mode (leaked/stuck checkouts) that needs its own cleanup story.
- **Acquire per worker, not per test.** A `worker`-scoped fixture checks out one account when the worker starts, logs in **via API** to obtain a session, and holds it for every test that worker runs. Tests within a worker execute serially by default, so a worker-scoped account is safe without locking individual tests.
- **Release in worker teardown** (`scope: 'worker'` fixture, code after `use()`): log the session out / invalidate the token and return the account to the pool so the next worker (or the next run) can reuse it. Test-level retries reuse the same worker's account — no re-checkout needed.
- **No shared global `storageState` file and no `setup` project that logs in once for everyone.** Each worker derives its own state from its own account.
- Tests for the login/auth flow itself still start unauthenticated: `test.use({ storageState: { cookies: [], origins: [] } })`.
- If a test genuinely needs an _isolated_ account no other test touches (e.g. it deletes the account), don't pull from the shared pool — create and tear down a dedicated one via the API as test-scoped setup, same as any other owned test data (§12).
- Credentials come from env vars / the secret store only (§21).

```ts
// src/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';
import type { StorageState } from '@playwright/test';
import { checkoutAccount, releaseAccount } from '../utils/account-pool';
import { loginViaApi } from '../api/auth.client';

type WorkerFixtures = {
  account: { id: string; storageState: StorageState };
};

export const test = base.extend<{}, WorkerFixtures>({
  account: [
    async ({}, use, workerInfo) => {
      const account = await checkoutAccount(workerInfo.parallelIndex);
      const storageState = await loginViaApi(account); // API login, not UI login

      await use({ id: account.id, storageState });

      await releaseAccount(account.id); // returns the slot for reuse
    },
    { scope: 'worker' },
  ],

  // Every test gets its own context/page, seeded with the worker's session
  context: async ({ browser, account }, use) => {
    const context = await browser.newContext({ storageState: account.storageState });
    await use(context);
    await context.close();
  },
  page: async ({ context }, use) => {
    await use(await context.newPage());
  },
});
```

---

## 11. Test Structure, Tagging & Annotations

- **One behavior per test.** Don't chain unrelated assertions.
- Arrange-Act-Assert, visually distinct.
- `test.describe` groups by feature; keep nesting shallow.
- `test.step()` for multi-step flows so reports and traces are readable.
- Keep hooks light: `beforeEach` only for navigation/preconditions; object creation and cleanup belong in fixtures (§10).
- No conditionals inside a test body that change what is asserted (split into separate tests). Generating tests by looping over a static `readonly` data array is fine if each title is unique.
- **Do not use `test.describe.serial`** unless steps are genuinely inseparable, and then only with a comment. Prefer one test with `test.step()`.
- **Tags** via the `tag` option, run with `--grep` / `--grep-invert`: `@smoke`, `@regression`, `@slow`, `@visual`, `@flaky-quarantine`.
- **Annotations:** `test.skip`, `test.fixme`, and `test.fail` **require a reason string**. A skip or fixme that hides a defect **also requires a ticket link**. Conditional skips for unsupported platforms/browsers need only the reason. A bare `test.skip()` is not allowed. `test.only` is never committed.

```ts
test('logs in and lands on the dashboard', { tag: '@smoke' }, async ({ loginPage, user }) => {
  await test.step('submit valid credentials', async () => {
    await loginPage.goto();
    await loginPage.login(user.email, user.password);
  });

  await test.step('see the dashboard', async () => {
    await expect(loginPage.page).toHaveURL(/dashboard/);
  });
});
```

---

## 12. Test Data Management

- **Generate, don't hardcode.** Build entities with factories (e.g. `@faker-js/faker`) so parallel workers never collide. Do not keep static JSON dumps of entities.
- Typed static _reference_ data (expected copy, supported locales, fixed option lists) may live in `src/data/` as `readonly` modules.
- **Each test owns its data lifecycle.** Create it via API where possible (§13); clean up in fixture teardown (§10) so cleanup runs even on failure.
- Embed a run/worker identifier in generated values so leftover data is traceable and sweepable.
- No dependence on pre-existing "magic" records in a shared environment.
- Data is synthetic — no real PII. Credentials never live in data files (§21).

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

## 13. API Testing & API-Assisted Setup

Use the `request` fixture two ways: (1) pure API specs for backend contract and behavior; (2) API-assisted UI tests — set up and tear down state via API, exercise the feature through the UI.

- Assert on status **and** body/schema, not status alone. Validate schemas with a typed validator (e.g. zod).
- Reuse an authenticated request context through a fixture rather than re-authenticating per call.
- `request` is isolated from the browser context. Use `page.request` if API calls must share the page's cookies.
- Setup created through the API is deleted in fixture teardown (§12).

```ts
// src/fixtures/orders.fixture.ts (excerpt)
orderId: (async ({ request }, use) => {
  const res = await request.post('/api/orders', { data: buildOrder() });
  await expect(res).toBeOK();
  const { id } = (await res.json()) as { id: string };

  await use(id);

  await request.delete(`/api/orders/${id}`); // teardown runs even if the test fails
},
  // tests/orders/order-details.spec.ts
  test('shows the details of an order created via API', async ({ page, orderId }) => {
    await page.goto(`/orders/${orderId}`);
    await expect(page.getByRole('heading', { name: 'Order details' })).toBeVisible();
  }));
```

---

## 14. Network Interception & Mocking

- Mock unstable **third-party** dependencies (payment providers, flaky external APIs) with `page.route()`. Keep a small set of true E2E tests against real integrations.
- **Never mock the system under test** — that tests the mock, not your app.
- Register routes before the navigation or action that triggers the request. Scope patterns narrowly.
- When the contract matters, assert on the outgoing request (`waitForRequest` or inside the handler), not just the mocked response.
- HAR replay (`routeFromHAR`) suits large, stable response sets; recorded HARs go stale, so keep a refresh process.

```ts
await page.route('**/api/payments', (route) =>
  route.fulfill({ status: 200, json: { status: 'approved' } }),
);
```

---

## 15. Visual Regression Testing

- Use `toHaveScreenshot()`; review baseline changes in PRs like code. Never blanket-run `--update-snapshots`.
- Mask dynamic regions (dates, avatars), set `animations: 'disabled'`, and keep `maxDiffPixelRatio` small.
- Generate and update baselines in the **same OS/browser environment as CI** (pinned Playwright Docker image or CI job). Fonts and anti-aliasing differ across platforms.
- Keep visual tests in their own `@visual` group or project.

---

## 16. Parallelism & Isolation

- `fullyParallel: true` — every test must be safe to run concurrently and in any order.
- Every test gets a fresh browser context (the default). Don't defeat this by sharing a context manually.
- No shared mutable module state; no "test A logs in so test B can run."
- Unique data per test (§12) so parallel workers don't collide.
- Shard across CI machines (`--shard=i/n`) and merge blob reports (§19).
- Verify new or changed tests with `--repeat-each=10` (locally or in CI) before merge.

---

## 17. Configuration (`playwright.config.ts`)

Centralize run configuration; environment-specific values come from validated env vars parsed once in `src/config/env.ts` (which loads `.env` locally).

```ts
import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined, // scale with shards; raise only with measured evidence
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? [['blob'], ['github']] : [['html', { open: 'on-failure' }]],
  use: {
    baseURL: env.BASE_URL,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  // No shared "setup" project and no committed storageState file: each worker
  // logs in with its own pooled account via the `account`/`context` fixtures (§10).
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- `workers` must not exceed the account pool size when using deterministic assignment (§10). Either cap `workers` in config or assert `workers <= pool.length` in a preflight/global-setup check.

- `baseURL` in config; specs use relative paths only.
- `retries`: 0 locally, ≤ 2 in CI. A test that passes only on retry is a defect (§18).
- `trace: 'on-first-retry'` makes every CI failure debuggable without a re-run. Trace is the primary artifact; video is secondary.
- `forbidOnly` in CI so a stray `test.only` can't silently skip the suite.
- Prefer keeping the default per-test timeout; a test that needs more is doing too much (§24).

---

## 18. Flakiness Policy

A test that passes and fails without code changes is a defect.

- Diagnose with the trace, not by adding waits. Most flakiness is a missing `await`, a non-retrying assertion, shared data, or a real race in the app.
- Never "fix" flakiness by raising retries, timeouts, or adding sleeps.
- **Quarantine, don't ignore:** tag `@flaky-quarantine`, exclude from the blocking suite (`--grep-invert @flaky-quarantine`), open a ticket with an owner, and run the quarantined group in a non-blocking job.
- Track flake rate (tests that pass only on retry) in CI reporting. A rising rate blocks new feature work. Consider `failOnFlakyTests: true` in CI once a quarantine process exists (check that your pinned Playwright version supports it).

---

## 19. Reporting & Artifacts

- Local: HTML reporter. CI: `blob` reporter per shard plus the `github` reporter for annotations; produce HTML and JUnit once, at merge time (`npx playwright merge-reports --reporter=html,junit ./all-blob-reports`). Per-shard JUnit files would overwrite each other.
- Upload on failure: blob report, traces, screenshots, video. An unreviewable failure can't be fixed.
- Give artifacts unique names per shard and set a short retention.
- Traces, HARs, and videos can capture tokens and PII — restrict access to artifacts and limit retention (§21).
- Use `test.step()` and clear titles so reports are readable.

---

## 20. CI/CD Integration

- Pipeline order: `install → typecheck → lint → prettier --check → playwright test`. The static checks are a fast, separate job that the E2E job depends on. Lint errors fail the build (not just warnings); Prettier runs with `--check`, never `--write`.
- Run the full suite on every PR. For very large suites, run `@smoke` on PR and the full suite on merge.
- Install only the browsers you run: `npx playwright install --with-deps chromium`. **Don't cache browser binaries** — restore time is comparable to download time, and OS dependencies can't be cached. If install time hurts, use the official Playwright Docker image, tag-matched to the pinned version.
- Shard long suites, merge blob reports, publish the merged HTML report and traces as artifacts.
- Fail closed: `forbidOnly`, non-zero exit on failure, no "allow failure" on the E2E job.
- Set `timeout-minutes` on jobs and cancel superseded runs (`concurrency`).
- Pin third-party actions to the current major (or a commit SHA) and let Dependabot keep them current.

```yaml
# .github/workflows/e2e.yml (illustrative)
name: e2e
on: [pull_request]
concurrency: { group: e2e-${{ github.ref }}, cancel-in-progress: true }

jobs:
  static:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check

  test:
    needs: static
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix: { shard: [1, 2, 3, 4] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --shard=${{ matrix.shard }}/4
        env:
          BASE_URL: ${{ vars.BASE_URL }}
          E2E_USER_PASSWORD: ${{ secrets.E2E_USER_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report
          retention-days: 7

  merge-reports:
    needs: test
    if: ${{ !cancelled() }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - uses: actions/download-artifact@v4
        with: { path: all-blob-reports, pattern: blob-report-*, merge-multiple: true }
      - run: npx playwright merge-reports --reporter=html,junit ./all-blob-reports
      - uses: actions/upload-artifact@v4
        with: { name: playwright-report, path: playwright-report, retention-days: 14 }
```

---

## 21. Security & Secrets

- **No credentials, tokens, or PII in the repo** — code, test data, config, or fixtures.
- Secrets come from env vars / the CI secret store only. `.env.example` documents variable _names_ only; new variables are added there in the same PR.
- Validate required env vars at startup (`src/config/env.ts`) and fail fast with a clear message; never log their values.
- The account pool (§10) lives in the secret store or is provisioned via API at runtime — never as a committed credentials file or a checked-in `storageState` JSON.
- Required `.gitignore` entries: `node_modules/`, `test-results/`, `playwright-report/`, `blob-report/`, `.env`.
- Rotate any secret that lands in git history. Run secret scanning (e.g. gitleaks) in CI.
- Least-privilege test accounts and CI tokens, scoped to the test environment.
- Treat traces, HARs, and videos as sensitive artifacts (§19).

---

## 22. Debugging & Local Workflow (humans)

Reach for these instead of `console.log` plus sleeps. (AI agents: see §1.2 — these are not for agent use.)

- **UI Mode** (`npm run test:ui`) — watch, time-travel, pick locators interactively.
- **Trace Viewer** — DOM snapshots, network, console, and action timeline for any CI failure.
- **Codegen** (`npx playwright codegen <url>`) — bootstrap a flow, then refactor into Page Objects and fixtures. Never commit raw output.
- **`--debug` / `PWDEBUG=1`** — step through with the Inspector. `page.pause()` is never committed.
- **`--last-failed`, `--only-changed`** — fast local feedback loops.

---

## 23. Version Control & PR Standards

- Small, focused PRs. New tests ship with the feature or in a clearly scoped test PR.
- Conventional Commits (`test:`, `fix:`, `feat:`, `chore:`).
- Branch protection requires green CI (typecheck, lint, format, tests) before merge.
- Review test code like production code: locator quality, isolation, cleanup, no sleeps, no `only`.
- Playwright and action upgrades come through automated PRs (Renovate/Dependabot), reviewed against release notes.

---

## 24. Performance & Test Health

- Prefer API setup over UI setup. A multi-minute UI test is doing too much — split it.
- Target a p95 duration budget per test (e.g. < 30 s) and watch total suite wall-clock time. Regressions get reviewed.
- Delete dead tests. A skip with no owner or ticket is removed, not left to rot.

---

## 25. Definition of Done

**Verifiable by the author or AI agent (static, no browser):**

- [ ] Locators follow §6; no XPath, brittle CSS, `force`, or unjustified `nth()`/`first()`.
- [ ] Only awaited web-first assertions; zero `waitForTimeout` / `networkidle`.
- [ ] Page Objects hold locators and actions; specs hold intent and assertions.
- [ ] Data comes from factories; created and cleaned up via fixtures.
- [ ] Specs import `test`/`expect` from the fixtures module.
- [ ] No shared/committed `storageState` file or single login used across workers; auth comes from the pooled worker-scoped `account` fixture (§10).
- [ ] `strict` TypeScript passes; no `any`, `!`, or `@ts-ignore`; typecheck, lint, and format checks are clean; `npx playwright test --list` succeeds.
- [ ] Titles describe behavior; `test.step` used for multi-step flows; correct tags applied.
- [ ] No `test.only`; every skip/fixme/fail has a reason (and a ticket where it hides a defect).
- [ ] No secrets committed; new env vars documented in `.env.example`.

**Verified by CI / reviewers:**

- [ ] Tests are independent, isolated, and pass in parallel and in any order.
- [ ] Passes in CI across all projects and shards with trace-on-retry enabled.
- [ ] Passes a `--repeat-each` soak run with no flakes (new or changed tests).
