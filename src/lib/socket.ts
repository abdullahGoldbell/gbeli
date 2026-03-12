'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    socket = io(`http://${host}:3001`);
  }
  return socket;
}
