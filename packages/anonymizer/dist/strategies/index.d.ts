export { BaseStrategy } from './base';
export { RedactStrategy } from './redact';
export { MaskStrategy } from './mask';
export { HashStrategy } from './hash';
export { PseudonymStrategy } from './pseudonym';
import { Strategy } from '../types';
export declare function createDefaultStrategies(hmacKey?: string, salt?: string): Map<string, Strategy>;
//# sourceMappingURL=index.d.ts.map