import {
  siAnthropic,
  siApple,
  siArchlinux,
  siAnsible,
  siAsana,
  siAwwwards,
  siBehance,
  siBitwarden,
  siBlender,
  siCloudflare,
  siCloudflarepages,
  siCloudflareworkers,
  siClaude,
  siConfluence,
  siCoolify,
  siDatadog,
  siDebian,
  siDigitalocean,
  siDiscord,
  siDocker,
  siDribbble,
  siDropbox,
  siFedora,
  siFigma,
  siFirebase,
  siFramer,
  siGithub,
  siGithubactions,
  siGitlab,
  siGmail,
  siGooglecalendar,
  siGooglechrome,
  siGooglecloud,
  siGrafana,
  siHetzner,
  siHomeassistant,
  siHomebridge,
  siHuggingface,
  siImmich,
  siInstagram,
  siJellyfin,
  siJira,
  siKubernetes,
  siLinear,
  siLottiefiles,
  siMariadb,
  siMinio,
  siMiro,
  siMongodb,
  siMysql,
  siN8n,
  siNetdata,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siNotion,
  siObsidian,
  siOpenmediavault,
  siPinterest,
  siPlex,
  siPortainer,
  siPostgresql,
  siPrisma,
  siPrometheus,
  siProxmox,
  siPython,
  siQbittorrent,
  siQnap,
  siRailway,
  siRadarr,
  siRaspberrypi,
  siReact,
  siReadthedocs,
  siRedis,
  siReddit,
  siSentry,
  siSketch,
  siSonarr,
  siSpotify,
  siSqlite,
  siSteam,
  siSupabase,
  siSyncthing,
  siSynology,
  siTailwindcss,
  siTailscale,
  siTerraform,
  siTraefikproxy,
  siTrello,
  siTypescript,
  siUbuntu,
  siUmami,
  siUnraid,
  siUptimekuma,
  siUnsplash,
  siVault,
  siVaultwarden,
  siVercel,
  siVite,
  siWebflow,
  siWikipedia,
  siWireguard,
  siX,
  siYoutube,
} from 'simple-icons';
import {
  DEFAULT_APPLICATION_ICON,
  DEFAULT_BOOKMARK_ICON,
  DEFAULT_SERVER_ICON,
} from '@/lib/svg';

type SimpleIcon = {
  title: string;
  path: string;
};

export type IconCategory =
  | 'General'
  | 'Design'
  | 'Dev'
  | 'Infra'
  | 'Media'
  | 'Work';

export type IconPreset = {
  id: string;
  label: string;
  svg: string;
  category: IconCategory;
  tags?: string[];
};

const ICONS = {
  link: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9.2 15.8a1 1 0 0 1-1.4 1.4 5 5 0 0 1 0-7.1l2.1-2.1a5 5 0 0 1 7.1 7.1l-.7.7a1 1 0 1 1-1.4-1.4l.7-.7a3 3 0 0 0-4.2-4.2l-2.1 2.1a3 3 0 0 0 0 4.2Zm5.6-7.6a1 1 0 0 1 1.4-1.4 5 5 0 0 1 0 7.1l-2.1 2.1A5 5 0 0 1 7 8.9l.7-.7a1 1 0 1 1 1.4 1.4l-.7.7a3 3 0 1 0 4.2 4.2l2.1-2.1a3 3 0 0 0 0-4.2Z"/></svg>',
  archive: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm2 6v9h12v-9H6Zm-1-4v2h14V6H5Zm4 7h6v2H9v-2Z"/></svg>',
  document: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 2H6v16h11V8h-4V4Zm-4 8h6v2H9v-2Zm0 4h6v2H9v-2Z"/></svg>',
  code: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9.4 7.4 4.8 12l4.6 4.6L8 18 2 12l6-6 1.4 1.4Zm5.2 0L16 6l6 6-6 6-1.4-1.4 4.6-4.6-4.6-4.6ZM13 4l-2 16H9l2-16h2Z"/></svg>',
  terminal: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v12h16V6H4Zm3 3 4 3-4 3V9Zm5 6h5v2h-5v-2Z"/></svg>',
  database: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2c5 0 9 1.8 9 4v12c0 2.2-4 4-9 4s-9-1.8-9-4V6c0-2.2 4-4 9-4Zm0 2C7.6 4 5 5.4 5 6s2.6 2 7 2 7-1.4 7-2-2.6-2-7-2ZM5 9v3c0 .6 2.6 2 7 2s7-1.4 7-2V9c-1.6.8-4.1 1-7 1s-5.4-.2-7-1Zm0 6v3c0 .6 2.6 2 7 2s7-1.4 7-2v-3c-1.6.8-4.1 1-7 1s-5.4-.2-7-1Z"/></svg>',
  cloud: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 19a6 6 0 0 1-.6-12A7 7 0 0 1 20 10.7 4.5 4.5 0 0 1 19.5 19H8Zm0-2h11.5a2.5 2.5 0 0 0 .2-5l-1.4-.1-.3-1.4A5 5 0 0 0 8.9 9l-.6.9-1.1.1A4 4 0 0 0 8 17Z"/></svg>',
  shield: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2 20 5v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3Zm0 2.1L6 6.4V11c0 3.9 2.5 7.4 6 8.8 3.5-1.4 6-4.9 6-8.8V6.4l-6-2.3Z"/></svg>',
  key: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7.5 14A5.5 5.5 0 1 1 13 8.5c0 .6-.1 1.1-.3 1.7L22 19.5V22h-3v-2h-2v-2h-2.5l-3.1-3.1c-1.1.7-2.5 1.1-3.9 1.1Zm0-2a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/></svg>',
  home: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m3 11 9-8 9 8v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V11Zm2 .9V20h3v-7h8v7h3v-8.1l-7-6.2-7 6.2Z"/></svg>',
};

