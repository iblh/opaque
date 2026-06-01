export function cookieMaxAge(expiresIn: string | number) {
  if (typeof expiresIn === 'number') return expiresIn;

  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return 3 * 24 * 60 * 60;

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === 'd') return value * 24 * 60 * 60;
  if (unit === 'h') return value * 60 * 60;
  if (unit === 'm') return value * 60;
  return value;
}
