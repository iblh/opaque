export const CURRENT_DASHBOARD_SCHEMA_VERSION = 1;

export class UnsupportedDashboardVersionError extends Error {
  constructor(readonly version: number) {
    super(`Dashboard schema version ${version} is newer than this build supports.`);
    this.name = 'UnsupportedDashboardVersionError';
  }
}

export function normalizeDashboardVersion(value: unknown): number {
  const version = Number(value ?? 0);
  if (!Number.isInteger(version) || version < 0) return 0;
  if (version > CURRENT_DASHBOARD_SCHEMA_VERSION) {
    throw new UnsupportedDashboardVersionError(version);
  }
  return CURRENT_DASHBOARD_SCHEMA_VERSION;
}