const GENERAL_ICONS: IconPreset[] = [
  generalPreset('bookmark', 'Bookmark', DEFAULT_BOOKMARK_ICON, ['save', 'read']),
  generalPreset('application', 'Application', DEFAULT_APPLICATION_ICON, ['app', 'grid']),
  generalPreset('server', 'Server', DEFAULT_SERVER_ICON, ['host', 'machine']),
  generalPreset('link', 'Link', ICONS.link, ['url', 'website']),
  generalPreset('archive', 'Archive', ICONS.archive, ['box', 'storage']),
  generalPreset('document', 'Document', ICONS.document, ['file', 'notes']),
  generalPreset('code', 'Code', ICONS.code, ['developer', 'source']),
  generalPreset('terminal', 'Terminal', ICONS.terminal, ['console', 'shell']),
  generalPreset('database', 'Database', ICONS.database, ['data', 'db']),
  generalPreset('cloud', 'Cloud', ICONS.cloud, ['remote', 'host']),
  generalPreset('shield', 'Shield', ICONS.shield, ['security']),
  generalPreset('key', 'Key', ICONS.key, ['secret', 'password']),
  generalPreset('home', 'Home', ICONS.home, ['house', 'nas']),
];

const BRAND_ICONS: IconPreset[] = [
  brandPreset('apple', siApple, 'General', ['macos', 'ios']),
  brandPreset('chrome', siGooglechrome, 'General', ['browser', 'web']),
  brandPreset('github', siGithub, 'Dev', ['git', 'code']),
  brandPreset('notion', siNotion, 'Work', ['notes', 'docs']),
  brandPreset('discord', siDiscord, 'Work', ['chat']),
  brandPreset('bitwarden', siBitwarden, 'Work', ['password', 'security']),
  brandPreset('dropbox', siDropbox, 'Work', ['storage', 'sync']),
  brandPreset('gmail', siGmail, 'Work', ['mail', 'email']),
  brandPreset('google-calendar', siGooglecalendar, 'Work', ['calendar']),
];

