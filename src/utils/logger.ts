// Simple logger utility for consistent log formatting
export function log(...args: any[]) {
  console.log('[RepoPulse]', ...args);
}

export function error(...args: any[]) {
  console.error('[RepoPulse][ERROR]', ...args);
}
