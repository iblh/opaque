const opaqueUrl = (process.env.OPAQUE_URL || 'http://localhost:3000').replace(/\/$/, '');
const serverId = process.env.SERVER_ID;
const token = process.env.SERVER_AGENT_TOKEN;
const intervalMs = Number(process.env.MOCK_AGENT_INTERVAL_MS || 2000);
const startedAt = Date.now();

if (!serverId || !token) {
  console.error('Missing SERVER_ID or SERVER_AGENT_TOKEN.');
  console.error('Example: SERVER_ID=... SERVER_AGENT_TOKEN=... npm run mock:server-agent');
  process.exit(1);
}

function nextStats() {
  const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
  const wave = (Math.sin(elapsedSeconds / 5) + 1) / 2;
  const jitter = Math.random() * 6;
  const cpu = clamp(18 + wave * 52 + jitter, 0, 100);
  const memoryTotal = 16 * 1024 ** 3;
  const memoryUsed = Math.round(memoryTotal * clamp(0.35 + wave * 0.32, 0, 0.9));
  const diskTotal = 512 * 1024 ** 3;
  const diskUsed = Math.round(diskTotal * 0.46);

  return {
    status: 'online',
    uptime: formatUptime(elapsedSeconds),
    cores: 8,
    load: [
      round(cpu / 100 * 2.2),
      round(cpu / 100 * 1.8),
      round(cpu / 100 * 1.4),
    ],
    cpu: round(cpu),
    memory: {
      used: memoryUsed,
      total: memoryTotal,
    },
    disk: {
      used: diskUsed,
      total: diskTotal,
    },
    network: {
      in: Math.round(24000 + wave * 420000 + Math.random() * 8000),
      out: Math.round(16000 + (1 - wave) * 260000 + Math.random() * 6000),
    },
    temperature: Math.round(38 + wave * 24),
  };
}

async function pushStats() {
  const stats = nextStats();
  const response = await fetch(`${opaqueUrl}/api/server/metrics`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      serverId,
      stats,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${body}`);
  }

  console.log(
    `[${new Date().toISOString()}] pushed ${serverId}: cpu=${stats.cpu}% memory=${Math.round((stats.memory.used / stats.memory.total) * 100)}%`,
  );
}

async function loop() {
  try {
    await pushStats();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] push failed: ${error.message}`);
  } finally {
    setTimeout(loop, Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 2000);
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds % 60}s`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(value * 10) / 10;
}

console.log(`Mock OPAQUE server agent posting to ${opaqueUrl}/api/server/metrics every ${intervalMs}ms.`);
loop();
