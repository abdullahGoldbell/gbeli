import type { Server } from 'socket.io';

declare global {
  // eslint-disable-next-line no-var
  var io: Server | undefined;
}

export function emitFleetChange(event: string, data: unknown) {
  if (global.io) {
    global.io.emit(event, data);
  }
}