const DEV_ICONS: IconPreset[] = [
  brandPreset('gitlab', siGitlab, 'Dev', ['git', 'code']),
  brandPreset('github-actions', siGithubactions, 'Dev', ['ci', 'workflow']),
  brandPreset('docker', siDocker, 'Dev', ['container']),
  brandPreset('kubernetes', siKubernetes, 'Dev', ['container', 'cluster']),
  brandPreset('python', siPython, 'Dev', ['language']),
  brandPreset('typescript', siTypescript, 'Dev', ['language']),
  brandPreset('react', siReact, 'Dev', ['frontend']),
  brandPreset('tailwind', siTailwindcss, 'Dev', ['css', 'frontend']),
  brandPreset('nodejs', siNodedotjs, 'Dev', ['runtime']),
  brandPreset('vite', siVite, 'Dev', ['build']),
  brandPreset('prisma', siPrisma, 'Dev', ['database', 'orm']),
  brandPreset('vercel', siVercel, 'Dev', ['deploy']),
  brandPreset('nextjs', siNextdotjs, 'Dev', ['react', 'framework']),
  brandPreset('supabase', siSupabase, 'Dev', ['database']),
  brandPreset('firebase', siFirebase, 'Dev', ['database']),
  brandPreset('railway', siRailway, 'Dev', ['deploy']),
  brandPreset('sentry', siSentry, 'Dev', ['error', 'monitor']),
  brandPreset('hugging-face', siHuggingface, 'Dev', ['ai', 'model']),
  brandPreset('anthropic', siAnthropic, 'Dev', ['ai', 'model']),
  brandPreset('claude', siClaude, 'Dev', ['ai', 'model']),
  brandPreset('read-the-docs', siReadthedocs, 'Dev', ['docs']),
];

const DESIGN_ICONS: IconPreset[] = [
  brandPreset('figma', siFigma, 'Design', ['interface', 'ui', 'ux']),
  brandPreset('pinterest', siPinterest, 'Design', ['moodboard', 'inspiration']),
  brandPreset('dribbble', siDribbble, 'Design', ['portfolio', 'inspiration']),
  brandPreset('behance', siBehance, 'Design', ['portfolio', 'adobe']),
  brandPreset('sketch', siSketch, 'Design', ['interface', 'ui']),
  brandPreset('framer', siFramer, 'Design', ['prototype', 'website']),
  brandPreset('webflow', siWebflow, 'Design', ['website', 'no-code']),
  brandPreset('miro', siMiro, 'Design', ['whiteboard', 'planning']),
  brandPreset('unsplash', siUnsplash, 'Design', ['image', 'photo']),
  brandPreset('awwwards', siAwwwards, 'Design', ['website', 'inspiration']),
  brandPreset('lottiefiles', siLottiefiles, 'Design', ['animation']),
  brandPreset('blender', siBlender, 'Design', ['3d']),
];

const INFRA_ICONS: IconPreset[] = [
  brandPreset('proxmox', siProxmox, 'Infra', ['virtualization']),
  brandPreset('ubuntu', siUbuntu, 'Infra', ['linux']),
  brandPreset('debian', siDebian, 'Infra', ['linux']),
  brandPreset('fedora', siFedora, 'Infra', ['linux']),
  brandPreset('arch-linux', siArchlinux, 'Infra', ['linux']),
  brandPreset('cloudflare', siCloudflare, 'Infra', ['dns', 'network']),
  brandPreset('cloudflare-workers', siCloudflareworkers, 'Infra', ['edge']),
  brandPreset('cloudflare-pages', siCloudflarepages, 'Infra', ['edge', 'deploy']),
  brandPreset('google-cloud', siGooglecloud, 'Infra', ['cloud']),
  brandPreset('hetzner', siHetzner, 'Infra', ['cloud', 'server']),
  brandPreset('digitalocean', siDigitalocean, 'Infra', ['cloud', 'server']),
  brandPreset('tailscale', siTailscale, 'Infra', ['vpn', 'network']),
  brandPreset('wireguard', siWireguard, 'Infra', ['vpn', 'network']),
  brandPreset('portainer', siPortainer, 'Infra', ['docker', 'container']),
  brandPreset('traefik', siTraefikproxy, 'Infra', ['proxy']),
  brandPreset('ansible', siAnsible, 'Infra', ['automation']),
  brandPreset('terraform', siTerraform, 'Infra', ['automation']),
  brandPreset('raspberry-pi', siRaspberrypi, 'Infra', ['hardware']),
  brandPreset('synology', siSynology, 'Infra', ['nas']),
  brandPreset('qnap', siQnap, 'Infra', ['nas']),
  brandPreset('openmediavault', siOpenmediavault, 'Infra', ['nas']),
  brandPreset('unraid', siUnraid, 'Infra', ['nas']),
  brandPreset('syncthing', siSyncthing, 'Infra', ['sync']),
  brandPreset('nginx', siNginx, 'Infra', ['proxy', 'web']),
  brandPreset('postgresql', siPostgresql, 'Infra', ['database']),
  brandPreset('mongodb', siMongodb, 'Infra', ['database']),
  brandPreset('redis', siRedis, 'Infra', ['database']),
  brandPreset('mysql', siMysql, 'Infra', ['database']),
  brandPreset('mariadb', siMariadb, 'Infra', ['database']),
  brandPreset('sqlite', siSqlite, 'Infra', ['database']),
  brandPreset('minio', siMinio, 'Infra', ['storage']),
  brandPreset('vault', siVault, 'Infra', ['security', 'secrets']),
  brandPreset('vaultwarden', siVaultwarden, 'Infra', ['password', 'security']),
  brandPreset('grafana', siGrafana, 'Infra', ['monitor']),
  brandPreset('prometheus', siPrometheus, 'Infra', ['monitor']),
  brandPreset('netdata', siNetdata, 'Infra', ['monitor']),
  brandPreset('datadog', siDatadog, 'Infra', ['monitor']),
  brandPreset('uptime-kuma', siUptimekuma, 'Infra', ['monitor']),
  brandPreset('coolify', siCoolify, 'Infra', ['deploy', 'server']),
  brandPreset('n8n', siN8n, 'Infra', ['automation']),
  brandPreset('umami', siUmami, 'Infra', ['analytics']),
  brandPreset('home-assistant', siHomeassistant, 'Infra', ['home']),
  brandPreset('homebridge', siHomebridge, 'Infra', ['home']),
];

