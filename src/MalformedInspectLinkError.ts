/**
 * Thrown when an inspect-link string cannot be decoded — odd-length hex,
 * non-hex characters, payload too short, or proto bytes that fail to parse.
 *
 * Provides one consistent error type for "this URL is bad", instead of
 * leaking implementation-specific errors.
 */
export class MalformedInspectLinkError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MalformedInspectLinkError';
  }
}
