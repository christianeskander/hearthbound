// Time of day for the hall sky and the UI theme.
export type Phase = 'dawn' | 'day' | 'dusk' | 'night';
export function phaseOf(hour: number): Phase {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}
export const PHASE_NAMES: Record<Phase, string> = { dawn: 'Dawn', day: 'Day', dusk: 'Dusk', night: 'Night' };
