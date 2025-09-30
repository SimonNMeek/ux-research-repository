import { BaseStrategy } from './base';
import { PIIMatch, PseudonymMapping } from '../types';
import * as crypto from 'crypto';

export class PseudonymStrategy extends BaseStrategy {
  name = 'pseudonym';
  private hmacKey: string;
  private salt: string;
  private pseudonymMappings: Map<string, PseudonymMapping> = new Map();
  private nextIds: Map<string, number> = new Map();

  constructor(hmacKey: string = 'default-key', salt: string = 'default-salt') {
    super();
    this.hmacKey = hmacKey;
    this.salt = salt;
  }

  apply(match: PIIMatch, context: string): string {
    const piiHash = this.hashPII(match.value);
    
    // Check if we already have a pseudonym for this PII
    if (this.pseudonymMappings.has(piiHash)) {
      const mapping = this.pseudonymMappings.get(piiHash)!;
      return this.generateToken(match.type, 'PSEUDONYM', mapping.label);
    }
    
    // Generate new pseudonym
    const label = this.generateNewPseudonym(match.type);
    const mapping: PseudonymMapping = {
      piiHash,
      type: match.type,
      label,
      firstSeenAt: new Date()
    };
    
    this.pseudonymMappings.set(piiHash, mapping);
    return this.generateToken(match.type, 'PSEUDONYM', label);
  }

  private hashPII(value: string): string {
    const hmac = crypto.createHmac('sha256', this.hmacKey);
    hmac.update(this.salt + value);
    return hmac.digest('hex');
  }

  private generateNewPseudonym(type: string): string {
    const currentId = this.nextIds.get(type) || 1;
    this.nextIds.set(type, currentId + 1);
    
    switch (type) {
      case 'PERSON':
        return `Person ${currentId.toString().padStart(3, '0')}`;
      case 'ORG':
        return `Organization ${currentId.toString().padStart(3, '0')}`;
      case 'EMAIL':
        return `email${currentId.toString().padStart(3, '0')}@example.com`;
      case 'PHONE':
        return `Phone ${currentId.toString().padStart(3, '0')}`;
      case 'ADDRESS':
        return `Address ${currentId.toString().padStart(3, '0')}`;
      default:
        return `${type} ${currentId.toString().padStart(3, '0')}`;
    }
  }

  getPseudonymMappings(): PseudonymMapping[] {
    return Array.from(this.pseudonymMappings.values());
  }

  loadPseudonymMappings(mappings: PseudonymMapping[]): void {
    for (const mapping of mappings) {
      this.pseudonymMappings.set(mapping.piiHash, mapping);
      
      // Update next ID counter
      const match = mapping.label.match(/(\d+)$/);
      if (match) {
        const id = parseInt(match[1], 10);
        const currentNext = this.nextIds.get(mapping.type) || 1;
        this.nextIds.set(mapping.type, Math.max(currentNext, id + 1));
      }
    }
  }
}
