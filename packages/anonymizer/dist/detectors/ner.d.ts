import { BaseDetector } from './base';
import { PIIMatch } from '../types';
export declare class NERDetector extends BaseDetector {
    name: string;
    version: string;
    private namePatterns;
    detect(text: string): PIIMatch[];
    private detectNames;
    private deduplicateMatches;
}
export declare class AdvancedNERDetector extends NERDetector {
    name: string;
    version: string;
    detect(text: string): PIIMatch[];
}
//# sourceMappingURL=ner.d.ts.map