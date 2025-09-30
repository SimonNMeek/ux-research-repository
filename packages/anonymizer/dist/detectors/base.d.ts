import { Detector, PIIMatch } from '../types';
export declare abstract class BaseDetector implements Detector {
    abstract name: string;
    abstract version: string;
    abstract detect(text: string): PIIMatch[];
    protected createMatch(type: string, value: string, start: number, end: number, confidence?: number): PIIMatch;
    protected normalizeText(text: string): string;
    protected findWordBoundaries(text: string, start: number, end: number): {
        start: number;
        end: number;
    };
}
//# sourceMappingURL=base.d.ts.map