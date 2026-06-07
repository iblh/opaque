import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

const baseUrl = process.env.CONTRACT_BASE_URL || 'http://localhost:3000';

test('dashboard, modules, and metrics API contract', async (t) => {
  const moduleMock = await startModuleMockServer();
  t.after(() => moduleMock.close());

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
  assert.deepEqual(
    roots.slice(0, 6),
    ['bookmarks', 'applications', 'servers', 'today', 'media', 'posts'],
  );

  const serverId = `server-${suffix}`;
  const moduleIds = {
    weather: `weather-${suffix}`,
    calendar: `calendar-${suffix}`,
    markets: `markets-${suffix}`,
    plex: `plex-${suffix}`,
    jellyfin: `jellyfin-${suffix}`,
    emby: `emby-${suffix}`,
    radarr: `radarr-${suffix}`,
    sonarr: `sonarr-${suffix}`,
    rss: `rss-${suffix}`,
    hackerNews: `hn-${suffix}`,
    reddit: `reddit-${suffix}`,
  };
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
        : tree.root === 'today'
          ? {
              ...tree,
              branches: [
                {
                  id: moduleIds.weather,
                  name: 'Contract Weather',
                  moduleType: 'weather',
                  enabled: true,
                  config: { location: 'San Francisco', units: 'imperial' },
                },
                {
                  id: moduleIds.calendar,
                  name: 'Contract Calendar',
                  moduleType: 'calendar',
                  enabled: true,
                  config: {},
                },
                {
                  id: moduleIds.markets,
                  name: 'Contract Markets',
                  moduleType: 'markets',
                  enabled: true,
                  config: { symbols: ['SPY'] },
                },
              ],
            }
          : tree.root === 'media'
            ? {
                ...tree,
                branches: [
                  {
                    id: moduleIds.plex,
                    name: 'Contract Plex',
                    moduleType: 'plex',
                    enabled: true,
                    config: { url: `${moduleMock.baseUrl}/plex`, token: 'plex-token' },
                  },
                  {
                    id: moduleIds.jellyfin,
                    name: 'Contract Jellyfin',
                    moduleType: 'jellyfin',
                    enabled: true,
                    config: { url: `${moduleMock.baseUrl}/jellyfin`, apiKey: 'jellyfin-key' },
                  },
                  {
                    id: moduleIds.radarr,
                    name: 'Contract Radarr',
                    moduleType: 'radarr',
                    enabled: true,
                    config: { url: `${moduleMock.baseUrl}/radarr`, apiKey: 'radarr-key' },
                  },
                  {
                    id: moduleIds.emby,
                    name: 'Contract Emby',
                    moduleType: 'emby',
                    enabled: true,
                    config: { url: `${moduleMock.baseUrl}/emby`, apiKey: 'emby-key' },
                  },
                  {
                    id: moduleIds.sonarr,
                    name: 'Contract Sonarr',
                    moduleType: 'sonarr',
                    enabled: true,
                    config: { url: `${moduleMock.baseUrl}/sonarr`, apiKey: 'sonarr-key' },
                  },
                ],
              }
          : tree.root === 'posts'
            ? {
                ...tree,
                branches: [
                  {
                    id: moduleIds.rss,
                    name: 'Contract RSS',
                    moduleType: 'rss',
                    enabled: true,
                    config: { feeds: [`${moduleMock.baseUrl}/feed.xml`], limit: 2 },
                  },
                  {
                    id: moduleIds.hackerNews,
                    name: 'Contract Hacker News',
                    moduleType: 'hacker-news',
                    enabled: true,
                    config: { feed: 'top', limit: 2 },
                  },
                  {
                    id: moduleIds.reddit,
                    name: 'Contract Reddit',
                    moduleType: 'reddit',
                    enabled: true,
                    config: { subreddit: 'selfhosted', sort: 'new', limit: 1 },
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

  const weatherBody = await getModuleData(cookie, moduleIds.weather);
  assert.equal(weatherBody.data.kind, 'weather');
  assert.equal(typeof weatherBody.data.temperature, 'number');

  const marketsBody = await getModuleData(cookie, moduleIds.markets);
  assert.equal(marketsBody.data.kind, 'markets');
  assert.equal(marketsBody.data.quotes[0].symbol, 'SPY');
  assert.ok(marketsBody.data.quotes[0].sparkline.length >= 2);

  const plexBody = await getModuleData(cookie, moduleIds.plex);
  assert.equal(plexBody.data.kind, 'media');
  assert.equal(plexBody.data.service, 'Plex');
  assert.equal(plexBody.data.libraries.find((library) => library.name === 'Movies').count, 24);
  assert.equal(plexBody.data.libraries.find((library) => library.name === 'TV').count, 13);
  assert.equal(plexBody.data.stats.find((stat) => stat.label === 'Streams').value, 2);
  assert.equal(plexBody.data.recent[0].title, 'Contract Movie');
  assert.match(plexBody.data.recent[0].imageUrl, /^\/api\/modules\/image\?/);
  await assertImage(cookie, plexBody.data.recent[0].imageUrl);

  const jellyfinBody = await getModuleData(cookie, moduleIds.jellyfin);
  assert.equal(jellyfinBody.data.service, 'Jellyfin');
  assert.equal(jellyfinBody.data.libraries.find((library) => library.name === 'Movies').count, 10);
  assert.equal(jellyfinBody.data.libraries.find((library) => library.name === 'TV').count, 40);
  assert.equal(jellyfinBody.data.stats.find((stat) => stat.label === 'Streams').value, 1);
  assert.equal(jellyfinBody.data.recent[0].title, 'Contract Episode');
  assert.match(jellyfinBody.data.recent[0].imageUrl, /^\/api\/modules\/image\?/);
  await assertImage(cookie, jellyfinBody.data.recent[0].imageUrl);

  const radarrBody = await getModuleData(cookie, moduleIds.radarr);
  assert.equal(radarrBody.data.service, 'Radarr');
  assert.equal(radarrBody.data.stats.find((stat) => stat.label === 'Queue').value, 2);
  assert.equal(radarrBody.data.recent[0].title, 'Contract Movie');
  assert.match(radarrBody.data.recent[0].imageUrl, /^\/api\/modules\/image\?/);
  await assertImage(cookie, radarrBody.data.recent[0].imageUrl);

  const embyBody = await getModuleData(cookie, moduleIds.emby);
  assert.equal(embyBody.data.service, 'Emby');
  assert.equal(embyBody.data.libraries.find((library) => library.name === 'Movies').count, 8);
  assert.equal(embyBody.data.libraries.find((library) => library.name === 'TV').count, 20);
  assert.equal(embyBody.data.recent[0].title, 'Contract Emby Item');

  const sonarrBody = await getModuleData(cookie, moduleIds.sonarr);
  assert.equal(sonarrBody.data.service, 'Sonarr');
  assert.equal(sonarrBody.data.stats.find((stat) => stat.label === 'Series').value, 1);
  assert.equal(sonarrBody.data.recent[0].title, 'Contract Series');

  const rssBody = await getModuleData(cookie, moduleIds.rss);
  assert.equal(rssBody.data.kind, 'posts');
  assert.equal(rssBody.data.posts[0].title, 'Contract feed item');

  const hackerNewsBody = await getModuleData(cookie, moduleIds.hackerNews);
  assert.equal(hackerNewsBody.data.kind, 'posts');
  assert.equal(hackerNewsBody.data.posts.length, 2);

  const redditBody = await getModuleData(cookie, moduleIds.reddit);
  assert.equal(redditBody.data.kind, 'posts');
  assert.equal(redditBody.data.posts[0].source, 'r/selfhosted');

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

  const unauthorizedPush = await fetch(`${baseUrl}/api/server/metrics`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}bad`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ serverId, stats: { cpu: 1 } }),
  });
  await assertStatus(unauthorizedPush, 401);

  const invalidJsonPush = await fetch(`${baseUrl}/api/server/metrics`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{',
  });
  await assertStatus(invalidJsonPush, 400);

  const dirtyPush = await fetch(`${baseUrl}/api/server/metrics`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      serverId,
      stats: {
        status: 'strange',
        uptime: 'x'.repeat(160),
        cores: -4,
        load: [0.1, 'bad', -1, 99],
        cpu: 250,
        memory: { used: -1, total: 'bad' },
        disk: { used: '4096', total: '8192' },
        network: { in: '100', out: -200 },
        temperature: 'hot',
      },
    }),
  });
  await assertStatus(dirtyPush, 200);
  const dirtyBody = await dirtyPush.json();
  assert.equal(dirtyBody.stats.status, 'online');
  assert.equal(dirtyBody.stats.cpu, 100);
  assert.equal(dirtyBody.stats.memory.used, 0);
  assert.equal(dirtyBody.stats.memory.total, 0);
  assert.equal(dirtyBody.stats.network.in, 100);
  assert.equal(dirtyBody.stats.network.out, 0);
  assert.deepEqual(dirtyBody.stats.load, [0.1]);
  assert.equal(dirtyBody.stats.uptime.length, 120);

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

  const nextStats = {
    ...stats,
    uptime: '2m',
    cpu: 45.8,
    memory: { used: 1536, total: 2048 },
    network: { in: 300, out: 500 },
  };

  const nextPush = await fetch(`${baseUrl}/api/server/metrics`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ serverId, stats: nextStats }),
  });
  await assertStatus(nextPush, 200);

  const metrics = await fetch(`${baseUrl}/api/server/metrics`, {
    headers: { cookie },
  });
  await assertStatus(metrics, 200);
  const metricsBody = await metrics.json();
  const reflected = metricsBody.servers.find((server) => server.id === serverId);
  assert.equal(reflected.stats.status, 'online');
  assert.equal(reflected.stats.cpu, 45.8);
  assert.equal(reflected.stats.memory.used, 1536);

  const history = await fetch(`${baseUrl}/api/server/metrics/history?serverId=${serverId}&range=24h`, {
    headers: { cookie },
  });
  await assertStatus(history, 200);
  const historyBody = await history.json();
  assert.ok(historyBody.samples.length >= 3);
  assert.ok(historyBody.samples.some((sample) => sample.cpu === 100));
  assert.ok(historyBody.samples.some((sample) => sample.cpu === 45.8));
  assert.ok(historyBody.samples.every((sample) => typeof sample.recordedAt === 'string'));
});

async function assertStatus(response, expected) {
  if (response.status !== expected) {
    assert.equal(response.status, expected, await response.text());
  }
}

async function getModuleData(cookie, moduleId, params = {}) {
  const query = new URLSearchParams({ moduleId, ...params });
  const response = await fetch(`${baseUrl}/api/modules/data?${query.toString()}`, {
    headers: { cookie },
  });
  await assertStatus(response, 200);
  return response.json();
}

async function assertImage(cookie, imageUrl) {
  const response = await fetch(new URL(imageUrl, baseUrl), {
    headers: { cookie },
  });
  await assertStatus(response, 200);
  assert.match(response.headers.get('content-type') || '', /^image\//);
  assert.ok((await response.arrayBuffer()).byteLength > 0);
}

async function startModuleMockServer() {
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    const path = url.pathname;

    if (path === '/feed.xml') {
      response.writeHead(200, { 'Content-Type': 'application/rss+xml' });
      response.end(`<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0"><channel><title>Contract Feed</title>
        <item><guid>contract-feed-item</guid><title>Contract feed item</title>
        <link>${moduleMockUrl(request)}/feed-item</link>
        <pubDate>${new Date().toUTCString()}</pubDate></item>
        </channel></rss>`);
      return;
    }

    if (path.startsWith('/plex/')) {
      if (request.headers['x-plex-token'] !== 'plex-token') return sendJson(response, 401, {});
      if (path === '/plex/library/sections') {
        return sendJson(response, 200, {
          MediaContainer: {
            Directory: [
              { key: '1', title: 'Movies', type: 'movie' },
              { key: '2', title: 'TV', type: 'show' },
            ],
          },
        });
      }
      if (path === '/plex/status/sessions') {
        return sendJson(response, 200, { MediaContainer: { size: 2 } });
      }
      if (path === '/plex/library/sections/1/all') {
        return sendJson(response, 200, { MediaContainer: { totalSize: 24 } });
      }
      if (path === '/plex/library/sections/2/all') {
        return sendJson(response, 200, { MediaContainer: { totalSize: 13 } });
      }
      if (path === '/plex/library/recentlyAdded') {
        return sendJson(response, 200, {
          MediaContainer: {
            Metadata: [{
              ratingKey: 'plex-recent-1',
              title: 'Contract Movie',
              type: 'movie',
              year: 2026,
              thumb: '/library/metadata/plex-recent-1/thumb',
            }],
          },
        });
      }
      if (path === '/plex/library/metadata/plex-recent-1/thumb') {
        return sendPng(response);
      }
    }

    if (path.startsWith('/jellyfin/')) {
      if (!String(request.headers.authorization || '').includes('jellyfin-key')) {
        return sendJson(response, 401, {});
      }
      if (path === '/jellyfin/Items/Counts') {
        return sendJson(response, 200, { MovieCount: 10, SeriesCount: 3, EpisodeCount: 40 });
      }
      if (path === '/jellyfin/Sessions') {
        return sendJson(response, 200, [{ NowPlayingItem: { Name: 'Contract Stream' } }, {}]);
      }
      if (path === '/jellyfin/Library/MediaFolders') {
        return sendJson(response, 200, {
          Items: [
            { Id: 'jellyfin-movies', Name: 'Movies', CollectionType: 'movies' },
            { Id: 'jellyfin-tv', Name: 'TV', CollectionType: 'tvshows' },
          ],
        });
      }
      if (path === '/jellyfin/Items') {
        if (url.searchParams.get('ParentId') === 'jellyfin-movies') {
          return sendJson(response, 200, { TotalRecordCount: 10 });
        }
        if (url.searchParams.get('ParentId') === 'jellyfin-tv') {
          return sendJson(response, 200, { TotalRecordCount: 40 });
        }
        return sendJson(response, 200, {
          Items: [{
            Id: 'jellyfin-recent-1',
            Name: 'Contract Episode',
            Type: 'Episode',
            SeriesName: 'Contract Series',
            ImageTags: { Primary: 'primary' },
          }],
        });
      }
      if (path === '/jellyfin/Items/jellyfin-recent-1/Images/Primary') {
        return sendPng(response);
      }
    }

    if (path.startsWith('/emby/')) {
      if (request.headers['x-emby-token'] !== 'emby-key') return sendJson(response, 401, {});
      if (path === '/emby/Items/Counts') {
        return sendJson(response, 200, { MovieCount: 8, SeriesCount: 2, EpisodeCount: 20 });
      }
      if (path === '/emby/Sessions') {
        return sendJson(response, 200, []);
      }
      if (path === '/emby/Library/MediaFolders') {
        return sendJson(response, 200, {
          Items: [
            { Id: 'emby-movies', Name: 'Movies', CollectionType: 'movies' },
            { Id: 'emby-tv', Name: 'TV', CollectionType: 'tvshows' },
          ],
        });
      }
      if (path === '/emby/Items') {
        if (url.searchParams.get('ParentId') === 'emby-movies') {
          return sendJson(response, 200, { TotalRecordCount: 8 });
        }
        if (url.searchParams.get('ParentId') === 'emby-tv') {
          return sendJson(response, 200, { TotalRecordCount: 20 });
        }
        return sendJson(response, 200, {
          Items: [{
            Id: 'emby-recent-1',
            Name: 'Contract Emby Item',
            Type: 'Movie',
            ImageTags: { Primary: 'primary' },
          }],
        });
      }
      if (path === '/emby/Items/emby-recent-1/Images/Primary') {
        return sendPng(response);
      }
    }

    if (path.startsWith('/radarr/')) {
      if (request.headers['x-api-key'] !== 'radarr-key') return sendJson(response, 401, {});
      if (path === '/radarr/api/v3/system/status') {
        return sendJson(response, 200, { version: '5.0.0' });
      }
      if (path === '/radarr/api/v3/movie') {
        return sendJson(response, 200, [{
          id: 1,
          title: 'Contract Movie',
          year: 2026,
          added: new Date().toISOString(),
          images: [{ coverType: 'poster', url: '/MediaCover/1/poster.jpg' }],
        }]);
      }
      if (path === '/radarr/api/v3/queue') {
        return sendJson(response, 200, { totalRecords: 2 });
      }
      if (path === '/radarr/api/v3/wanted/missing') {
        return sendJson(response, 200, { totalRecords: 4 });
      }
      if (path === '/radarr/MediaCover/1/poster.jpg') {
        return sendPng(response);
      }
    }

    if (path.startsWith('/sonarr/')) {
      if (request.headers['x-api-key'] !== 'sonarr-key') return sendJson(response, 401, {});
      if (path === '/sonarr/api/v3/system/status') {
        return sendJson(response, 200, { version: '4.0.0' });
      }
      if (path === '/sonarr/api/v3/series') {
        return sendJson(response, 200, [{
          id: 1,
          title: 'Contract Series',
          year: 2026,
          added: new Date().toISOString(),
          images: [{ coverType: 'poster', url: '/MediaCover/1/poster.jpg' }],
        }]);
      }
      if (path === '/sonarr/api/v3/queue') {
        return sendJson(response, 200, { totalRecords: 1 });
      }
      if (path === '/sonarr/api/v3/wanted/missing') {
        return sendJson(response, 200, { totalRecords: 3 });
      }
      if (path === '/sonarr/MediaCover/1/poster.jpg') {
        return sendPng(response);
      }
    }

    sendJson(response, 404, {});
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

function sendPng(response) {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ax3p1QAAAAASUVORK5CYII=',
    'base64',
  );
  response.writeHead(200, { 'Content-Type': 'image/png' });
  response.end(png);
}

function moduleMockUrl(request) {
  return `http://${request.headers.host}`;
}
