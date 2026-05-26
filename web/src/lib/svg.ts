export const DEFAULT_BOOKMARK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2Z"/></svg>';

export const DEFAULT_APPLICATION_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 4v4h4V7H7Zm6 0v4h4V7h-4ZM7 13v4h4v-4H7Zm6 0v4h4v-4h-4Z"/></svg>';

export const DEFAULT_SERVER_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 3h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 10h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Zm2-7v2h2V6H6Zm0 10v2h2v-2H6Z"/></svg>';

export function sanitizeSvg(svg: string | undefined, fallback = DEFAULT_BOOKMARK_ICON) {
  const source = typeof svg === 'string' && svg.trim().startsWith('<svg') ? svg : fallback;

  return source
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}
