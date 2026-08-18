import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '../..');
const nodeRequire = createRequire(import.meta.url);
const { dashboardSchema, dashboardUpdateRequestSchema } = loadTypeScriptModule(
  path.join(webRoot, 'src/lib/schemas/dashboard.ts'),
);

function dashboardWith(treeOverrides = {}) {
  return {
    schemaVersion: 1,
    revision: 3,
    forest: [
      { root: 'bookmarks', branches: [] },
      { root: 'applications', branches: [] },
      { root: 'servers', branches: [] },
      {
        root: 'weather',
        branches: [{
          id: 'weather-1',
          name: 'Weather',
          moduleType: 'weather',
          enabled: true,
          config: { location: 'San Francisco', countryCode: 'US', units: 'imperial' },
        }],
        ...treeOverrides,
      },
      { root: 'calendar', branches: [] },
      { root: 'markets', branches: [] },
      { root: 'media', branches: [] },
      { root: 'posts', branches: [] },
    ],
  };
}

test('accepts a versioned dashboard with known module configuration', () => {
  assert.equal(dashboardSchema.safeParse(dashboardWith()).success, true);
});

test('rejects stale or missing revision metadata', () => {
  assert.equal(dashboardSchema.safeParse({ ...dashboardWith(), revision: 0 }).success, false);
  const withoutVersion = { ...dashboardWith() };
  delete withoutVersion.schemaVersion;
  assert.equal(dashboardSchema.safeParse(withoutVersion).success, false);
});

test('rejects invalid known-module configuration fields', () => {
  const dashboard = dashboardWith({
    branches: [{
      id: 'weather-1',
      name: 'Weather',
      moduleType: 'weather',
      config: { units: 'kelvin', invented: true },
    }],
  });

  const result = dashboardSchema.safeParse(dashboard);
  assert.equal(result.success, false);
  assert.match(result.error.issues.map((issue) => issue.message).join(' '), /Invalid option|Unrecognized key/);
});

test('rejects modules placed in the wrong section', () => {
  const dashboard = dashboardWith({
    branches: [{
      id: 'plex-1',
      name: 'Plex',
      moduleType: 'plex',
      config: { url: '', token: '' },
    }],
  });

  const result = dashboardSchema.safeParse(dashboard);
  assert.equal(result.success, false);
  assert.match(result.error.issues.map((issue) => issue.message).join(' '), /does not belong/);
});

test('rejects duplicate roots and unknown request fields', () => {
  const duplicate = dashboardWith();
  duplicate.forest.push({ root: 'weather', branches: [] });
  assert.equal(dashboardSchema.safeParse(duplicate).success, false);

  assert.equal(dashboardUpdateRequestSchema.safeParse({
    dashboard: dashboardWith(),
    bypassRevision: true,
  }).success, false);
});

function loadTypeScriptModule(filename, cache = new Map()) {
  const resolved = path.resolve(filename);
  if (cache.has(resolved)) return cache.get(resolved);

  const source = fs.readFileSync(resolved, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: resolved,
  });

  const cjsModule = { exports: {} };
  cache.set(resolved, cjsModule.exports);

  const sandbox = {
    exports: cjsModule.exports,
    module: cjsModule,
    crypto,
    require: (specifier) => {
      if (specifier.startsWith('@/')) {
        return loadTypeScriptModule(path.join(webRoot, 'src', `${specifier.slice(2)}.ts`), cache);
      }
      return nodeRequire(specifier);
    },
  };

  vm.runInNewContext(outputText, sandbox, { filename: resolved });
  cache.set(resolved, cjsModule.exports);
  return cjsModule.exports;
}
