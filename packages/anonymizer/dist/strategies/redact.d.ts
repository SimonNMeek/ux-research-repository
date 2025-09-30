import { BaseStrategy } from './base';
import { PIIMatch } from '../types';
export declare class RedactStrategy extends BaseStrategy {
    name: string;
    apply(match: PIIMatch, context: string): string;
}
//# sourceMappingURL=redact.d.ts.map