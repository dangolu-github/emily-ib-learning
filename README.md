# Emily IB Learning

Learner-safe static portal for Emily’s IB English A: Language and Literature classes.

The public repository contains class pages and handouts only. Student answers, drafts, grades, teacher feedback, access verification, and monitoring remain in the owner-only Google teacher workspace.

## Publishing boundary

- Public: GitHub Pages source in this repository.
- Private: Google Apps Script service and teacher dashboard.
- Evidence: publication does not prove homework completion, checking, revision, or mastery.

## Temporary mainland mirror

GitHub `main` remains canonical. `npm run build:cloudbase` creates
`cloudbase-dist/` from an explicit learner-only allowlist. It excludes the
teacher route, Edge Functions, repository operations, planning files, private
records, and backend source.

GitHub Actions deploys only this build to the isolated
`/emily-ib-learning/` path of the temporary Tencent CloudBase mirror. The
workflow verifies `deployment-meta.json` against the pushed commit before
reporting success. It uses a dedicated, environment-bound CloudBase server API
Key stored only as GitHub Secrets `TCB_API_KEY` and `TCB_ENV_ID`; it does not
use CAM `SecretId`/`SecretKey` credentials. Rotate the current key before
2027-01-24 02:15:39 UTC.
