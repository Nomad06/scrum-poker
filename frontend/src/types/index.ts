// Message types matching backend
export type MessageType =
  | 'join'
  | 'vote'
  | 'reveal'
  | 'reset'
  | 'start_timer'
  | 'stop_timer'
  | 'sync'
  | 'error'
  | 'player_joined'
  | 'player_left'
  | 'voted'
  | 'revealed'
  | 'reset_done'
  | 'timer_sync'
  | 'timer_end';

// Voting scale types
export type VotingScaleType = 'fibonacci' | 'tshirt' | 'powers2' | 'custom';

export interface VotingScale {
  type: VotingScaleType;
  name: string;
  values: string[];
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  hasVoted: boolean;
  vote?: string;
  isHost: boolean;
}

export interface RoomState {
  code: string;
  players: Player[];
  revealed: boolean;
  currentPlayerId: string;
  hostId: string;
  scale?: VotingScale;
  timerEndTime?: number; // Unix timestamp in milliseconds
  timerAutoReveal?: boolean;
}

export interface TimerState {
  endTime: number; // Unix timestamp in milliseconds
  autoReveal: boolean;
}

export interface VotingResult {
  votes: Record<string, string>;
  average?: number;
  revealed: boolean;
}

export interface ClientMessage {
  type: MessageType;
  roomCode?: string;
  name?: string;
  vote?: string;
  timerDuration?: number;
  autoReveal?: boolean;
}

export interface ServerMessage {
  type: MessageType;
  payload?: RoomState | VotingResult | Player | TimerState | Record<string, unknown>;
  error?: string;
}

// Avatar types
export type AvatarType =
  | 'sheriff'
  | 'outlaw'
  | 'cowgirl'
  | 'prospector'
  | 'banker'
  | 'deputy'
  | 'saloon-owner'
  | 'bounty-hunter';

// Default voting card values (Fibonacci) - kept for backward compatibility
export const VOTING_VALUES = ['1', '2', '3', '5', '8', '13', '21', '?'] as const;
export type VotingValue = (typeof VOTING_VALUES)[number];

// Preset scales for frontend use
export const PRESET_SCALES: Record<VotingScaleType, VotingScale> = {
  fibonacci: {
    type: 'fibonacci',
    name: 'Fibonacci',
    values: ['1', '2', '3', '5', '8', '13', '21', '?'],
  },
  tshirt: {
    type: 'tshirt',
    name: 'T-Shirt Sizes',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  },
  powers2: {
    type: 'powers2',
    name: 'Powers of 2',
    values: ['1', '2', '4', '8', '16', '32', '64', '?'],
  },
  custom: {
    type: 'custom',
    name: 'Custom',
    values: [],
  },
};
