"use strict";

const ts = () => new Date().toISOString();

export const log = {
  info:  (msg: string) => console.log(`[${ts()}] INFO  ${msg}`),
  debug: (msg: string) => console.log(`[${ts()}] DEBUG ${msg}`),
  warn:  (msg: string) => console.warn(`[${ts()}] WARN  ${msg}`),
  error: (msg: string) => console.error(`[${ts()}] ERROR ${msg}`),
  done:  (msg: string) => console.log(`[${ts()}] DONE  ${msg}`),
};
