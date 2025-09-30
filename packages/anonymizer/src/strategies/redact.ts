import { BaseStrategy } from './base';
import { PIIMatch } from '../types';

export class RedactStrategy extends BaseStrategy {
  name = 'redact';

  apply(match: PIIMatch, context: string): string {
    return this.generateToken(match.type, 'REDACT', match.value);
  }
}
