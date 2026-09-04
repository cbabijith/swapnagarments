export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

/** Minimal structured (JSON lines) logger — one line per event, easy to ship anywhere later. */
export function createLogger(
  bindings: Record<string, unknown> = {},
  minLevel: LogLevel = "info",
): Logger {
  const write = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[minLevel]) return;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      message,
      ...bindings,
      ...context,
    });
    (level === "debug" ? console.log : console[level])(line);
  };

  return {
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
    child: (childBindings) => createLogger({ ...bindings, ...childBindings }, minLevel),
  };
}
