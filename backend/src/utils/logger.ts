/**
 * Sensitive Data Redactor Logger
 * Masks authentication secrets, tokens, full account numbers, and PII
 */
function sanitize(arg: unknown): unknown {
  if (typeof arg === 'string') {
    return arg
      .replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED]')
      .replace(/x-client-secret:\s*["']?[^"'\s]+["']?/gi, 'x-client-secret: [REDACTED]')
      .replace(/\b\d{10,18}\b/g, (match) => 'X'.repeat(match.length - 4) + match.slice(-4));
  }

  if (typeof arg === 'object' && arg !== null) {
    if (Array.isArray(arg)) {
      return arg.map(sanitize);
    }

    const sanitizedObj: Record<string, unknown> = {};
    const sensitiveKeys = new Set([
      'clientSecret',
      'client_secret',
      'password',
      'secret',
      'privateKey',
      'private_key',
      'fiuPrivateKey',
      'webhookSecret',
      'token',
      'authorization',
    ]);

    for (const [k, v] of Object.entries(arg as Record<string, unknown>)) {
      if (sensitiveKeys.has(k.toLowerCase())) {
        sanitizedObj[k] = '[REDACTED]';
      } else if (typeof v === 'string' && (k.toLowerCase().includes('account') || k.toLowerCase().includes('accno'))) {
        sanitizedObj[k] = v.length > 4 ? 'X'.repeat(v.length - 4) + v.slice(-4) : 'XXXX';
      } else {
        sanitizedObj[k] = sanitize(v);
      }
    }
    return sanitizedObj;
  }

  return arg;
}

export const logger = {
  info: (...args: unknown[]) => {
    console.log(`[INFO ${new Date().toISOString()}]`, ...args.map(sanitize));
  },
  warn: (...args: unknown[]) => {
    console.warn(`[WARN ${new Date().toISOString()}]`, ...args.map(sanitize));
  },
  error: (...args: unknown[]) => {
    console.error(`[ERROR ${new Date().toISOString()}]`, ...args.map(sanitize));
  },
};
