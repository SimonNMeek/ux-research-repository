import { BaseStrategy } from './base';
import { PIIMatch } from '../types';
import * as crypto from 'crypto';

export class HashStrategy extends BaseStrategy {
  name = 'hash';
  private hmacKey: string;
  private salt: string;

  constructor(hmacKey: string = 'default-key', salt: string = 'default-salt') {
    super();
    this.hmacKey = hmacKey;
    this.salt = salt;
  }

  apply(match: PIIMatch, context: string): string {
    return this.generateToken(match.type, 'HASH', match.value);
  }

  protected hashValue(value: string): string {
    const hmac = crypto.createHmac('sha256', this.hmacKey);
    hmac.update(this.salt + value);
    const hash = hmac.digest('hex');
    return hash.substring(0, 8) + '…';
  }
}
