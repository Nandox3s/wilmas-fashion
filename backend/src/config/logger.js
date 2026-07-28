const REDACTED_KEYS = /password|authorization|token|secret|database_url|cvv|card|certificate/i

function sanitize(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object') return value
  if (seen.has(value)) return '[circular]'
  seen.add(value)
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    REDACTED_KEYS.test(key) ? '[redacted]' : (typeof item === 'object' ? sanitize(item, seen) : item),
  ]))
}

function write(level, event, details = {}) {
  const line = JSON.stringify({ level, event, ...sanitize(details), timestamp: new Date().toISOString() })
  ;(level === 'error' ? console.error : console.log)(line)
}

export const logger = {
  info: (event, details) => write('info', event, details),
  warn: (event, details) => write('warn', event, details),
  error: (event, details) => write('error', event, details),
}
