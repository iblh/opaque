import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '../..');

const dashboard = loadTypeScriptModule(path.join(webRoot, 'src/lib/dashboard.ts'));
const { normalizeDashboard } = dashboard;

// A legacy dashboard whose dissolved "today" root sat in a shared row beside
// "bookmarks". Upgrading must keep weather/calendar/markets in that same row,
// in today's column slot, rather than dropping them as new rows at the end.
function legacyDashboardWithPlacedToday() {
  return {
    id: 'dash-1',
    forest: [
      {
        root: 'bookmarks',
        branches: [],
        layout: { rowId: 'row-1', rowIndex: 0, colIndex: 0, widthPct: 50 },
      },
      {
        root: 'today',
        layout: { rowId: 'row-1', rowIndex: 0, colIndex: 1, widthPct: 50 },
        branches: [
          { id: 'w', name: 'Weather', moduleType: 'weather', enabled: true, config: { location: 'SF' } },
          { id: 'c', name: 'Calendar', moduleType: 'calendar', enabled: true, config: {} },
          { id: 'm', name: 'Markets', moduleType: 'markets', enabled: true, config: { symbols: ['SPY'] } },
        ],
      },
      {
        root: 'servers',
        branches: [],
        layout: { rowId: 'row-1', rowIndex: 0, colIndex: 2, widthPct: 50 },
      },
    ],
  };
}

function treeByRoot(forest, root) {
  return forest.find((tree) => tree.root === root);
}

test('legacy "today" root is dissolved into weather/calendar/markets', () => {
  const result = normalizeDashboard(legacyDashboardWithPlacedToday());
  const roots = result.forest.map((tree) => tree.root);

  assert.ok(!roots.includes('today'), 'today root should be gone');
  assert.ok(roots.includes('weather'));
  assert.ok(roots.includes('calendar'));
  assert.ok(roots.includes('markets'));
});

test('hoisted roots preserve each module config', () => {
  const result = normalizeDashboard(legacyDashboardWithPlacedToday());
  assert.equal(treeByRoot(result.forest, 'weather').branches[0].config.location, 'SF');
  assert.deepEqual(treeByRoot(result.forest, 'markets').branches[0].config.symbols, ['SPY']);
});

test('hoisted roots take over the legacy today slot in the same row', () => {
  const result = normalizeDashboard(legacyDashboardWithPlacedToday());

  const weather = treeByRoot(result.forest, 'weather').layout;
  const calendar = treeByRoot(result.forest, 'calendar').layout;
  const markets = treeByRoot(result.forest, 'markets').layout;

  // All three land in today's row, at consecutive columns from today's slot (1).
  for (const layout of [weather, calendar, markets]) {
    assert.equal(layout.rowId, 'row-1');
    assert.equal(layout.rowIndex, 0);
  }
  assert.deepEqual(
    [weather.colIndex, calendar.colIndex, markets.colIndex],
    [1, 2, 3],
    'weather/calendar/markets occupy today\'s column and the next two',
  );
});

test('sibling cells to the right of today shift over to avoid collision', () => {
  const result = normalizeDashboard(legacyDashboardWithPlacedToday());

  // bookmarks (col 0) stays; servers (was col 2, right of today at col 1)
  // shifts by N-1 = 2 → col 4, clear of the three hoisted cells at 1..3.
  assert.equal(treeByRoot(result.forest, 'bookmarks').layout.colIndex, 0);
  assert.equal(treeByRoot(result.forest, 'servers').layout.colIndex, 4);
});

test('no column collisions remain in the migrated row', () => {
  const result = normalizeDashboard(legacyDashboardWithPlacedToday());
  const rowCols = result.forest
    .filter((tree) => tree.layout && tree.layout.rowId === 'row-1')
    .map((tree) => tree.layout.colIndex);
  assert.equal(
    new Set(rowCols).size,
    rowCols.length,
    `colIndexes within a row must be unique, got ${JSON.stringify(rowCols.sort((a, b) => a - b))}`,
  );
});

test('a "today" root with no layout still dissolves (no placement to preserve)', () => {
  const result = normalizeDashboard({
    id: 'dash-2',
    forest: [
      {
        root: 'today',
        branches: [
          { id: 'w', name: 'Weather', moduleType: 'weather', enabled: true, config: {} },
        ],
      },
    ],
  });
  const roots = result.forest.map((tree) => tree.root);
  assert.ok(!roots.includes('today'));
  assert.equal(treeByRoot(result.forest, 'weather').branches.length, 1);
});

// --- TypeScript module loader that resolves "@/..." imports recursively. ---
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
      const target = resolveSpecifier(specifier);
      if (!target) {
        throw new Error(`Unexpected runtime import in ${resolved}: ${specifier}`);
      }
      return loadTypeScriptModule(target, cache);
    },
  };

  vm.runInNewContext(outputText, sandbox, { filename: resolved });
  cache.set(resolved, cjsModule.exports);
  return cjsModule.exports;
}

function resolveSpecifier(specifier) {
  if (!specifier.startsWith('@/')) return null;
  const base = path.join(webRoot, 'src', specifier.slice(2));
  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
