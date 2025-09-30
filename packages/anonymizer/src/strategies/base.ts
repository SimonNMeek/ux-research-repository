import { Strategy, PIIMatch } from '../types';

export abstract class BaseStrategy implements Strategy {
  abstract name: string;

  abstract apply(match: PIIMatch, context: string): string;

  protected generateToken(type: string, strategy: string, value: string): string {
    switch (strategy) {
      case 'REDACT':
        return `[REDACTED:${type}]`;
      case 'MASK':
        return `[MASK:${type}:${this.maskValue(value)}]`;
      case 'HASH':
        return `[HASH:${type}:${this.hashValue(value)}]`;
      case 'PSEUDONYM':
        return `[PSEUDONYM:${type}:${this.generatePseudonym(type, value)}]`;
      default:
        return `[REDACTED:${type}]`;
    }
  }

  protected maskValue(value: string): string {
    if (value.length <= 2) {
      return '*'.repeat(value.length);
    }
    
    if (value.includes('@')) {
      // Email masking
      const [local, domain] = value.split('@');
      const maskedLocal = local[0] + '*'.repeat(Math.max(1, local.length - 2)) + local[local.length - 1];
      const maskedDomain = domain[0] + '*'.repeat(Math.max(1, domain.length - 2)) + domain[domain.length - 1];
      return `${maskedLocal}@${maskedDomain}`;
    }
    
    if (value.match(/^\d+$/)) {
      // Phone number masking
      if (value.length >= 4) {
        return '*'.repeat(value.length - 4) + value.slice(-4);
      }
      return '*'.repeat(value.length);
    }
    
    // Generic masking
    const visible = Math.min(2, Math.floor(value.length / 3));
    return value.slice(0, visible) + '*'.repeat(value.length - visible * 2) + value.slice(-visible);
  }

  protected hashValue(value: string): string {
    // Simple hash for demonstration - in production, use proper HMAC
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(value).digest('hex');
    return hash.substring(0, 8) + '…';
  }

  protected generatePseudonym(type: string, value: string): string {
    // Simple pseudonym generation - in production, use proper mapping
    const hash = this.hashValue(value);
    const num = parseInt(hash.substring(0, 4), 16) % 1000;
    
    switch (type) {
      case 'PERSON':
        return `Person ${num.toString().padStart(3, '0')}`;
      case 'ORG':
        return `Organization ${num.toString().padStart(3, '0')}`;
      case 'EMAIL':
        return `email${num.toString().padStart(3, '0')}@example.com`;
      default:
        return `${type} ${num.toString().padStart(3, '0')}`;
    }
  }
}
