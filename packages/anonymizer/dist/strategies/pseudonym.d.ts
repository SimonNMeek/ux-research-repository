import { BaseStrategy } from './base';
import { PIIMatch, PseudonymMapping } from '../types';
export declare class PseudonymStrategy extends BaseStrategy {
    name: string;
    private hmacKey;
    private salt;
    private pseudonymMappings;
    private nextIds;
    constructor(hmacKey?: string, salt?: string);
    apply(match: PIIMatch, context: string): string;
    private hashPII;
    private generateNewPseudonym;
    getPseudonymMappings(): PseudonymMapping[];
    loadPseudonymMappings(mappings: PseudonymMapping[]): void;
}
//# sourceMappingURL=pseudonym.d.ts.map