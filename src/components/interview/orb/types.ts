export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'finished';

export interface OrbProps {
  state: OrbState;
  audioLevel: number;
  active?: boolean;
  className?: string;
  width?: number;
  height?: number;
}
