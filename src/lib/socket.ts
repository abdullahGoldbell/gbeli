'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function setSocketToken(token: string | null): void {
  currentToken = token;
  // If token changed and socket exists, reconnect with new token
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket {
  if (!socket) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    socket = io(`http://${host}:3001`, {
      auth: { token: currentToken },
    });
  }
  return socket;
}

export function resetSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
