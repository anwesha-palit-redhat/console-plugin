---
name: fix-cves
description: >-
  Fix CVE vulnerabilities in console-plugin across release branches. Use when
  the user asks to fix CVEs, resolve security vulnerabilities, patch SRVKP Jira
  tickets, or run dependency security fixes across release branches.
---

# Fix CVEs in Console Plugin

Batch-fix CVE vulnerabilities across one or more release branches, creating one
PR per branch with full verification evidence.

## Input

Two input modes are supported:

### Mode A: Paste Jira descriptions (no auth required)

The user pastes one or more Jira ticket descriptions directly into the chat.
Also expect:

- **Primary branch** (e.g. `release-v1.15.x`)
- **Additional branches** (optional)

Parse each pasted description to extract:

- **SRVKP ticket ID** — look for `SRVKP-\d+` in the text
- **CVE ID** — look for `CVE-\d{4}-\d{4,}` pattern
- **Vulnerable package name** — look for npm package names near keywords like
  "package", "component", "dependency", "module", or in a structured field
- **Fixed version** — look for version strings near "fixed in", "patched in",
  "upgrade to", ">=", or in a structured field

If any field is ambiguous or missing, ask the user to clarify before proceeding.

### Mode B: Fetch from Jira via MCP

The user provides SRVKP ticket IDs. For each, call the GitKraken MCP tool:

```
CallMcpTool: user-GitKraken / issues_get_detail
  provider: "jira"
  issue_id: "SRVKP-XXXX"
```

Extract the same fields (CVE ID, package name, fixed version) from the response.

### After parsing (both modes)

Collect all CVEs into a tracking table and present it to the user for
confirmation before proceeding:

```
| SRVKP      | CVE ID          | Package     | Fixed Version | Status  |
|------------|-----------------|-------------|---------------|---------|
| SRVKP-1234 | CVE-2024-12345 | micromatch  | 4.0.8         | pending |
```

## Phase 2: Branch Setup and Fix Loop

Process branches one at a time. For each branch:

### 2a. Checkout and clean install

```bash
git checkout <branch>
git pull origin <branch>
rm -rf node_modules
yarn install
```

**Critical**: Always `rm -rf node_modules` and reinstall for every branch to
avoid dependency tree cross-contamination.

### 2b. Create fix branch

```bash
git checkout -b fix/cve-batch-<branch>
```

### 2c. Analyze and fix each CVE

For each CVE, run the analysis script:

```bash
npx ts-node --project scripts/fix-cves/tsconfig.json \
  scripts/fix-cves/analyze-deps.ts \
  --package <pkg> --fixed-version <ver>
```

The script outputs JSON with a `strategy` field. Act on it:

#### Strategy: `direct-upgrade`

The package is a direct dependency (in `dependencies` or `devDependencies`).
Upgrade it:

```bash
yarn up <pkg>@<fixed-version>
```

Or edit the version in `package.json` directly if `yarn up` does not respect the
exact version, then run `yarn install`.

#### Strategy: `parent-upgrade`

The vulnerable package is transitive, but upgrading a direct parent to its
latest version pulls in the fix. The script provides `parentUpgradeSuggestions`
showing which parent to upgrade. For example:

```json
"parentUpgradeSuggestions": ["eslint@9.0.0 (pulls glob@10.3.0, satisfies 10.3.0)"]
```

Upgrade the suggested parent:

```bash
yarn up <parent-pkg>@<latest>
```

Then verify the transitive dep resolved to the fixed version.

#### Strategy: `resolution`

The package is transitive and no parent upgrade resolves it. Add or update the
`resolutions` field in `package.json`:

```json
"resolutions": {
  "<pkg>": "<fixed-version>"
}
```

Merge with existing resolutions (currently: `webpack`, `@types/d3-dispatch`,
`@types/d3-selection`). Then run `yarn install`.

**Resolutions are a last resort.** Only use when neither direct-upgrade nor
parent-upgrade is possible.

#### Strategy: `triage-needed`

The fixed version is not published on npm, or the SDK pins an incompatible
range.

**If Jira MCP is available (Mode B)**, add a comment:

