import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(read(path));
}

function fail(message) {
  failures.push(message);
}

function requireText(path, content, needle, description) {
  if (!content.includes(needle)) fail(`${path}: ${description}`);
}

function requireAnyText(path, content, needles, description) {
  if (!needles.some((needle) => content.includes(needle))) fail(`${path}: ${description}`);
}

function lockfileDependencyKey(name) {
  return [`      ${name}:`, `      '${name}':`, `      "${name}":`];
}

function checkExactDependencyVersions(path) {
  const pkg = readJson(path);
  const dependencyGroups = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

  for (const group of dependencyGroups) {
    const dependencies = pkg[group] ?? {};
    for (const [name, version] of Object.entries(dependencies)) {
      if (typeof version !== 'string') {
        fail(`${path}: ${group}.${name} must use a string version`);
        continue;
      }

      if (/^(workspace:|file:|link:)/.test(version)) continue;
      if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
        fail(`${path}: ${group}.${name} must be pinned to an exact version, got ${version}`);
      }
    }
  }
}

function checkLockedDependencies(packagePath, dependencies, groupDescription) {
  for (const [name, version] of Object.entries(dependencies ?? {})) {
    requireAnyText(
      'pnpm-lock.yaml',
      lockfile,
      lockfileDependencyKey(name),
      `${groupDescription} ${name} must be present in the lockfile importer`,
    );
    requireText('pnpm-lock.yaml', lockfile, `specifier: ${version}`, `${groupDescription} ${name} must keep lockfile specifier ${version}`);
  }
}

const rootPackage = readJson('package.json');
if (rootPackage.packageManager !== 'pnpm@9.15.0') {
  fail('package.json: packageManager must pin pnpm@9.15.0');
}

if (!rootPackage.engines || rootPackage.engines.node !== '>=22.0.0 <23.0.0') {
  fail('package.json: engines.node must pin the supported Node 22.x range');
}

checkExactDependencyVersions('package.json');
checkExactDependencyVersions('apps/web/package.json');

const lockfile = read('pnpm-lock.yaml');
requireText('pnpm-lock.yaml', lockfile, "lockfileVersion: '9.0'", 'lockfile version must stay on pnpm v9 format');
requireText('pnpm-lock.yaml', lockfile, '  .:', 'root importer must remain locked');
requireText('pnpm-lock.yaml', lockfile, '  apps/web:', 'web app importer must remain locked');

checkLockedDependencies('package.json', rootPackage.dependencies, 'root dependency');
checkLockedDependencies('package.json', rootPackage.devDependencies, 'root devDependency');

const webPackage = readJson('apps/web/package.json');
checkLockedDependencies('apps/web/package.json', webPackage.dependencies, 'web dependency');
checkLockedDependencies('apps/web/package.json', webPackage.devDependencies, 'web devDependency');

const workflowPaths = [
  '.github/workflows/web-verify.yml',
  '.github/workflows/web-e2e.yml',
  '.github/workflows/pages-auth-smoke.yml',
  '.github/workflows/pages-api-smoke.yml',
  '.github/workflows/d1-schema-inspect.yml',
  '.github/workflows/android-debug-apk.yml',
];

for (const workflowPath of workflowPaths) {
  const workflow = read(workflowPath);
  requireText(workflowPath, workflow, 'node-version: 22', 'workflow must pin Node 22');
  requireText(workflowPath, workflow, 'version: 9.15.0', 'workflow must pin pnpm 9.15.0');
  requireText(workflowPath, workflow, 'pnpm install --frozen-lockfile', 'workflow must install with a frozen lockfile');
}

const verifyScript = rootPackage.scripts?.verify ?? '';
requireText('package.json', verifyScript, 'pnpm check:dependency-pins', 'root verify must run dependency pin checks');

if (failures.length) {
  console.error('Dependency pin contract checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Dependency pin contract checks passed.');
}
