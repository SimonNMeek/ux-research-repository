import { BaseDetector } from './base';
import { PIIMatch } from '../types';
export declare class RegexDetector extends BaseDetector {
    name: string;
    version: string;
    private patterns;
    detect(text: string): PIIMatch[];
    private validateMatch;
    private validateLuhn;
    private validateNINumber;
    private validateNHSNumber;
    private validateIBAN;
    private validateUKPostcode;
    private deduplicateMatches;
}
//# sourceMappingURL=regex.d.ts.map