import { useEffect, useRef, useCallback, useState } from 'react';
import type { ServerMessage, ClientMessage, RoomState, VotingResult, Player, TimerState, JiraIssue } from '../types';
import { buildApiUrl, buildWsUrl } from '../config/api';

interface UseWebSocketOptions {
  roomCode: string;
  playerName: string;
  enabled?: boolean; // Whether to connect (default: true)
  onStateSync: (state: RoomState) => void;
  onPlayerJoined: (player: Player) => void;
  onPlayerLeft: (playerId: string, newHostId: string) => void;
  onVoted: (playerId: string, hasVoted: boolean) => void;
  onRevealed: (result: VotingResult) => void;
  onError: (error: string) => void;
  onRoomNotFound?: () => void;
  onTimerSync?: (timer: TimerState) => void;
  onTimerEnd?: () => void;
  onSetIssue?: (issue: JiraIssue) => void;
}

export function useWebSocket({
  roomCode,
  playerName,
  enabled = true,
  onStateSync,
  onPlayerJoined,
  onPlayerLeft,
  onVoted,
  onRevealed,
  onError,
  onRoomNotFound,
  onTimerSync,
  onTimerEnd,
  onSetIssue,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Reconnection state
  const [retryCount, setRetryCount] = useState(0);
  const maxReconnectAttempts = 5;
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Store callbacks in refs to avoid dependency changes
  const callbacksRef = useRef({
    onStateSync,
    onPlayerJoined,
    onPlayerLeft,
    onVoted,
    onRevealed,
    onError,
    onRoomNotFound,
    onTimerSync,
    onTimerEnd,
    onSetIssue,
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onStateSync,
      onPlayerJoined,
      onPlayerLeft,
      onVoted,
      onRevealed,
      onError,
      onRoomNotFound,
      onTimerSync,
      onTimerEnd,
      onSetIssue,
    };
  }, [onStateSync, onPlayerJoined, onPlayerLeft, onVoted, onRevealed, onError, onRoomNotFound, onTimerSync, onTimerEnd, onSetIssue]);

  // Handle connection
  useEffect(() => {
    if (!enabled || !roomCode || !playerName) return;

    let isMounted = true;
    let ws: WebSocket | null = null;

    const connect = async () => {
      // Check room existence first
      try {
        const checkRes = await fetch(buildApiUrl(`api/rooms/${roomCode}/check`));
        if (!checkRes.ok) throw new Error('Room check failed');
        const data = await checkRes.json();
        if (!data.exists) {
          if (isMounted) callbacksRef.current.onRoomNotFound?.();
          return;
        }
      } catch {
        // If check fails (e.g. network), try to connect anyway or handle error
        // But for now let's proceed to connect or fail
      }

      if (!isMounted) return;

      setIsConnecting(true);

      // Get host token if exists
      const hostToken = localStorage.getItem(`scrum_poker_token_${roomCode}`);
      const queryParams = new URLSearchParams({
        room: roomCode,
        name: playerName,
      });
      if (hostToken) {
        queryParams.append('hostToken', hostToken);
      }

      const wsUrl = buildWsUrl(`ws?${queryParams.toString()}`);
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) {
          setIsConnected(true);
          setIsConnecting(false);
          setRetryCount(0); // Reset retry count on success
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          setIsConnected(false);
          setIsConnecting(false);
          wsRef.current = null;

          // Schedule retry if not maxed out
          if (retryCount < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            retryTimeoutRef.current = setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, delay);
          }
        }
      };

      ws.onerror = () => {
        if (isMounted) {
          callbacksRef.current.onError('Connection error. Retrying...');
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          const callbacks = callbacksRef.current;

          switch (message.type) {
            case 'sync':
              callbacks.onStateSync(message.payload as RoomState);
              break;
            case 'player_joined':
              callbacks.onPlayerJoined(message.payload as Player);
              break;
            case 'player_left': {
              const payload = message.payload as { playerId: string; newHostId: string };
              callbacks.onPlayerLeft(payload.playerId, payload.newHostId);
              break;
            }
            case 'voted': {
              const payload = message.payload as { playerId: string; hasVoted?: boolean };
              callbacks.onVoted(payload.playerId, payload.hasVoted ?? true);
              break;
            }
            case 'revealed':
              callbacks.onRevealed(message.payload as VotingResult);
              break;
            case 'timer_sync':
              callbacks.onTimerSync?.(message.payload as TimerState);
              break;
            case 'timer_end':
              callbacks.onTimerEnd?.();
              break;
            case 'set_issue':
              callbacks.onSetIssue?.(message.payload as unknown as JiraIssue);
              break;
            case 'error':
              callbacks.onError(message.error || 'Unknown error');
              break;
          }
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (ws) ws.close();
      wsRef.current = null;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [roomCode, playerName, enabled, retryCount]); // Depend on retryCount to trigger re-effect

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const vote = useCallback(
    (value: string) => {
      sendMessage({ type: 'vote', vote: value });
    },
    [sendMessage]
  );

  const reveal = useCallback(() => {
    sendMessage({ type: 'reveal' });
  }, [sendMessage]);

  const reset = useCallback(() => {
    sendMessage({ type: 'reset' });
  }, [sendMessage]);

  const startTimer = useCallback(
    (duration: number, autoReveal: boolean) => {
      sendMessage({ type: 'start_timer', timerDuration: duration, autoReveal });
    },
    [sendMessage]
  );

  const stopTimer = useCallback(() => {
    sendMessage({ type: 'stop_timer' });
  }, [sendMessage]);

  const setIssue = useCallback((issue: JiraIssue) => {
    sendMessage({ type: 'set_issue', issue });
  }, [sendMessage]);

  return {
    isConnected,
    isConnecting,
    vote,
    reveal,
    reset,
    startTimer,
    stopTimer,
    setIssue,
  };
}
