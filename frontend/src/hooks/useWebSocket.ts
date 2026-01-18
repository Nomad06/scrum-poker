import { useEffect, useRef, useCallback, useState } from 'react';
import type { ServerMessage, ClientMessage, RoomState, VotingResult, Player } from '../types';

interface UseWebSocketOptions {
  roomCode: string;
  playerName: string;
  onStateSync: (state: RoomState) => void;
  onPlayerJoined: (player: Player) => void;
  onPlayerLeft: (playerId: string, newHostId: string) => void;
  onVoted: (playerId: string) => void;
  onRevealed: (result: VotingResult) => void;
  onError: (error: string) => void;
  onRoomNotFound?: () => void;
}

export function useWebSocket({
  roomCode,
  playerName,
  onStateSync,
  onPlayerJoined,
  onPlayerLeft,
  onVoted,
  onRevealed,
  onError,
  onRoomNotFound,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const roomNotFoundRef = useRef(false);
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(false);

  // Store callbacks in refs to avoid dependency changes
  const callbacksRef = useRef({
    onStateSync,
    onPlayerJoined,
    onPlayerLeft,
    onVoted,
    onRevealed,
    onError,
    onRoomNotFound,
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
    };
  }, [onStateSync, onPlayerJoined, onPlayerLeft, onVoted, onRevealed, onError, onRoomNotFound]);

  // Check if room exists before attempting reconnection
  const checkRoomExists = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}/check`);
      return response.ok;
    } catch {
      return false;
    }
  }, [roomCode]);

  const handleMessage = useCallback((message: ServerMessage) => {
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
        const payload = message.payload as { playerId: string };
        callbacks.onVoted(payload.playerId);
        break;
      }

      case 'revealed':
        callbacks.onRevealed(message.payload as VotingResult);
        break;

      case 'error':
        callbacks.onError(message.error || 'Unknown error');
        break;
    }
  }, []);

  const connect = useCallback(async () => {
    // Prevent duplicate connections - check ref FIRST before any async work
    if (isConnectingRef.current) return;
    if (wsRef.current) return; // Already have a connection (open or connecting)
    if (roomNotFoundRef.current) return;

    // Set flag immediately before any async work
    isConnectingRef.current = true;
    setIsConnecting(true);

    // Check if room exists before connecting
    const exists = await checkRoomExists();
    if (!exists) {
      setIsConnecting(false);
      isConnectingRef.current = false;
      roomNotFoundRef.current = true;
      callbacksRef.current.onRoomNotFound?.();
      return;
    }

    // Double-check we haven't been superseded
    if (wsRef.current) {
      isConnectingRef.current = false;
      setIsConnecting(false);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?room=${roomCode}&name=${encodeURIComponent(playerName)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      isConnectingRef.current = false;
      reconnectAttempts.current = 0;
    };

    ws.onclose = () => {
      // Only process if this is still our active connection
      if (wsRef.current !== ws) return;

      wsRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
      isConnectingRef.current = false;

      // Don't reconnect if room was not found or component unmounted
      if (roomNotFoundRef.current) return;
      if (!isMountedRef.current) return;

      // Attempt to reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      callbacksRef.current.onError('Connection error. Retrying...');
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
  }, [roomCode, playerName, checkRoomExists, handleMessage]);

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

  const disconnect = useCallback(() => {
    reconnectAttempts.current = maxReconnectAttempts; // Prevent reconnection
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();
    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [roomCode, playerName]); // Only reconnect when room or player changes

  return {
    isConnected,
    isConnecting,
    vote,
    reveal,
    reset,
    disconnect,
  };
}
