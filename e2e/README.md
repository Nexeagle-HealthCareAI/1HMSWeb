# End-to-end tests (Playwright)

These drive a real browser against a real environment (Dev by default). Copy `e2e/.env.e2e.example` to
`e2e/.env.e2e` (gitignored) and fill it in, then:

```bash
npx playwright install chromium     # once
npm run test:e2e                    # everything
npx playwright test --project=onboarding   # only the sign-up and onboarding journey
```

| Project | What | Needs |
|---|---|---|
| `setup` + `chromium` | Specs that start signed in (`auth.setup.ts` logs in once) | `E2E_BASE_URL`, `E2E_LOGIN_EMAIL`, `E2E_LOGIN_PASSWORD` |
| `onboarding` | `registration-onboarding.spec.ts`: resets a tester number, then signs up and onboards a hospital from scratch | `E2E_BASE_URL`, `E2E_TESTER_MOBILE`, `E2E_TESTER_RESET_KEY` (skipped without them) |

The onboarding journey uses a **tester number** (1HMSAPI `docs/TESTER-ACCOUNTS.md`): on Dev its sign-in code is shown
on the page, nothing is sent on WhatsApp, and `POST /internal/tester-accounts/reset` wipes it so the same number can
register again. It only works against a Development API; production has no tester numbers and no reset route.

Reports: `e2e/report/index.html` (traces, screenshots and video are kept for failures).
