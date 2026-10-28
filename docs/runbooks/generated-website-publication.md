# Generated website publication

`.github/workflows/update-websites-json.yml` generates `data/websites.json` and
`apps/web/public/search/search-index.json` after relevant pushes to `main` or
manual dispatch. Generation checks out the event SHA with read-only permissions
and credential persistence disabled. Dependency installation and generators never
receive `PAT_TOKEN`.

Publication uses a separate GitHub-hosted runner without checkout, installation,
or repository script execution. A pinned artifact action downloads the two files.
The inline publisher runs isolated Python, rejects unexpected files, symlinks,
missing or oversized files, and invalid JSON arrays. It uses the
[GitHub tree API](https://docs.github.com/en/rest/git/trees#create-a-tree)
to construct changes for exactly the two fixed paths with regular-file mode,
preserving the source commit's other files. Artifact strings are data only.

The publisher introduces the existing `PAT_TOKEN` only in that final step. This
retains the current protected-main publication policy without giving the token
to repository or dependency code. If `main` advances after generation, the run
fails instead of rebasing stale data; rerun the workflow on the latest `main`.
The final reference update never forces concurrent changes. Identical generated
data creates no commit. Publication commits retain `[skip ci]`.

## Verification

```sh
actionlint .github/workflows/update-websites-json.yml .github/workflows/pr-review.yml
python3 scripts/test-generated-publication.py
pnpm test:repo
```

The Python tests execute the actual inline workflow code against a mocked GitHub
API with a synthetic credential. They cover successful publication, fixed path
and mode enforcement, unchanged output, stale and concurrent changes, malicious
extra files, symlink files and directories, invalid JSON, and missing or oversized
artifacts. PR Review runs these tests automatically. They do not prove live PAT
permissions or GitHub branch ruleset behavior.

## Credential follow-up

After deploying this workflow, rotate the previously exposed PAT. Coordinate
rotation with its other consumers, including `update-llms-list.yml`; that
workflow's similar exposure is tracked separately in
[DAV-632](https://paperclip.lab.coolio.cloud/DAV/issues/DAV-632).
Replace the shared administrator PAT with a repository-scoped, short-lived
GitHub App installation token when the app and branch policy are provisioned.
No new credentials or repository settings are required for this code change.

The selected finding and local remediation are tracked in
[DAV-631](https://paperclip.lab.coolio.cloud/DAV/issues/DAV-631).
