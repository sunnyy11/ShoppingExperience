# ShoppingExperience

End-to-end test automation for shopping e-commerce flows, built on **Playwright Test + TypeScript**.

This repository is a complete, production-grade E2E framework: a page-object model, worker-scoped authentication, API-assisted data setup, real email verification, and a sharded CI pipeline.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Path Aliases](#path-aliases)
- [Testing Framework](#testing-framework)
  - [Fixtures](#fixtures)
  - [Page Objects](#page-objects)
  - [API Client](#api-client)
  - [Data Factory](#data-factory)
  - [Utilities](#utilities)
  - [Logging](#logging)
- [Test Suites](#test-suites)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [npm Scripts](#npm-scripts)
- [Running Tests](#running-tests)
- [Performance & Runtime](#performance--runtime)
- [Code Quality](#code-quality)
- [CI/CD Pipeline](#cicd-pipeline)
- [Reporting & Artifacts](#reporting--artifacts)
- [Locator Strategy](#locator-strategy)
- [Writing New Tests](#writing-new-tests)
- [Debugging](#debugging)
- [Git Hooks](#git-hooks)
- [AI Agent Integration](#ai-agent-integration)
- [Troubleshooting](#troubleshooting)

---

## Overview

|                      |                                                                  |
| -------------------- | ---------------------------------------------------------------- |
| **Primary target**   | `https://automationexercise.com` (overridable via `BASE_URL`)    |
| **Secondary target** | `https://practice.expandtesting.com/otp-login` (OTP/email flows) |
| **Framework type**   | Page Object Model + custom fixtures + API-assisted setup         |
| **Browsers**         | Chromium only (maximized, no viewport override)                  |
| **Parallelism**      | Fully parallel, per-worker authenticated accounts                |
| **CI**               | GitHub Actions, 4 shards, static checks gate the E2E job         |

**Key capabilities**

- Worker-scoped, per-worker authenticated sessions (no shared `storageState`)
- Automatic account provisioning via API when a pool user is missing
- Deterministic worker → account assignment (no locks, safe by construction)
- Real email verification with [Mailosaur](https://mailosaur.com) (OTP, links, codes, attachments, images)
- Structured Winston logging with automatic secret redaction, and a lifecycle record for every executed test
- Faker-driven test data factories
- HTML + blob + JUnit + GitHub reporters, merged across shards

---

## Tech Stack

| Layer          | Technology                                                  | Version                             |
| -------------- | ----------------------------------------------------------- | ----------------------------------- |
| Test runner    | `@playwright/test`                                          | `1.63.0` (pinned, no caret)         |
| Language       | TypeScript                                                  | `ES2022` target, `commonjs`, strict |
| Runtime        | Node.js                                                     | `22` (`.nvmrc`, `engines.node`)     |
| Logging        | `winston` + `logform`                                       | `3.19.0` / `2.7.0`                  |
| Email testing  | `mailosaur`                                                 | `11.1.1`                            |
| Test data      | `@faker-js/faker`                                           | `10.6.0`                            |
| Linting        | `eslint` + `typescript-eslint` + `eslint-plugin-playwright` | `10.10.0` / `8.70.0` / `2.12.0`     |
| Formatting     | `prettier`                                                  | `3.9.8`                             |
| Hooks          | `husky` + `lint-staged`                                     | `9.1.7` / `15.2.10`                 |
| Module aliases | `tsconfig-paths`                                            | `^4.2.0`                            |

`@playwright/test` is deliberately pinned to an exact version because Playwright versions are coupled to specific browser builds.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       tests/  (specs)                        │
│   imports test/expect from @fixtures, holds intent + asserts │
└───────────────┬──────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────┐
│                   src/fixtures/index.ts                       │
│  test / authenticatedTest / expect + worker auth lifecycle   │
└──┬────────────┬─────────────┬──────────────┬────────────────┘
   │            │             │              │
┌──▼──────┐ ┌───▼──────┐ ┌────▼───────┐ ┌────▼──────────────┐
│ @pages  │ │ @api     │ │ @data      │ │ @utils            │
│ POMM    │ │ API client│ │ faker bldrs│ │ mailosaur,        │
│         │ │          │ │            │ │ logger            │
└─────────┘ └──────────┘ └────────────┘ └───────────────────┘
   ▲                                          │
   │  test lifecycle records                  ▼
┌──┴───────────────────┐            ┌─────────────────────────┐
│ src/reporters/       │            │ src/utils/logger.ts     │
│ logging-reporter.ts  │───────────▶│ Winston + redaction     │
└──────────────────────┘            └─────────────────────────┘
```

**Design rules enforced by the framework**

1. Specs contain assertions and intent only — never locators duplicated across files.
2. Page Objects expose `readonly` locators + intent-revealing actions; navigation returns `void`.
3. Every test owns its data; creation via API, cleanup in fixture teardown.
4. Each worker logs in with its own pooled account, so tests never collide on cart/profile state.
5. Only awaited, web-first (auto-retrying) assertions. No fixed sleeps anywhere.

---

## Project Structure

```
repo-root/
├─ tests/                              # Specs only (*.spec.ts)
│  ├─ ui-tests/                        # Browser-driven specs
│  │  ├─ auth/
│  │  │  ├─ login.spec.ts                 # Login + Delete Account visibility
│  │  │  └─ oauth.spec.ts.skip            # Disabled Layer 1/Layer 2 OAuth suite
│  │  ├─ checkout/
│  │  │  └─ place-order.spec.ts           # Order placement, invoice, addresses
│  │  ├─ products/
│  │  │  ├─ products-search-add.spec.ts   # Search, add, remove, quantities
│  │  │  └─ search-verify-cart-after-login.spec.ts
│  │  └─ register/
│  │     └─ register.spec.ts              # New account registration
│  └─ api-tests/                       # REST specs, no browser
│     ├─ accounts/
│     │  └─ user-account.spec.ts        # API 11 create, API 12 delete, API 14 user detail
│     └─ email/
│        ├─ email-testing.spec.ts       # Mailosaur email assertion suite
│        ├─ email-testing.plan.md       # Coverage plan for email testing
│        └─ otp-mailosaur.spec.ts       # OTP login with real email
├─ src/
│  ├─ pages/                           # Page Object Model
│  │  ├─ cart.page.ts
│  │  ├─ checkout.page.ts
│  │  ├─ email-testing.page.ts
│  │  ├─ login.page.ts
│  │  ├─ oauth.page.ts
│  │  ├─ otp-login.page.ts
│  │  ├─ products.page.ts
│  │  └─ register.page.ts
│  ├─ fixtures/
│  │  └─ index.ts                      # Merged test/expect + auth fixtures
│  ├─ api/
│  │  └─ api.client.ts                 # AutomationExercise REST endpoints
│  ├─ data/
│  │  └─ test-user.factory.ts          # Faker builders + account pool
│  ├─ utils/
│  │  ├─ logger.ts                     # Winston logger + secret redaction
│  │  └─ mailosaur.ts                  # Email generation + polling
│  ├─ reporters/
│  │  └─ logging-reporter.ts           # Test lifecycle records (started/finished)
│  └─ config/
│     ├─ global-setup.ts               # Run-level logging
│     ├─ global-teardown.ts            # Run-level logging + auth cleanup
│     └─ load-env.ts                   # .env loader (Node 22+)
├─ .auth/                              # Per-worker storage state (gitignored)
├─ .github/
│  ├─ workflows/playwright.yml         # E2E pipeline (sharded)
│  ├─ workflows/copilot-setup-steps.yml
│  └─ agents/                          # GitHub Copilot agent definitions
├─ hooks/pre-commit                    # Manual git hook installer
├─ playwright.config.ts
├─ eslint.config.ts
├─ tsconfig.json
├─ AGENT.md                            # Binding test-automation standards
├─ AGENTS.md
└─ .env.example
```

**Generated / ignored directories:** `test-results/`, `playwright-report/`, `blob-report/`, `logs/`, `.auth/`, `.playwright-mcp/`, `.claude/`, `.kilo/`

---

## Configuration

### `playwright.config.ts`

| Option           | Value                                                    | Rationale                                      |
| ---------------- | -------------------------------------------------------- | ---------------------------------------------- |
| `testDir`        | `./tests`                                                | Specs isolated from helpers                    |
| `fullyParallel`  | `true`                                                   | Every test must be order-independent           |
| `forbidOnly`     | `!!CI`                                                   | A stray `test.only` cannot skip CI             |
| `retries`        | `0` local / `2` CI                                       | Retry-on-failure is a flake signal, not a fix  |
| `workers`        | default local / `50%` CI                                 | Keeps worker count under the account pool size |
| `timeout`        | `120_000`                                                | Upper bound per test                           |
| `globalTimeout`  | `900_000` local / `1_800_000` CI                         | Whole-run cap                                  |
| `expect.timeout` | `10_000`                                                 | Default auto-retry window for assertions       |
| `actionTimeout`  | `30_000`                                                 | Per-action cap                                 |
| `trace`          | `on-first-retry`                                         | Primary debugging artifact                     |
| `screenshot`     | `only-on-failure`                                        | Lightweight failure evidence                   |
| `video`          | `retain-on-failure`                                      | Secondary artifact                             |
| `baseURL`        | `BASE_URL` env, default `https://automationexercise.com` | Specs use relative paths only                  |
| `globalSetup`    | `./src/config/global-setup.ts`                           | Brackets the run with a start record           |
| `globalTeardown` | `./src/config/global-teardown.ts`                        | End record + `.auth/` cleanup                  |
| `projects`       | `chromium` with `viewport: null`, `--start-maximized`    | Deterministic desktop rendering                |
| `outputDir`      | `test-results/`                                          | Traces, videos, screenshots                    |

The config first registers `tsconfig-paths/register` and imports `./src/config/load-env`, so aliases and `.env` are available in the config file, page objects, and specs alike.

### `tsconfig.json`

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`
- `types: ["node", "@playwright/test"]`
- `include: ["playwright.config.ts", "src/**/*.ts", "tests/**/*.ts"]`
- `noUncheckedIndexedAccess` is why code such as `userPool[workerIndex % pool.length]` is followed by an explicit undefined check.

### `src/config/load-env.ts`

Loads `.env` from the repository root using `process.loadEnvFile` (Node 22+) when available. Missing `.env` is not an error — CI supplies variables through the secret store instead.

---

## Path Aliases

Aliases are declared in `tsconfig.json` `paths` and resolved at runtime by `tsconfig-paths/register`.

| Alias       | Target                  | Purpose                                      |
| ----------- | ----------------------- | -------------------------------------------- |
| `@fixtures` | `src/fixtures/index.ts` | Merged `test`, `authenticatedTest`, `expect` |
| `@pages/*`  | `src/pages/*`           | Page Objects                                 |
| `@api/*`    | `src/api/*`             | API clients                                  |
| `@data/*`   | `src/data/*`            | Factories and reference data                 |
| `@utils/*`  | `src/utils/*`           | Framework-agnostic helpers                   |
| `@config/*` | `src/config/*`          | Env parsing and constants                    |

ESLint enforces the boundary: `tests/**/*.ts` may **not** import `test` or `expect` from `@playwright/test` — they must come from `@fixtures`.

---

## Testing Framework

### Fixtures — `src/fixtures/index.ts`

Two exported test objects plus a shared `expect`:

| Export              | Type                                | Auth                                                                          |
| ------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `test`              | `extendedTest`                      | Unauthenticated (default `page`)                                              |
| `authenticatedTest` | further extended                    | Uses `workerAuthFile` storage state                                           |
| `expect`            | re-exported from `@playwright/test` | —                                                                             |
| `globalTeardown()`  | async function                      | Exported from the fixtures module; recursively removes the `.auth/` directory |

**Page fixtures (test-scoped, one instance per test):**
`cartPage`, `checkoutPage`, `emailTestingPage`, `loginPage`, `otpLoginPage`, `productsPage`, `registerPage`

**Worker fixtures (worker-scoped, one instance per worker):**
`workerUser` — resolves the account for `workerInfo.workerIndex` via `getUserForWorker()`.
`workerAuthFile` — `.auth/worker-<index>.json`, with a `180_000` ms setup timeout.

**Authentication lifecycle**

1. Reuse `.auth/worker-<index>.json` if it already exists.
2. Otherwise launch a throwaway Chromium instance, navigate `/`, open _Signup / Login_, and submit `[data-qa="login-email"]` / `[data-qa="login-password"]`.
3. If login fails, create the account through `ApiClient.createAccount()` with a complete profile payload, then retry login.
4. Persist `context.storageState({ path: authFile })` and close the throwaway browser.
5. After `await use(...)`, delete the worker's auth file.

`authenticatedTest` overrides `context` and `page` so each test still gets a **fresh browser context** seeded from the worker's storage state — session sharing, not context sharing.

**Account pool** — `readUserPool()` builds a pool from numbered `AUTOMATION_EXERCISE_TEST_EMAIL_n` / `AUTOMATION_EXERCISE_TEST_PASSWORD_n` pairs read until the first missing pair. Credentials live in `.env` only, never in source. Assignment is `userPool[workerIndex % userPool.length]`, which is deterministic and requires no locking. Add one pair per concurrent worker so workers never share an account.

### Page Objects

| Class              | File                    | Highlights                                                                                                                                                        |
| ------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LoginPage`        | `login.page.ts`         | `goto()`, `login(email, password)` on `data-qa` selectors                                                                                                         |
| `RegisterPage`     | `register.page.ts`      | Quick signup, account info, address info, `registerFullAccount()`                                                                                                 |
| `ProductsPage`     | `products.page.ts`      | `search()`, `getProductId()`, `gotoProductDetail()`, `addProductToCart()` → `ProductInfo`, `addAllSearchedProductsToCart()`, `openCart()`, `openCartFromHeader()` |
| `CartPage`         | `cart.page.ts`          | `expectLoaded()`, `proceedToCheckout()`, `getCartProducts()`, `getProductRow()`, `removeProduct()`, `clearCart()`                                                 |
| `CheckoutPage`     | `checkout.page.ts`      | `fillShipping()`, `fillPayment()`, `addOrderMessage()`, `placeOrder()`, `pay()`, `downloadInvoice()`                                                              |
| `OtpLoginPage`     | `otp-login.page.ts`     | `enterEmailAndSend()`, `enterOtpAndVerify()`, `expectSecureArea()`, `expectOtpError()`                                                                            |
| `OauthPage`        | `oauth.page.ts`         | Provider map (`google`/`github`/`microsoft`), `clickSocialLogin()`, `waitForOAuthRedirect()`, `waitForOAuthCallback()`                                            |
| `EmailTestingPage` | `email-testing.page.ts` | Full Mailosaur message lifecycle + assertion helpers                                                                                                              |

Shared types: `ProductInfo` (`name`, `price`), `CartProduct` (`+ quantity`, `total`), `ShippingDetails`, `PaymentDetails`, `RegistrationDetails`, `OtpLoginData`, `OAuthProvider`, `EmailTestData`, `AttachmentData`, `SendEmailOptions`, `ForwardEmailOptions`, `ReplyEmailOptions`.

Conventions: `page` is injected through the constructor, locators are `readonly` fields initialised in the constructor, actions are intent-revealing, navigation returns `Promise<void>`, and the only assertions inside a page object are the `expectLoaded()` self-checks.

### API Client — `src/api/api.client.ts`

`ApiClient` wraps `APIRequestContext` for the AutomationExercise REST API:

| Method                           | Endpoint                               | Reference | Purpose                    |
| -------------------------------- | -------------------------------------- | --------- | -------------------------- |
| `createAccount(payload)`         | `POST /api/createAccount`              | API 11    | Register a user account    |
| `deleteAccount(email, password)` | `DELETE /api/deleteAccount`            | API 12    | Delete a user account      |
| `getUserDetailByEmail(email)`    | `GET /api/getUserDetailByEmail?email=` | API 14    | Fetch user detail by email |

`createApiClient(request)` is the factory; pass `page.request` when the call must share the browser's cookies.

The AutomationExercise API returns HTTP 200 for application-level failures, so `createAccount` aside, every method validates the `responseCode` in the body and throws with status, status text, and body when it is not the expected code.

### Data Factory — `src/data/test-user.factory.ts`

| Builder                          | Returns               | Notes                                             |
| -------------------------------- | --------------------- | ------------------------------------------------- |
| `buildTestUser()`                | `TestUser`            | Faker person + `Pw!` + 14 alphanumeric password   |
| `buildRegistrationDetails(user)` | `RegistrationDetails` | Company/street from Faker; DOB from bounded pools |
| `buildShippingDetails(user)`     | `ShippingDetails`     | Reuses registration data for checkout             |
| `buildPaymentDetails(user)`      | `PaymentDetails`      | Faker card number, 3-digit CVC, month/year pools  |
| `getUserForWorker(workerIndex)`  | `TestUser`            | Deterministic pool mapping                        |
| `getConfiguredUser()`            | `TestUser`            | `userPool[0]` for single-user flows               |

### Utilities

**`@utils/mailosaur`** — lazily creates a `MailosaurClient` from `MAILOSAUR_API_KEY` / `MAILOSAUR_SERVER_ID` and fails fast with a clear message when either is missing.

- `generateEmailAddress()` — unique inbox address; rewrites the `@=` form Mailosaur returns into `@`, because the target site's client-side validation rejects the stray `=`
- `waitForEmail(sentTo, timeout = 30_000, pollInterval = 2_000)` — polls until a message arrives; **only** an empty inbox (`notfound` / HTTP 404) is retryable, credential and server errors are rethrown immediately
- `purgeMessages()` — clears the whole test inbox

### Logging — `src/utils/logger.ts`

A Winston logger with three outputs and automatic redaction.

| Output  | Destination                   | Format                   | Notes                                             |
| ------- | ----------------------------- | ------------------------ | ------------------------------------------------- |
| Console | stdout (`stderr` for `error`) | colorized text           | Level from `LOG_CONSOLE_LEVEL`, `off` silences it |
| File    | `logs/combined.log`           | one JSON object per line | Every record at `LOG_LEVEL` and above             |
| File    | `logs/error.log`              | one JSON object per line | `error` records only                              |

Files rotate at 10 MB with 5 generations kept, and the whole `logs/` directory is gitignored.

**API** — `logger` is the shared instance; `logger.child({ ... })` returns a scoped logger whose bindings are merged into every record:

```ts
import { logger } from '@utils/logger';

logger.info('cart checked out', { orderId: '123' });

const log = logger.child({ component: 'api-client' });
log.info('POST /api/createAccount', { payload });
log.error('request failed', error, { status: 500 });
```

`@fixtures` exposes a `logger` fixture that is already scoped to the running test (spec file, test title, project, worker index, retry). The test lifecycle itself is written by `src/reporters/logging-reporter.ts`, a Playwright reporter that emits a `test started` / `test finished` record with the status, duration, and failure messages for **every** executed test. A `beforeEach` hook cannot be used for this: Playwright stops running the hooks of a worker once that worker loads a second spec file, which silently drops the records of the remaining tests in that worker. `src/config/global-setup.ts` and `src/config/global-teardown.ts` bracket the whole run.

Records carry `source: 'reporter'` for the lifecycle entries written by the runner and `source: 'app'` for everything the test code writes, so a lifecycle record is never confused with an application record even though both share the same `runId`.

Every lifecycle record carries a `testKey` (`<absolute spec file>::<describe titles> > <test title>`). The key is what pairs a `test started` record with its `test finished` record, independent of the order of the records in the file and of the worker that produced them.

`npm run verify:lifecycle` (`scripts/verify-lifecycle.ts`) compares the JSON report with the log and fails when an executed test has no `test started` / `test finished` record, when a `test started` has no matching `test finished` (a worker that was killed mid-test), or when the run-level records are missing.

Every run writes its own report, `test-results/results-<runId>.json`, and the log file is appended to across runs. The run id in the file name is what pairs the report with the records of that run in the log, so two runs that share the working directory can never be mixed up.

```bash
npm test
npm run verify:lifecycle
```

**Redaction** (AGENT.md §21) happens in a Winston format, before any transport renders the record:

- values under sensitive keys (`password`, `token`, `secret`, `apiKey`, `authorization`, `cookie`, `cvc`, `cardNumber`, `otp`, …) become `[REDACTED]`;
- `Bearer`/`Basic` headers, `password=…`-style assignments, and secret query parameters are scrubbed from free text;
- e-mail addresses are masked (`u***@example.com`);
- `Error` objects are serialized as name, message, and stack.

The framework's own metadata — the test title, path and key, the status, the worker, the duration — is written verbatim. Those values never contain a secret, and rewriting them would break the pairing of a `test started` record with its `test finished` record. A describe title such as "Basic Email Properties" therefore survives the free-text patterns, which would otherwise turn it into "Basic [REDACTED] Properties".

Every record also carries `runId`, `pid`, and `worker` so parallel workers can be told apart in a shared log file.

---

## Test Suites

Tests are split by layer under `tests/`: `tests/ui-tests/` for browser specs and `tests/api-tests/` for REST specs.

### UI Tests — `tests/ui-tests/`

| Spec                                                       | Tests       | Fixture             | Covers                                                                                                                                      |
| ---------------------------------------------------------- | ----------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui-tests/auth/login.spec.ts`                              | 1           | `test`              | Title check, login, `Delete Account` link visibility                                                                                        |
| `ui-tests/auth/oauth.spec.ts.skip`                         | 5 (skipped) | `test`              | OAuth button presence, authorization-code redirect, token exchange, per-provider redirects                                                  |
| `ui-tests/checkout/place-order.spec.ts`                    | 3           | `authenticatedTest` | Place order with payment, invoice download, delivery = billing address                                                                      |
| `ui-tests/products/products-search-add.spec.ts`            | 5           | `test`              | Search, add two products, remove products, quantity 2, totals = price × qty                                                                 |
| `ui-tests/products/search-verify-cart-after-login.spec.ts` | 1           | `test`              | Search → add all → log in → cart persists                                                                                                   |
| `ui-tests/register/register.spec.ts`                       | 2           | `test`              | Full registration, plus deletion of a self-provisioned throwaway account (each test registers its own user, so the deletion is the cleanup) |

### API Tests — `tests/api-tests/`

| Spec                                      | Tests | Fixture | Covers                                                                                                                                                                         |
| ----------------------------------------- | ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api-tests/accounts/user-account.spec.ts` | 5     | `test`  | API 11 create account, API 12 delete account, API 14 user detail by email, plus error paths                                                                                    |
| `api-tests/email/otp-mailosaur.spec.ts`   | 1     | `test`  | Real email OTP → secure area                                                                                                                                                   |
| `api-tests/email/email-testing.spec.ts`   | 27    | `test`  | Properties, HTML/text bodies, links, codes, attachments, images, send/reply/forward, deletion, time-range and multi-message search, unique address generation, end-to-end flow |

**Total: 45 executed tests** (12 UI + 33 API) in a clean run.

**Tags:** no test currently carries a tag. `@smoke`, `@regression`, `@slow`, `@visual`, and `@flaky-quarantine` are supported by convention but not yet applied, so `npm run test:smoke` currently matches nothing.

`email-testing.spec.ts` conditionally registers its send/reply/forward groups only when `MAILOSAUR_VERIFIED_EMAIL` is set, since Mailosaur requires a verified sender.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. `.env` is gitignored; `.env.example` is committed with names only.

| Variable                                 | Required by                            | Purpose                                                                     |
| ---------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| `BASE_URL`                               | config                                 | Target site; defaults to `https://automationexercise.com`                   |
| `AUTOMATION_EXERCISE_TEST_EMAIL_1..4`    | account pool                           | Pooled worker accounts                                                      |
| `AUTOMATION_EXERCISE_TEST_PASSWORD_1..4` | account pool                           | Matching passwords                                                          |
| `MAILOSAUR_API_KEY`                      | `@utils/mailosaur`, `EmailTestingPage` | Mailosaur API key                                                           |
| `MAILOSAUR_SERVER_ID`                    | `@utils/mailosaur`, `EmailTestingPage` | Mailosaur test server id                                                    |
| `MAILOSAUR_VERIFIED_EMAIL`               | optional                               | Enables send/reply/forward email tests                                      |
| `LOG_LEVEL`                              | `@utils/logger`                        | File log level: `error`, `warn`, `info`, `debug`                            |
| `LOG_CONSOLE_LEVEL`                      | `@utils/logger`                        | Console level, or `off` to silence console output                           |
| `LOG_DIR`                                | `@utils/logger`                        | Directory for `combined.log` and `error.log`                                |
| `LOG_TO_FILE`                            | `@utils/logger`                        | `false` disables the log files                                              |
| `PW_WORKERS`                             | config                                 | Local worker count; defaults to `2` (override with `PW_WORKERS=4 npm test`) |

`readUserPool()` throws a clear error when an email is present without its password, or when the pool would be empty.

---

## Getting Started

```bash
# 1. Use the pinned Node version
nvm use            # reads .nvmrc (Node 22)

# 2. Install dependencies
npm ci

# 3. Install the Chromium build
npx playwright install --with-deps chromium

# 4. Create local environment
cp .env.example .env   # then fill in credentials

# 5. Verify the framework loads without launching a browser
npx playwright test --list

# 6. Run
npm run test
```

On Windows use `copy .env.example .env`.

---

## npm Scripts

| Script                     | Command                            | Purpose                                        |
| -------------------------- | ---------------------------------- | ---------------------------------------------- |
| `npm test`                 | `playwright test`                  | Run the suite                                  |
| `npm run test:headed`      | `playwright test --headed`         | Watch the browser                              |
| `npm run test:ui`          | `playwright test --ui`             | Interactive UI mode                            |
| `npm run test:smoke`       | `playwright test --grep @smoke`    | Smoke subset                                   |
| `npm run test:debug`       | `playwright test --debug`          | Inspector step-through                         |
| `npm run verify:lifecycle` | `jiti scripts/verify-lifecycle.ts` | Check that every executed test has log records |
| `npm run report`           | `playwright show-report`           | Open the HTML report                           |
| `npm run lint`             | `eslint .`                         | ESLint over the repo                           |
| `npm run format`           | `prettier --write .`               | Format                                         |
| `npm run format:check`     | `prettier --check .`               | Format check (used in CI)                      |
| `npm run typecheck`        | `tsc --noEmit`                     | Type check                                     |
| `npm run prepare`          | `husky install`                    | Install git hooks                              |

`lint-staged` runs `eslint --fix` and `prettier --write` on staged `*.{ts,tsx,js,jsx,json,md,css,html}` files.

---

## Running Tests

```bash
# Everything
npm test

# One spec
npx playwright test tests/ui-tests/checkout/place-order.spec.ts

# One test by title
npx playwright test -g "places an order"

# Layer only
npx playwright test tests/ui-tests --project=chromium
npx playwright test tests/api-tests --project=chromium

# Tag-based
npx playwright test --grep @smoke
npx playwright test --grep-invert @flaky-quarantine

# Flake soak (required before merge for new/changed tests)
npx playwright test --repeat-each=10

# Static-only verification (no browser)
npx playwright test --list

# Check that every executed test produced a start and a finish log record
npm run verify:lifecycle
```

---

## Performance & Runtime

**Reference machine** — Intel Core i3-3110M @ 2.4 GHz, **2 physical cores / 4 logical processors** (hyper-threading), 7.8 GB RAM, Node 22.

### Worker count

`playwright.config.ts` uses `workers: Number(process.env.PW_WORKERS ?? 2)` locally and `50%` in CI. One worker drives one Chromium instance _and_ a Node process, so the useful ceiling is the number of **physical** cores, not logical processors — hyper-threading adds no browser capacity.

| Workers | Result on the reference machine                                                                            |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| 2       | 45/45 passed in 6.4 min                                                                                    |
| 3       | Not measured; the only sensible step above 2 (`PW_WORKERS=3 npm test`)                                     |
| 4       | Browser starvation: `Tearing down "context" exceeded the test timeout`, `browserContext.close: Test ended` |

With 4 workers, 4 Chromium instances and 4 Node workers compete for 2 physical cores at 2.4 GHz. The browsers become slow enough that Playwright's own teardown exceeds the test timeout, which is reported as a test failure even though the application under test is fine. Do not raise the worker count above the physical core count.

### Why a full run takes ~6.5 minutes

The suite is **network-bound, not CPU-bound**: almost every test waits on the live site or on Mailosaur, so the workers are idle most of the time and extra workers buy little.

| Metric                                           | Value                       |
| ------------------------------------------------ | --------------------------- |
| Sum of the 45 test durations (the serial cost)   | 701 s (11.7 min)            |
| Wall clock with 2 workers                        | 385 s (6.4 min)             |
| Parallel speedup                                 | 1.82x (near the 2x ceiling) |
| Share of the total taken by the 12 slowest tests | ~10.6 min of the 11.7 min   |

The slowest tests are the Mailosaur specs, which poll the mail server on a fixed interval, and the checkout spec, which waits for the live site. Their cost is per-test latency, so the only ways to shorten the run are fewer polling intervals (a behavioural change) or a faster target site — not more workers.

Per-test timings are in the log: every `test finished` record carries `durationMs`.

### Reading a run

```bash
# The slowest tests of the last run
node -e "const l=require('fs').readFileSync('logs/combined.log','utf8').trim().split('\n').map(JSON.parse).filter(r=>r.message==='test finished'&&r.context.testKey);l.sort((a,b)=>b.context.durationMs-a.context.durationMs).forEach(r=>console.log(String(r.context.durationMs).padStart(7),r.context.testTitle))"

# Every test of the run, with its status
npm run verify:lifecycle
```

---

## Code Quality

### ESLint (`eslint.config.ts`, flat config, type-checked)

Ignores `node_modules/`, `test-results/`, `playwright-report/`, `blob-report/`, `.auth/`, `.playwright-mcp/`, and the agent worktree directories.

`eslint-plugin-playwright` recommended rules promoted to errors:

`missing-playwright-await`, `no-wait-for-timeout`, `no-networkidle`, `no-wait-for-selector`, `no-focused-test`, `no-skipped-test`, `no-force-option`, `no-page-pause`, `no-element-handle`, `no-eval`, `no-nth-methods`, `prefer-web-first-assertions`, `expect-expect`, `no-conditional-in-test`.

TypeScript rules: `no-explicit-any`, `no-floating-promises`, `no-unused-vars` (`^_` prefixed args allowed).

Boundary rule: specs may not import `test`/`expect` from `@playwright/test`.

### Prettier

```json
{ "singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 100 }
```

---

## CI/CD Pipeline

`.github/workflows/playwright.yml` — triggers on push to `main`/`master` and on every pull request, with `concurrency: e2e-${{ github.ref }}` and `cancel-in-progress: true`.

**Job 1 — `quality` (gate)**
`npm ci` → `tsc --noEmit` → `eslint .` → `prettier --check .`

**Job 2 — `e2e` (4 shards, `fail-fast: false`, 60 min timeout)**

- `needs: quality`, so a lint failure never burns browser minutes
- `npm ci` → `npx playwright install --with-deps chromium` (no browser caching)
- `npx playwright test --shard=<n>/4`
- `npm run verify:lifecycle` — fails the shard when an executed test has no lifecycle record
- Secrets injected from the GitHub secret store (pool credentials + Mailosaur)
- `BASE_URL` set from workflow-level `env`
- Uploads on every run, including cancellation: shard HTML report, `test-results/` + `blob-report/`, `results.xml`, and the Winston `logs/` directory (7-day retention)

**Job 3 — `merge-reports`**
Downloads shard artifacts, flattens the `blob-report/*.zip` files, runs `npx playwright merge-reports blob-reports --reporter html,junit` with `PLAYWRIGHT_JUNIT_OUTPUT_NAME=merged-results.xml`, and publishes the merged HTML report and JUnit XML.

`.github/workflows/copilot-setup-steps.yml` provisions Node and Playwright browsers for Copilot coding agents.

---

## Reporting & Artifacts

| Reporter           | Local                               | CI                                                        |
| ------------------ | ----------------------------------- | --------------------------------------------------------- |
| `html`             | `open: 'on-failure'`                | `open: 'never'`, merged at the end                        |
| `list`             | ✅                                  | —                                                         |
| `blob`             | —                                   | per shard, merged by `merge-reports`                      |
| `github`           | —                                   | per-shard inline annotations                              |
| `junit`            | —                                   | `results.xml` per shard, `merged-results.xml` after merge |
| `line`             | —                                   | ✅                                                        |
| `json`             | `test-results/results-<runId>.json` | `test-results/results-<runId>.json` per shard             |
| `logging-reporter` | ✅                                  | ✅ (writes the test lifecycle to `logs/`)                 |

Artifacts live in `test-results/` (traces, screenshots, video, `results-<runId>.json`) and `playwright-report/`. Traces and videos are the primary debugging material for a CI failure — read the trace instead of adding waits.

Winston writes `logs/combined.log` and `logs/error.log` (JSON lines) next to the other artifacts; every record is redacted before it is written.

---

## Locator Strategy

Priority order, stopping at the first that uniquely identifies the element:

1. **Role + accessible name** — `getByRole('button', { name: 'Add to cart' })`
2. **Label / placeholder** — `getByLabel('Email *')`, `getByPlaceholder('Name')`
3. **Text / alt / title** — `getByText('Cart is empty!')`
4. **Test id** — `getByTestId(...)`
5. **Scoping and filtering** — `.filter({ hasText })`, `.filter({ has })`, `.or()`, scoped parent locators
6. **CSS on a stable attribute** — last resort, with a comment explaining why 1–5 fail

The site's own stable handles are used heavily: `[data-qa="login-email"]`, `[data-qa="login-password"]`, `[data-qa="signup-email"]`, `[data-qa="name-on-card"]`, `[data-qa="card-number"]`, `[data-qa="cvc"]`, `[data-qa="expiry-month"]`, `[data-qa="expiry-year"]`, `[data-qa="days"/"months"/"years"]`, `[data-qa="country"/"city"/"zipcode"]`, `#quantity`, `#submit_search`, `#cart_info_table`, `a.check_out`, `#address_delivery`, `#address_invoice`, `#email`, `#otp`, `#btn-send-otp`, `#btn-send-verify`, `#flash-message`, `#otp-message`.

**Never** use: XPath, `nth-child` chains, generated CSS classes, `{ force: true }`, or `.nth()`/`.first()`/`.last()` to paper over ambiguity. CSS escapes are documented in code where the site offers no accessible handle (for example, the checkout control renders as an `<a>` without `href` and therefore has no link role).

---

## Writing New Tests

```ts
import { expect, authenticatedTest as test } from '@fixtures';
import { getUserForWorker } from '@data/test-user.factory';

test.describe('Automation Exercise feature', () => {
  test(
    'does the user-visible thing',
    { tag: '@smoke' },
    async ({ page, productsPage, cartPage }, testInfo) => {
      const user = getUserForWorker(testInfo.workerIndex);

      await test.step('arrange', async () => {
        await page.goto('/');
        await productsPage.goto();
      });

      await test.step('act', async () => {
        await productsPage.addProductToCart('Blue Top');
      });

      await test.step('assert', async () => {
        await cartPage.expectLoaded();
        await expect(cartPage.getProductRow('Blue Top')).toHaveCount(1);
        expect(user.email).toContain('@');
      });
    },
  );
});
```

Checklist:

- [ ] One behavior per test; Arrange–Act–Assert visibly separated
- [ ] `test.step()` for multi-step flows so reports and traces stay readable
- [ ] `test`/`expect` imported from `@fixtures`, never `@playwright/test`
- [ ] Locators live in a Page Object, not the spec
- [ ] `await`ed web-first assertions only; no `waitForTimeout`, no `networkidle`
- [ ] Data from a factory; created via API, cleaned in fixture teardown
- [ ] `test.skip` / `test.fixme` / `test.fail` carry a reason string (and a ticket when they hide a defect); `test.only` is never committed
- [ ] No new secrets in code; new env var names added to `.env.example`
- [ ] Verified statically: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npx playwright test --list`

---

## Debugging

| Goal                        | Command                                |
| --------------------------- | -------------------------------------- |
| Interactive UI mode         | `npm run test:ui`                      |
| Step through with Inspector | `npm run test:debug` or `PWDEBUG=1`    |
| Headed run                  | `npm run test:headed`                  |
| Open the last report        | `npm run report`                       |
| Re-run only failures        | `npx playwright test --last-failed`    |
| Re-run only changed files   | `npx playwright test --only-changed`   |
| Soak for flakes             | `npx playwright test --repeat-each=10` |
| Bootstrap a flow            | `npx playwright codegen <url>`         |
| Open a saved trace          | `npx playwright show-trace <path>`     |

`page.pause()` is never committed. CI failures should be diagnosed from the trace, not by raising timeouts or retries.

---

## Git Hooks

`husky` is wired through `npm run prepare`. This repository additionally ships `hooks/pre-commit`, which runs `lint-staged` (ESLint `--fix` plus Prettier on staged files only):

```bash
# macOS / Linux
cp hooks/pre-commit .git/hooks/pre-commit

# Windows (Git Bash)
cp hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Typecheck and the full suite run in CI, not in the hook.

---

## AI Agent Integration

- `AGENT.md` — the binding 25-section test-automation standard (locator priority, POM rules, auth pooling, data ownership, flakiness policy, CI layout, Definition of Done). Agents authoring tests here MUST conform to it.
- `AGENTS.md` — agent instructions and tool permissions.
- `.github/agents/` — Copilot agent definitions: `playwright-test-planner`, `playwright-test-generator`, `playwright-test-healer`.
- `.vscode/mcp.json` — Playwright MCP server (`npx playwright run-test-mcp-server`).
- `.kilo/agent-manager.json` — Kilo Agent Manager session/worktree state.
- `AGENT.md` §1.2 — the **no-browser rule**: agents write code but must not drive browsers, take screenshots, or run headed/UI/debug/codegen sessions. Static checks (`typecheck`, `lint`, `format:check`, `playwright test --list`) are the agent's verification surface; runtime verification belongs to CI and human reviewers.

---

## Troubleshooting

**`Cannot find module '@fixtures'`** — `tsconfig-paths/register` must load before module resolution. It is required at the top of `playwright.config.ts`; keep it there and do not import the config through a bundler.

**`Missing MAILOSAUR_API_KEY environment variable`** — copy `.env.example` to `.env` and fill in the Mailosaur key and server id, or export them in the shell that launches Playwright.

**`Login failed ... attempting to create account via API`** — the pool account does not exist on the target site. The fixture provisions it automatically; a persistent failure means the account password in the pool does not match, or the API rejected the payload.

**`No test user is available for worker N`** — worker index exceeded the pool, which means `workers` is greater than the number of pooled accounts. Reduce workers, or add another `AUTOMATION_EXERCISE_TEST_EMAIL_n` / `_PASSWORD_n` pair.

**Cart assertions fail intermittently** — a test is sharing a cart. Confirm the test is fully parallel-safe and that its account is worker-scoped rather than shared.

**The generated Mailosaur address is rejected by the site** — the `@=` prefix bug is already corrected in `generateEmailAddress()`; if you build addresses elsewhere, apply the same `@=` → `@` rewrite.

**`Project(s) "chromium" not found. Available projects: ""`** — Playwright did not load `playwright.config.ts`. The usual cause is running the command from a subdirectory: Playwright looks for the config in the current working directory only. Run it from the repository root, or point at the config explicitly with `--config="<repo>\playwright.config.ts"`.

**`ENOENT: no such file or directory, stat '<repo>\chromium'`** — the path aliases were registered with `tsconfig-paths/register` without arguments, and that helper reads the `--project` flag from `process.argv` and uses it as the directory that holds the tsconfig. `playwright.config.ts` therefore calls `register({ cwd: __dirname })` with an explicit cwd, which keeps the tsconfig.json as the single source of truth and makes `--project` usable again.

**`test.only` runs locally but not in CI** — expected. `forbidOnly: !!process.env.CI` rejects it in CI; remove the `.only`.

**`locator.click: Timeout 30000ms exceeded` on `#btn-send-otp`** — the live OTP site (`practice.expandtesting.com`) stalls on the "Send OTP Code" button when it is hit by several workers at once. The click itself succeeds; Playwright waits for the scheduled navigation that never arrives. This is site-side flakiness, not an application defect: the same test passes in 15 s when it is run on its own. Re-run the failed test before changing the code.

**A test is missing from the log** — run `npm run verify:lifecycle`. It names the test and the missing record. The usual cause is a worker that was killed mid-test; the `test started` record is then present without its `test finished` record.

**Stale auth files after a crash** — an aborted run can leave `.auth/worker-*.json` behind. The `workerAuthFile` fixture deletes its own file in teardown, and the exported `globalTeardown()` clears the directory; on a hard crash, delete `.auth/` manually.
