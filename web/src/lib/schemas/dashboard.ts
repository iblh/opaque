import { z } from 'zod';
import { CURRENT_DASHBOARD_SCHEMA_VERSION } from '@/lib/dashboardVersion';
import {
  DASHBOARD_ROOTS,
  MODULES_BY_ROOT,
  MODULE_ROOTS,
} from '@/lib/modules';
import {
  KNOWN_MODULE_TYPES,
  type Branch,
  type Dashboard,
} from '@/lib/types';

const idSchema = z.string().trim().min(1).max(160);
const nameSchema = z.string().max(240);
const urlSchema = z.string().max(4096);
const iconSchema = z.string().max(200_000);
const optionalText = z.string().max(4096).optional();
const optionalStackId = z.string().max(160).optional();
const postLimit = z.number().int().min(1).max(15).optional();

const weatherConfigSchema = z.object({
  location: z.string().max(240).optional(),
  countryCode: z.string().max(8).optional(),
  region: z.string().max(160).optional(),
  units: z.enum(['imperial', 'metric']).optional(),
}).strict();

const calendarConfigSchema = z.object({}).strict();

const marketsConfigSchema = z.object({
  symbols: z.union([
    z.string().max(2000),
    z.array(z.string().max(40)).max(50),
  ]).optional(),
}).strict();

const plexConfigSchema = z.object({
  url: optionalText,
  token: z.string().max(8192).optional(),
  apiKey: z.string().max(8192).optional(),
}).strict();

const mediaConfigSchema = z.object({
  url: optionalText,
  apiKey: z.string().max(8192).optional(),
  token: z.string().max(8192).optional(),
}).strict();

const rssConfigSchema = z.object({
  feeds: z.union([
    z.string().max(20_000),
    z.array(z.string().max(4096)).max(100),
  ]).optional(),
  limit: postLimit,
  stackId: optionalStackId,
}).strict();

const redditConfigSchema = z.object({
  subreddit: z.string().max(120).optional(),
  sort: z.enum(['hot', 'new', 'top']).optional(),
  limit: postLimit,
  baseUrl: optionalText,
  stackId: optionalStackId,
}).strict();

const hackerNewsConfigSchema = z.object({
  feed: z.enum(['top', 'new', 'best', 'ask', 'show', 'jobs']).optional(),
  limit: postLimit,
  baseUrl: optionalText,
  stackId: optionalStackId,
}).strict();

export const moduleConfigSchemas = {
  weather: weatherConfigSchema,
  calendar: calendarConfigSchema,
  markets: marketsConfigSchema,
  plex: plexConfigSchema,
  jellyfin: mediaConfigSchema,
  emby: mediaConfigSchema,
  radarr: mediaConfigSchema,
  sonarr: mediaConfigSchema,
  rss: rssConfigSchema,
  reddit: redditConfigSchema,
  'hacker-news': hackerNewsConfigSchema,
} satisfies Record<typeof KNOWN_MODULE_TYPES[number], z.ZodType>;

const leafSchema = z.object({
  id: idSchema,
  name: nameSchema,
  url: urlSchema,
  icon: iconSchema,
}).strict();

const collectionBranchSchema = z.object({
  id: idSchema,
  name: nameSchema,
  icon: iconSchema.optional(),
  leaves: z.array(leafSchema).max(500),
}).strict();

const serverStatsSchema = z.object({
  status: z.enum(['online', 'offline']),
  uptime: z.string().max(240),
  cores: z.number().int().nonnegative().optional(),
  load: z.array(z.number().finite()).max(16).optional(),
  cpu: z.number().finite(),
  memory: z.object({
    used: z.number().finite().nonnegative(),
    total: z.number().finite().nonnegative(),
  }).strict(),
  disk: z.object({
    used: z.number().finite().nonnegative(),
    total: z.number().finite().nonnegative(),
  }).strict(),
  network: z.object({
    in: z.number().finite().nonnegative(),
    out: z.number().finite().nonnegative(),
  }).strict(),
  temperature: z.number().finite(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
}).strict();

const serverBranchSchema = z.object({
  id: idSchema,
  name: nameSchema,
  url: urlSchema,
  icon: iconSchema,
  stats: serverStatsSchema.optional(),
}).strict();

const knownModuleTypes = new Set<string>(KNOWN_MODULE_TYPES);

export const moduleBranchSchema = z.object({
  id: idSchema,
  name: nameSchema,
  icon: iconSchema.optional(),
  moduleType: z.string().trim().min(1).max(120),
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
}).strict().superRefine((module, context) => {
  if (!knownModuleTypes.has(module.moduleType)) {
    context.addIssue({
      code: 'custom',
      path: ['moduleType'],
      message: `Unsupported module type: ${module.moduleType}`,
    });
    return;
  }

  const configSchema = moduleConfigSchemas[module.moduleType as keyof typeof moduleConfigSchemas];
  const result = configSchema.safeParse(module.config ?? {});
  if (result.success) return;

  result.error.issues.forEach((issue) => {
    context.addIssue({
      code: 'custom',
      path: ['config', ...issue.path],
      message: issue.message,
    });
  });
});

const layoutSchema = z.object({
  rowId: idSchema,
  rowIndex: z.number().int().nonnegative(),
  colIndex: z.number().int().nonnegative(),
  widthPct: z.number().finite().positive().max(100),
}).strict();

const orderSchema = z.record(z.string(), z.number().finite().nonnegative());

function treeSchemaFor(
  root: typeof DASHBOARD_ROOTS[number],
  branchSchema: z.ZodType<Branch>,
) {
  return z.object({
    root: z.literal(root),
    branches: z.array(branchSchema).max(500),
    layout: layoutSchema.optional(),
    order: orderSchema.optional(),
  }).strict();
}

const moduleTreeSchemas = MODULE_ROOTS.map((root) => (
  treeSchemaFor(root, moduleBranchSchema).superRefine((tree, context) => {
    const allowed = MODULES_BY_ROOT[root] ?? [];
    tree.branches.forEach((branch, index) => {
      const moduleType = (branch as { moduleType?: string }).moduleType;
      if (moduleType && !allowed.includes(moduleType as never)) {
        context.addIssue({
          code: 'custom',
          path: ['branches', index, 'moduleType'],
          message: `${moduleType} does not belong in the ${root} section`,
        });
      }
    });
  })
));

export const treeSchema = z.union([
  treeSchemaFor('bookmarks', collectionBranchSchema),
  treeSchemaFor('applications', collectionBranchSchema),
  treeSchemaFor('servers', serverBranchSchema),
  ...moduleTreeSchemas,
]);

export const dashboardSchema: z.ZodType<Dashboard> = z.object({
  id: idSchema.optional(),
  schemaVersion: z.literal(CURRENT_DASHBOARD_SCHEMA_VERSION),
  revision: z.number().int().positive(),
  forest: z.array(treeSchema).max(32).superRefine((forest, context) => {
    const seen = new Set<string>();
    forest.forEach((tree, index) => {
      if (seen.has(tree.root)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'root'],
          message: `Duplicate dashboard section: ${tree.root}`,
        });
      }
      seen.add(tree.root);
    });
  }),
  email: z.string().max(320).optional(),
  username: z.string().max(120).optional(),
  name: z.string().max(240).optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
}).strict();

export const dashboardUpdateRequestSchema = z.object({
  dashboard: dashboardSchema,
}).strict();

export function formatSchemaIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}
