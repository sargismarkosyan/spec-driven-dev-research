import { io } from 'socket.io-client';

// Connects to the same origin — no separate backend URL needed.
export const socket = io({ autoConnect: false });