const MEDIA_ICONS: IconPreset[] = [
  brandPreset('youtube', siYoutube, 'Media', ['video']),
  brandPreset('spotify', siSpotify, 'Media', ['music']),
  brandPreset('plex', siPlex, 'Media', ['media', 'server']),
  brandPreset('jellyfin', siJellyfin, 'Media', ['media', 'server']),
  brandPreset('immich', siImmich, 'Media', ['photo', 'server']),
  brandPreset('qbittorrent', siQbittorrent, 'Media', ['download']),
  brandPreset('sonarr', siSonarr, 'Media', ['media', 'server']),
  brandPreset('radarr', siRadarr, 'Media', ['media', 'server']),
  brandPreset('steam', siSteam, 'Media', ['game']),
  brandPreset('x', siX, 'Media', ['social']),
  brandPreset('instagram', siInstagram, 'Media', ['social']),
  brandPreset('reddit', siReddit, 'Media', ['forum']),
  brandPreset('wikipedia', siWikipedia, 'Media', ['reference']),
];

const WORK_ICONS: IconPreset[] = [
  brandPreset('linear', siLinear, 'Work', ['tasks']),
  brandPreset('obsidian', siObsidian, 'Work', ['notes']),
  brandPreset('trello', siTrello, 'Work', ['tasks']),
  brandPreset('asana', siAsana, 'Work', ['tasks']),
  brandPreset('jira', siJira, 'Work', ['tasks']),
  brandPreset('confluence', siConfluence, 'Work', ['docs']),
];

export const BOOKMARK_ICON_PRESETS: IconPreset[] = [
  ...GENERAL_ICONS,
  ...BRAND_ICONS,
  ...DESIGN_ICONS,
  ...WORK_ICONS,
  ...MEDIA_ICONS,
  ...DEV_ICONS,
];

export const APPLICATION_ICON_PRESETS: IconPreset[] = [
  ...GENERAL_ICONS,
  ...BRAND_ICONS,
  ...DESIGN_ICONS,
  ...DEV_ICONS,
  ...WORK_ICONS,
  ...MEDIA_ICONS,
];

export const SERVER_ICON_PRESETS: IconPreset[] = [
  ...GENERAL_ICONS,
  ...INFRA_ICONS,
  ...DEV_ICONS,
  ...BRAND_ICONS,
  ...MEDIA_ICONS.filter((icon) => ['plex', 'jellyfin'].includes(icon.id)),
];

function generalPreset(id: string, label: string, svg: string, tags: string[] = []): IconPreset {
  return {
    id,
    label,
    svg,
    category: 'General',
    tags,
  };
}

function brandPreset(
  id: string,
  icon: SimpleIcon,
  category: IconCategory,
  tags: string[] = [],
): IconPreset {
  return {
    id,
    label: icon.title,
    category,
    tags,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${icon.path}"/></svg>`,
  };
}
