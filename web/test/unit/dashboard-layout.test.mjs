import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '../..');
const sourcePath = path.join(webRoot, 'src/lib/dashboardLayout.ts');

const dashboardLayout = loadTypeScriptModule(sourcePath);
const {
  getLayoutRows,
  moveTreeIntoRow,
  moveTreeToRowEdge,
} = dashboardLayout;

test('moveTreeIntoRow uses the target index after removing the source cell', () => {
  const forest = [
    tree('A', 'row-1', 0, 0, 33.33),
    tree('B', 'row-1', 0, 1, 33.33),
    tree('C', 'row-1', 0, 2, 33.33),
  ];

  const next = moveTreeIntoRow(forest, 'A', 'row-1', 0, 'right');

  assert.deepEqual(rowCells(next), [['B', 'A', 'C']]);
});

test('moveTreeToRowEdge keeps adjacent solo-row drops in place', () => {
  const forest = [
    tree('A', 'row-a', 0, 0),
    tree('B', 'row-b', 1, 0),
    tree('C', 'row-c', 2, 0),
  ];

  assert.deepEqual(
    rowCells(moveTreeToRowEdge(forest, 'A', 'row-a', 'bottom')),
    [['A'], ['B'], ['C']],
  );
  assert.deepEqual(
    rowCells(moveTreeToRowEdge(forest, 'A', 'row-b', 'top')),
    [['A'], ['B'], ['C']],
  );
});

test('moveTreeToRowEdge adjusts target row index after removing a solo source row', () => {
  const forest = [
    tree('A', 'row-a', 0, 0),
    tree('B', 'row-b', 1, 0),
    tree('C', 'row-c', 2, 0),
  ];

  assert.deepEqual(
    rowCells(moveTreeToRowEdge(forest, 'A', 'row-c', 'top')),
    [['B'], ['A'], ['C']],
  );
  assert.deepEqual(
    rowCells(moveTreeToRowEdge(forest, 'A', 'row-c', 'bottom')),
    [['B'], ['C'], ['A']],
  );
});

function tree(root, rowId, rowIndex, colIndex, widthPct = 100) {
  return {
    root,
    branches: [],
    layout: {
      rowId,
      rowIndex,
      colIndex,
      widthPct,
    },
  };
}

function rowCells(forest) {
  return Array.from(getLayoutRows(forest), (row) => (
    Array.from(row.cells, (cell) => cell.tree.root)
  ));
}

function loadTypeScriptModule(filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  });
  const cjsModule = { exports: {} };
  const sandbox = {
    exports: cjsModule.exports,
    module: cjsModule,
    require: (specifier) => {
      throw new Error(`Unexpected runtime import in ${filename}: ${specifier}`);
    },
  };

  vm.runInNewContext(outputText, sandbox, { filename });
  return cjsModule.exports;
}
