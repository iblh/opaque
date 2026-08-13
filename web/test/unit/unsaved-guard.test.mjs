import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '../..');

// The guard protects an in-memory draft from in-app navigation (log out), which
// `beforeunload` cannot see. Its whole job is to be armed at exactly the right
// times, so the state machine is worth pinning down.
function loadGuard(confirmResult = true) {
  const calls = [];
  const guard = loadTypeScriptModule(path.join(webRoot, 'src/lib/unsavedGuard.ts'), {
    window: {
      confirm: (message) => {
        calls.push(message);
        return confirmResult;
      },
    },
  });
  return { guard, calls };
}

test('a clean editor never blocks navigation', () => {
  const { guard, calls } = loadGuard();
  assert.equal(guard.hasUnsavedWork(), false);
  assert.equal(guard.confirmDiscardUnsaved(), true);
  assert.equal(calls.length, 0, 'must not prompt when there is nothing to lose');
});

test('unsaved work prompts before navigation', () => {
  const { guard, calls } = loadGuard(true);
  guard.setUnsavedWork('Leave and discard?');
  assert.equal(guard.hasUnsavedWork(), true);
  assert.equal(guard.confirmDiscardUnsaved(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0], 'Leave and discard?');
});

test('declining the prompt cancels the navigation', () => {
  const { guard } = loadGuard(false);
  guard.setUnsavedWork('Leave and discard?');
  assert.equal(guard.confirmDiscardUnsaved(), false, 'caller must be told to stay');
});

test('clearing the flag disarms the guard', () => {
  const { guard, calls } = loadGuard();
  guard.setUnsavedWork('Leave and discard?');
  guard.setUnsavedWork(null);
  assert.equal(guard.hasUnsavedWork(), false);
  assert.equal(guard.confirmDiscardUnsaved(), true);
  assert.equal(calls.length, 0, 'a saved draft must not prompt');
});

test('the guard is inert on the server, where there is no window', () => {
  const guard = loadTypeScriptModule(path.join(webRoot, 'src/lib/unsavedGuard.ts'), {});
  guard.setUnsavedWork('Leave and discard?');
  // SSR has nothing to confirm with; it must not throw or wrongly block.
  assert.equal(guard.confirmDiscardUnsaved(), true);
});

function loadTypeScriptModule(filename, extraGlobals) {
  const resolved = path.resolve(filename);
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
  const sandbox = {
    exports: cjsModule.exports,
    module: cjsModule,
    ...extraGlobals,
    require: (specifier) => {
      throw new Error(`Unexpected runtime import in ${resolved}: ${specifier}`);
    },
  };

  vm.runInNewContext(outputText, sandbox, { filename: resolved });
  return cjsModule.exports;
}
