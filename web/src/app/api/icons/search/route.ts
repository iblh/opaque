import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import iconsData from 'simple-icons/icons.json';

type SimpleIconMeta = {
  title: string;
  slug: string;
  aliases?: {
    aka?: string[];
    dup?: Array<string | { title?: string }>;
    loc?: Record<string, string>;
  };
};

const MAX_RESULTS = 64;
const simpleIconsRoot = path.join(process.cwd(), 'node_modules', 'simple-icons');

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';

  if (!query) {
    return NextResponse.json({ icons: [] }, { status: 200 });
  }

  const matches = (iconsData as SimpleIconMeta[])
    .map((meta) => ({
      meta,
      score: scoreIcon(meta, query),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.meta.title.localeCompare(b.meta.title))
    .slice(0, MAX_RESULTS);

  const icons = (await Promise.all(matches.map(async ({ meta }) => {
    const svg = await readSvg(meta.slug);
    if (!svg) return null;

    return {
      id: `simple-${meta.slug}`,
      label: meta.title,
      category: 'General',
      svg,
    };
  }))).filter(Boolean);

  return NextResponse.json({ icons }, { status: 200 });
}

async function readSvg(slug: string) {
  try {
    const svg = await readFile(path.join(simpleIconsRoot, 'icons', `${slug}.svg`), 'utf8');
    return svg
      .replace(/<title>[\s\S]*?<\/title>/gi, '')
      .replace(/\srole="img"/gi, '');
  } catch {
    return null;
  }
}

function scoreIcon(icon: SimpleIconMeta, query: string) {
  const title = icon.title.toLowerCase();
  const slug = icon.slug.toLowerCase();
  const aliases = [
    ...stringAliases(icon.aliases?.aka),
    ...stringAliases(icon.aliases?.dup),
    ...stringAliases(Object.values(icon.aliases?.loc || {})),
  ].map((alias) => alias.toLowerCase());

  if (title === query || slug === query) return 100;
  if (title.startsWith(query) || slug.startsWith(query)) return 80;
  if (aliases.some((alias) => alias === query)) return 70;
  if (aliases.some((alias) => alias.startsWith(query))) return 60;
  if (title.includes(query) || slug.includes(query)) return 40;
  if (aliases.some((alias) => alias.includes(query))) return 30;
  return 0;
}

function stringAliases(aliases: unknown) {
  if (!Array.isArray(aliases)) return [];

  return aliases.flatMap((alias) => {
    if (typeof alias === 'string') return [alias];
    if (alias && typeof alias === 'object' && typeof alias.title === 'string') {
      return [alias.title];
    }
    return [];
  });
}
