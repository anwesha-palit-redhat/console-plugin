#!/usr/bin/env npx ts-node --project scripts/fix-cves/tsconfig.json

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalysisResult {
  package: string;
  currentVersion: string | null;
  fixedVersion: string;
  isSharedWithSDK: boolean;
  dependencyChains: string[];
  /** Direct parent packages that pull this dep transitively. */
  directParents: string[];
  /** Whether upgrading a direct parent to its latest resolves the CVE. */
  parentUpgradeAvailable: boolean;
  parentUpgradeSuggestions: string[];
  fixedVersionAvailable: boolean;
  availableVersions: string[];
  strategy:
    | 'direct-upgrade'
    | 'parent-upgrade'
    | 'resolution'
    | 'triage-needed';
  reason: string;
  yarnWhyRaw: string;
}

interface CLIArgs {
  package: string;
  fixedVersion: string;
}

// ---------------------------------------------------------------------------
// SDK packages whose transitive deps are "shared with openshift-console"
// ---------------------------------------------------------------------------

const SDK_PACKAGES = [
  '@openshift-console/dynamic-plugin-sdk',
  '@openshift-console/dynamic-plugin-sdk-internal',
  '@openshift-console/dynamic-plugin-sdk-webpack',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  } catch (e: any) {
    return e.stdout ?? '';
  }
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  let pkg = '';
  let fixedVersion = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--package' && args[i + 1]) pkg = args[++i];
    else if (args[i] === '--fixed-version' && args[i + 1])
      fixedVersion = args[++i];
  }
  if (!pkg || !fixedVersion) {
    console.error(
      'Usage: analyze-deps.ts --package <name> --fixed-version <ver>',
    );
    process.exit(1);
  }
  return { package: pkg, fixedVersion };
}

/**
 * Run `yarn why <pkg>` and return raw output + parsed dependency chains.
 */
function getYarnWhy(pkg: string): { raw: string; chains: string[] } {
  const raw = run(`yarn why ${pkg} 2>&1`);
  const chains: string[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('=') && !trimmed.startsWith('Done')) {
      chains.push(trimmed);
    }
  }
  return { raw, chains };
}

/**
 * Determine if a package is a transitive dependency of any SDK package
 * by inspecting `yarn why` output for SDK package names in the chains.
 */
function isTransitiveSDKDep(chains: string[]): boolean {
  return chains.some((chain) =>
    SDK_PACKAGES.some((sdk) => chain.includes(sdk)),
  );
}

/**
 * Get the currently installed version from node_modules or yarn.lock.
 */
function getCurrentVersion(pkg: string): string | null {
  const nmPath = path.join(
    process.cwd(),
    'node_modules',
    ...pkg.split('/'),
    'package.json',
  );
  if (fs.existsSync(nmPath)) {
    try {
      const pj = JSON.parse(fs.readFileSync(nmPath, 'utf-8'));
      return pj.version ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Fetch available versions from the npm registry.
 */
function getAvailableVersions(pkg: string): string[] {
  const output = run(`npm view ${pkg} versions --json 2>/dev/null`);
  try {
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

/**
 * Check if this package is a direct dependency or devDependency
 * (as opposed to only transitive).
 */
function isDirectDep(pkg: string): boolean {
  const pjPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(pjPath)) return false;
  const pj = JSON.parse(fs.readFileSync(pjPath, 'utf-8'));
  return !!(pj.dependencies?.[pkg] || pj.devDependencies?.[pkg]);
}

/**
 * Parse `yarn why` chains to find the direct (top-level) packages that
 * transitively pull in the target package.
 */
function getDirectParents(pkg: string): string[] {
  const pjPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(pjPath)) return [];
  const pj = JSON.parse(fs.readFileSync(pjPath, 'utf-8'));
  const allDirect = new Set([
    ...Object.keys(pj.dependencies ?? {}),
    ...Object.keys(pj.devDependencies ?? {}),
  ]);

  const output = run(`yarn why ${pkg} 2>&1`);
  const parents = new Set<string>();
  for (const line of output.split('\n')) {
    for (const dep of allDirect) {
      if (line.includes(dep)) parents.add(dep);
    }
  }
  parents.delete(pkg);
  return [...parents];
}

/**
 * For a transitive dep, check whether upgrading any direct parent to its
 * latest version would pull in the fixed version. Returns upgrade suggestions.
 */
function checkParentUpgrades(
  pkg: string,
  fixedVersion: string,
  directParents: string[],
): string[] {
  const suggestions: string[] = [];
  for (const parent of directParents) {
    const latest = run(`npm view ${parent} version 2>/dev/null`).trim();
    if (!latest) continue;
    const depField = run(
      `npm view ${parent}@${latest} dependencies --json 2>/dev/null`,
    ).trim();
    if (!depField) continue;
    try {
      const deps = JSON.parse(depField);
      const range: string | undefined = deps[pkg];
      if (range) {
        const satisfies = run(
          `node -e "try{const s=require('semver');console.log(s.satisfies('${fixedVersion}','${range}'))}catch{console.log('unknown')}"`,
        ).trim();
        if (satisfies === 'true') {
          suggestions.push(
            `${parent}@${latest} (pulls ${pkg}@${range}, satisfies ${fixedVersion})`,
          );
        }
      }
    } catch {
      // skip
    }
  }
  return suggestions;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = parseArgs();
  const { raw: yarnWhyRaw, chains } = getYarnWhy(args.package);
  const currentVersion = getCurrentVersion(args.package);
  const sharedWithSDK = isTransitiveSDKDep(chains);
  const versions = getAvailableVersions(args.package);
  const fixedAvailable = versions.includes(args.fixedVersion);
  const direct = isDirectDep(args.package);
  const directParents = direct ? [] : getDirectParents(args.package);
  const parentSuggestions = direct
    ? []
    : checkParentUpgrades(args.package, args.fixedVersion, directParents);

  let strategy: AnalysisResult['strategy'];
  let reason: string;

  if (!fixedAvailable) {
    strategy = 'triage-needed';
    reason = `Fixed version ${args.fixedVersion} not published on npm`;
  } else if (direct) {
    strategy = 'direct-upgrade';
    reason = sharedWithSDK
      ? 'Direct dependency also pulled by SDK; upgrade directly, SDK will use the hoisted version'
      : 'Direct dependency — safe to upgrade';
  } else if (parentSuggestions.length > 0) {
    strategy = 'parent-upgrade';
    reason = `Upgrading a direct parent pulls in the fix: ${parentSuggestions.join(
      '; ',
    )}`;
  } else if (sharedWithSDK) {
    strategy = 'resolution';
    reason =
      'Transitive dep of SDK; no parent upgrade resolves it — use resolutions to force the fixed version';
  } else {
    strategy = 'resolution';
    reason =
      'Transitive dependency; no parent upgrade resolves it — use resolutions as last resort';
  }

  const result: AnalysisResult = {
    package: args.package,
    currentVersion,
    fixedVersion: args.fixedVersion,
    isSharedWithSDK: sharedWithSDK,
    dependencyChains: chains,
    directParents,
    parentUpgradeAvailable: parentSuggestions.length > 0,
    parentUpgradeSuggestions: parentSuggestions,
    fixedVersionAvailable: fixedAvailable,
    availableVersions: versions.slice(-20),
    strategy,
    reason,
    yarnWhyRaw,
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