```
CallMcpTool: user-GitKraken / issues_add_comment
  provider: "jira"
  issue_id: "SRVKP-XXXX"
  comment: |
    [CVE Bot] Automated analysis for <CVE-ID> on branch <branch>:

    Package: <pkg>
    Current version: <current>
    Requested fix version: <fixed-version>
    Available on npm: No / SDK constraint blocks upgrade

    This package is a transitive dependency of @openshift-console/dynamic-plugin-sdk.
    The fixed version is not available or not compatible with the current SDK version.

    Dependency chain:
    <paste relevant yarn why output>

    Please advise on next steps — should we wait for an upstream release, or
    accept a resolution override?
```

**If using paste mode (Mode A)**, print the triage comment to the user so they
can manually post it on the Jira ticket or forward it to the reporter.

Mark this CVE as `triaged` in the tracking table and skip it.

### 2d. Verify fixes

After all CVEs are processed for the branch, verify each fixed package:

```bash
yarn why <pkg>
npm ls --all <pkg> 2>/dev/null || true
```

Capture the output — it goes into the PR description as evidence.

If verification shows the vulnerable version still present, investigate:
- Check if another dependency re-introduces it
- May need an additional resolution entry
- Re-run analysis if needed

## Phase 3: Create PR

### 3a. Commit and push

```bash
git add package.json yarn.lock
git commit -m "$(cat <<'EOF'
fix(deps): resolve CVEs [SRVKP-XXXX, SRVKP-YYYY] on <branch>

Fixes: CVE-2024-XXXXX (<pkg1>), CVE-2024-YYYYY (<pkg2>)
EOF
)"
git push -u origin fix/cve-batch-<branch>
```

### 3b. Create the PR

Use `gh pr create` with a descriptive body:

```bash
gh pr create \
  --base <branch> \
  --title "fix(deps): resolve CVEs [SRVKP-XXXX, SRVKP-YYYY] on <branch>" \
  --body "$(cat <<'EOF'
## CVE Fixes

| SRVKP | CVE ID | Package | Old Version | New Version | Strategy |
|-------|--------|---------|-------------|-------------|----------|
| SRVKP-XXXX | CVE-2024-XXXXX | pkg1 | 1.0.0 | 1.0.1 | direct-upgrade |
| SRVKP-YYYY | CVE-2024-YYYYY | pkg2 | 2.0.0 | 2.0.1 | resolution |

## Triaged / Skipped

| SRVKP | CVE ID | Package | Reason |
|-------|--------|---------|--------|
| SRVKP-ZZZZ | CVE-2024-ZZZZZ | pkg3 | Fixed version not on npm; commented on ticket |

## Verification Evidence

### pkg1
<details>
<summary>yarn why pkg1</summary>

```
<paste yarn why output>
```
</details>

### pkg2
<details>
<summary>yarn why pkg2 / npm ls --all pkg2</summary>

```
<paste output>
```
</details>

EOF
)"
```

## Phase 4: Repeat for Additional Branches

For each additional branch the user specified:

1. Go back to Phase 2 (checkout, clean install, analyze, fix, verify)
2. Create a separate PR for each branch (Phase 3)

Fixes may differ between branches because dependency trees diverge across
releases. Always re-run the analysis script — do not assume the same fix applies.

## Shared Packages with OpenShift Console

The analysis script automatically detects packages shared with the console by
checking if they appear in the transitive dependency tree of:

- `@openshift-console/dynamic-plugin-sdk`
- `@openshift-console/dynamic-plugin-sdk-internal`
- `@openshift-console/dynamic-plugin-sdk-webpack`

When a vulnerable package is shared with the SDK:

1. **Check if the fixed version is available on npm** — the script does this
2. **If available**: use `resolution` to force it (the SDK will pick up the
   hoisted version)
3. **If not available**: triage with the Jira reporter (Phase 2c, `triage-needed`)
4. **Resolution is the last resort** — only when direct upgrade cannot work

## Checklist

Copy this checklist and track progress per branch:

```
Branch: release-vX.Y.x
- [ ] Checked out and clean-installed
- [ ] Created fix branch
- [ ] Analyzed all CVEs
- [ ] Applied fixes (direct-upgrade / resolution)
- [ ] Triaged unavailable fixes on Jira
- [ ] Verified all fixes with yarn why / npm ls
- [ ] Committed and pushed
- [ ] Created PR with evidence
```
