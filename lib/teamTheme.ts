export type BeastTeam = 'STRONG' | 'SMART' | 'OG';

export const TEAM_THEME: Record<
  BeastTeam,
  {
    accentVar: string;
    badge: { border: string; background: string; text: string };
    hoverGlow: string;
  }
> = {
  STRONG: {
    accentVar: 'var(--accent-blue)',
    badge: { border: '#99ECFF', background: '#00BFEC', text: '#FFFFFF' },
    hoverGlow: '0 0 20px rgba(3, 188, 230, 0.5), 0 0 40px rgba(3, 188, 230, 0.3)',
  },
  SMART: {
    accentVar: 'var(--accent-blue)',
    badge: { border: '#99ECFF', background: '#00BFEC', text: '#FFFFFF' },
    hoverGlow: '0 0 20px rgba(3, 188, 230, 0.5), 0 0 40px rgba(3, 188, 230, 0.3)',
  },
  OG: {
    accentVar: 'var(--accent-gray)',
    badge: { border: '#D1D5DB', background: '#4B5563', text: '#FFFFFF' },
    hoverGlow: '0 0 20px rgba(156, 163, 175, 0.45), 0 0 40px rgba(156, 163, 175, 0.25)',
  },
} as const;

export function isBeastTeam(value: unknown): value is BeastTeam {
  return value === 'STRONG' || value === 'SMART' || value === 'OG';
}

export function getTeamTheme(team: unknown) {
  return TEAM_THEME[isBeastTeam(team) ? team : 'OG'];
}










