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

GitHub Actions deploys only this build at the root of the neutral
`english-teaching` CloudBase environment. Emily is the temporary learner
content in that environment; the environment and application names do not
contain a student identity. The workflow verifies `deployment-meta.json`
against the pushed commit before reporting success. It uses a dedicated,
environment-bound CloudBase server API Key stored only as GitHub Secrets
`TCB_API_KEY` and `TCB_ENV_ID`; it does not use CAM `SecretId`/`SecretKey`
credentials. The current deployment environment is
`english-teaching-d2efj867d048d06`, and its server API Key expires at
2026-08-28 00:15:31 (CloudBase console time).

Automatic synchronization is accepted only after a later documentation-only
push creates and serves a new CloudBase version whose `deployment-meta.json`
matches that pushed commit.

## Neutral environment verification

- Learner URL:
  `https://english-teaching-d2efj867d048d06-1308268428.tcloudbaseapp.com/`
- The root learner page, the learner access check, class pages, and the relay
  allowlist for homework draft/submission actions were verified on 2026-07-29.
- `/teacher/`, `/private/`, `/edge-functions/`, `/scripts/`, `/.git/`, and
  `/README.md` returned 404 from the learner hostname.
- EXPERTE.com reported the learner URL as not blocked from its Shanghai,
  Beijing, and Shenzhen nodes on 2026-07-29. This is a technical network check;
  Emily's real device/network acceptance remains required.
