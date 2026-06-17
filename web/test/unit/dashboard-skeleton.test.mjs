import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '../..');

const skeleton = loadTypeScriptModule(path.join(webRoot, 'src/components/DashboardSkeleton.tsx'));
const { buildSkeletonForest } = skeleton;

// forest arrays come from inside the VM sandbox, so their prototypes differ
// from this realm's — compare by value via JSON to avoid deepStrictEqual's
// cross-realm reference check.
const eq = (actual, expected) => assert.equal(JSON.stringify(actual), JSON.stringify(expected));
const roots = (forest) => forest.map((tree) => tree.root);

test('buildSkeletonForest keeps only known built-in roots', () => {
  // A snapshot from another session that included a custom root must not
  // replay that user-named root into a pre-verification skeleton header.
  const forest = buildSkeletonForest([
    { roots: ['bookmarks', 'my-secret-project'], widths: [50, 50] },
    { roots: ['markets', 'calendar'], widths: [50, 50] },
  ]);
  eq(roots(forest), ['bookmarks', 'markets', 'calendar']);
  assert.ok(!roots(forest).includes('my-secret-project'));
});

test('a row of only custom roots is dropped entirely', () => {
  const forest = buildSkeletonForest([
    { roots: ['custom-a', 'custom-b'], widths: [50, 50] },
    { roots: ['posts'], widths: [100] },
  ]);
  eq(roots(forest), ['posts']);
});

test('kept roots after filtering get sequential rowIndex/colIndex and their width', () => {
  const forest = buildSkeletonForest([
    { roots: ['custom-x'], widths: [100] }, // dropped row
    { roots: ['bookmarks', 'leaked', 'weather'], widths: [30, 40, 30] },
  ]);
  // The dropped row must not leave a gap in rowIndex.
  eq(forest.map((t) => t.layout.rowIndex), [0, 0]);
  eq(forest.map((t) => t.root), ['bookmarks', 'weather']);
  eq(forest.map((t) => t.layout.colIndex), [0, 1]);
  // Each kept root keeps its own column width (30 and 30 here), not the
  // dropped one's (40).
  eq(forest.map((t) => t.layout.widthPct), [30, 30]);
});

test('default frame (no args) is all known roots', () => {
  const forest = buildSkeletonForest();
  assert.ok(forest.length > 0);
  assert.ok(roots(forest).every((root) => (
    ['bookmarks', 'applications', 'servers', 'weather', 'calendar', 'markets', 'media', 'posts'].includes(root)
  )));
});

// --- TypeScript module loader that resolves "@/..." imports recursively. ---
function loadTypeScriptModule(filename, cache = new Map()) {
  const resolved = path.resolve(filename);
  if (cache.has(resolved)) return cache.get(resolved);

  const source = fs.readFileSync(resolved, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
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
    // DashboardSkeleton imports React for JSX; the helpers under test don't
    // render, so a minimal stub satisfies the module factory.
    require: (specifier) => {
      if (specifier === 'react') return { default: {}, createElement: () => null };
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
