import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ServerStats } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const expectedToken = process.env.SERVER_INGEST_TOKEN;
    const token = bearerToken(request) || request.headers.get('x-server-token');

    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const serverId = String(body.serverId || '').trim();

    if (!serverId) {
      return NextResponse.json({ error: 'serverId is required' }, { status: 400 });
    }

    const stats = normalizeStats(body.stats || body);
    const db = await getDb();
    const result = await db.collection('dashboards').updateOne(
      {
        'forest.root': 'servers',
        'forest.branches.id': serverId,
      },
      {
        $set: {
          'forest.$[tree].branches.$[server].stats': stats,
          updatedAt: new Date(),
        },
      },
      {
        arrayFilters: [
          { 'tree.root': 'servers' },
          { 'server.id': serverId },
        ],
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'server not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, stats }, { status: 200 });
  } catch (error) {
    console.error('Server metrics ingest error:', error);
    return NextResponse.json({ error: 'failed to ingest metrics' }, { status: 500 });
  }
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function normalizeStats(input: any): ServerStats {
  const memory = input.memory || {};
  const disk = input.disk || {};
  const network = input.network || {};

  return {
    status: input.status === 'offline' ? 'offline' : 'online',
    uptime: String(input.uptime || ''),
    cores: numberOrUndefined(input.cores),
    load: Array.isArray(input.load)
      ? input.load.slice(0, 3).map((value: unknown) => Number(value)).filter(Number.isFinite)
      : undefined,
    cpu: clampPercent(input.cpu?.percent ?? input.cpu ?? input.cpuPercent),
    memory: {
      used: nonNegativeNumber(memory.used ?? input.memoryUsed),
      total: nonNegativeNumber(memory.total ?? input.memoryTotal),
    },
    disk: {
      used: nonNegativeNumber(disk.used ?? input.diskUsed),
      total: nonNegativeNumber(disk.total ?? input.diskTotal),
    },
    network: {
      in: nonNegativeNumber(network.in ?? input.networkIn),
      out: nonNegativeNumber(network.out ?? input.networkOut),
    },
    temperature: nonNegativeNumber(input.temperature),
    updatedAt: new Date(),
  };
}

function clampPercent(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function nonNegativeNumber(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, number);
}

function numberOrUndefined(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
