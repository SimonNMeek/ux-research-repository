import { BaseStrategy } from './base';
import { PIIMatch } from '../types';
export declare class HashStrategy extends BaseStrategy {
    name: string;
    private hmacKey;
    private salt;
    constructor(hmacKey?: string, salt?: string);
    apply(match: PIIMatch, context: string): string;
    protected hashValue(value: string): string;
}
//# sourceMappingURL=hash.d.ts.map