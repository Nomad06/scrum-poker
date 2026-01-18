// Message types matching backend
export type MessageType =
  | 'join'
  | 'vote'
  | 'reveal'
  | 'reset'
  | 'sync'
  | 'error'
  | 'player_joined'
  | 'player_left'
  | 'voted'
  | 'revealed'
  | 'reset_done';

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
}

export interface ServerMessage {
  type: MessageType;
  payload?: RoomState | VotingResult | Player | Record<string, unknown>;
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

// Voting card values (Fibonacci)
export const VOTING_VALUES = ['1', '2', '3', '5', '8', '13', '21', '?'] as const;
export type VotingValue = (typeof VOTING_VALUES)[number];
