export { BaseStrategy } from './base';
export { RedactStrategy } from './redact';
export { MaskStrategy } from './mask';
export { HashStrategy } from './hash';
export { PseudonymStrategy } from './pseudonym';

import { Strategy } from '../types';
import { RedactStrategy } from './redact';
import { MaskStrategy } from './mask';
import { HashStrategy } from './hash';
import { PseudonymStrategy } from './pseudonym';

export function createDefaultStrategies(hmacKey?: string, salt?: string): Map<string, Strategy> {
  const strategies = new Map<string, Strategy>();
  
  strategies.set('REDACT', new RedactStrategy());
  strategies.set('MASK', new MaskStrategy());
  strategies.set('HASH', new HashStrategy(hmacKey, salt));
  strategies.set('PSEUDONYM', new PseudonymStrategy(hmacKey, salt));
  
  return strategies;
}
