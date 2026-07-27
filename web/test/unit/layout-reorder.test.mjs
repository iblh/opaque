import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '../..');

const layouts = loadTypeScriptModule(path.join(webRoot, 'src/lib/layouts.ts'));
const { LAYOUTS, canMoveWithinRegion, regionFor, reorderWithinRegion } = layouts;

// The dashboard stores a flat forest; the layout decides which column each root
// renders into. Reordering must therefore never change a root's region.
function forestOf(...roots) {
  return roots.map((root) => ({ root, branches: [] }));
}

function regionsOf(layout, forest) {
  return forest.map((tree) => `${tree.root}:${regionFor(layout, tree.root)}`);
}

test('moving a section down swaps it with the next one in the same column', () => {
  // In the journal layout weather/markets/applications all share the aside.
  const forest = forestOf('weather', 'markets', 'applications', 'posts');
  const next = reorderWithinRegion('journal', forest, 'weather', 1);

  const aside = next
    .filter((tree) => regionFor('journal', tree.root) === 'aside')
    .map((tree) => tree.root);
  assert.equal(aside.join(','), 'markets,weather,applications');
});

test('reordering never moves a section into a different column', () => {
  const forest = forestOf('weather', 'markets', 'applications', 'media', 'servers', 'posts');
  const before = new Map(forest.map((t) => [t.root, regionFor('journal', t.root)]));

  for (const root of ['weather', 'markets', 'applications', 'media', 'servers', 'posts']) {
    for (const direction of [-1, 1]) {
      const next = reorderWithinRegion('journal', forest, root, direction);
      for (const tree of next) {
        assert.equal(
          regionFor('journal', tree.root),
          before.get(tree.root),
          `${tree.root} changed column after moving ${root} by ${direction}`,
        );
      }
    }
  }
});

test('a section skips over modules that belong to other columns', () => {
  // posts and servers are 'main' in the journal layout, with aside roots
  // interleaved between them in the stored forest.
  const forest = forestOf('media', 'weather', 'servers', 'markets', 'posts');
  const next = reorderWithinRegion('journal', forest, 'posts', -1);

  const main = next
    .filter((tree) => regionFor('journal', tree.root) === 'main')
    .map((tree) => tree.root);
  assert.equal(main.join(','), 'media,posts,servers');
  // The aside modules keep their own relative order and their slots.
  const aside = next
    .filter((tree) => regionFor('journal', tree.root) === 'aside')
    .map((tree) => tree.root);
  assert.equal(aside.join(','), 'weather,markets');
});

test('moving past either end of a column is a no-op', () => {
  const forest = forestOf('weather', 'markets', 'posts');
  assert.equal(reorderWithinRegion('journal', forest, 'weather', -1), forest);
  assert.equal(reorderWithinRegion('journal', forest, 'markets', 1), forest);
});

test('canMoveWithinRegion agrees with what reordering actually does', () => {
  const forest = forestOf('weather', 'markets', 'applications', 'posts');
  for (const root of ['weather', 'markets', 'applications', 'posts']) {
    for (const direction of [-1, 1]) {
      const allowed = canMoveWithinRegion('journal', forest, root, direction);
      const changed = reorderWithinRegion('journal', forest, root, direction) !== forest;
      assert.equal(allowed, changed, `${root} ${direction}: control and effect disagree`);
    }
  }
});

test('a lone module in its column cannot move in either direction', () => {
  // 'lead' holds only weather in the ledger layout.
  const forest = forestOf('weather', 'servers', 'markets');
  assert.equal(canMoveWithinRegion('ledger', forest, 'weather', -1), false);
  assert.equal(canMoveWithinRegion('ledger', forest, 'weather', 1), false);
});

test('every layout declares a wordmark', () => {
  for (const [id, definition] of Object.entries(LAYOUTS)) {
    assert.equal(typeof definition.wordmark, 'string', `${id} is missing a wordmark`);
    assert.ok(definition.wordmark.length > 0, `${id} has an empty wordmark`);
  }
});

test('regions are stable regardless of stored forest order', () => {
  const a = forestOf('weather', 'markets', 'posts');
  const b = forestOf('posts', 'markets', 'weather');
  assert.equal(regionsOf('journal', a).sort().join('|'), regionsOf('journal', b).sort().join('|'));
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
      throw new Error(`Unexpected runtime import in ${resolved}: ${specifier}`);
    },
  };

  vm.runInNewContext(outputText, sandbox, { filename: resolved });
  cache.set(resolved, cjsModule.exports);
  return cjsModule.exports;
}
