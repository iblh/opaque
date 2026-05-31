import assert from 'node:assert/strict';
import test from 'node:test';

const baseUrl = process.env.CONTRACT_BASE_URL || 'http://localhost:3000';

test('dashboard and metrics API contract', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const identifier = `contract-${suffix}`;
  const password = 'contract-password';

  const signup = await fetch(`${baseUrl}/api/user/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, name: 'Contract Test' }),
  });

  await assertStatus(signup, 201);
  const cookie = signup.headers.getSetCookie?.().join('; ') || signup.headers.get('set-cookie') || '';
  assert.ok(cookie, 'signup should set an auth cookie');

  const dashboardGet = await fetch(`${baseUrl}/api/dashboard/get`, {
    headers: { cookie },
  });
  await assertStatus(dashboardGet, 200);
  const dashboardBody = await dashboardGet.json();
  const roots = dashboardBody.dashboard.forest.map((tree) => tree.root);
  assert.deepEqual(roots.slice(0, 3), ['bookmarks', 'applications', 'servers']);

  const serverId = `server-${suffix}`;
  const dashboard = {
    ...dashboardBody.dashboard,
    forest: dashboardBody.dashboard.forest.map((tree) => (
      tree.root === 'servers'
        ? {
            ...tree,
            branches: [
              {
                id: serverId,
                name: 'Contract Server',
                url: 'ssh://contract',
                icon: '<svg viewBox="0 0 1 1"></svg>',
              },
            ],
          }
        : tree
    )),
  };

  const update = await fetch(`${baseUrl}/api/dashboard/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      cookie,
    },
    body: JSON.stringify({ dashboard }),
  });
  await assertStatus(update, 200);

  const roundtrip = await fetch(`${baseUrl}/api/dashboard/get`, {
    headers: { cookie },
  });
  await assertStatus(roundtrip, 200);
  const roundtripBody = await roundtrip.json();
  const roundtripServer = roundtripBody.dashboard.forest
    .find((tree) => tree.root === 'servers')
    .branches
    .find((server) => server.id === serverId);
  assert.equal(roundtripServer.name, 'Contract Server');

  const rotate = await fetch(`${baseUrl}/api/server/token/rotate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie,
    },
    body: JSON.stringify({ serverId }),
  });
  await assertStatus(rotate, 200);
  const { token } = await rotate.json();
  assert.match(token, /^opaque_srv_/);

  const stats = {
    status: 'online',
    uptime: '1m',
    cores: 4,
    load: [0.1, 0.2, 0.3],
    cpu: 12.5,
    memory: { used: 1024, total: 2048 },
    disk: { used: 4096, total: 8192 },
    network: { in: 100, out: 200 },
    temperature: 42,
  };

  const push = await fetch(`${baseUrl}/api/server/metrics`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ serverId, stats }),
  });
  await assertStatus(push, 200);

  const metrics = await fetch(`${baseUrl}/api/server/metrics`, {
    headers: { cookie },
  });
  await assertStatus(metrics, 200);
  const metricsBody = await metrics.json();
  const reflected = metricsBody.servers.find((server) => server.id === serverId);
  assert.equal(reflected.stats.status, 'online');
  assert.equal(reflected.stats.cpu, 12.5);
});

async function assertStatus(response, expected) {
  if (response.status !== expected) {
    assert.equal(response.status, expected, await response.text());
  }
}
