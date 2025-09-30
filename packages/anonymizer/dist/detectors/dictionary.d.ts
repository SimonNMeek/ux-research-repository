import { BaseDetector } from './base';
import { PIIMatch } from '../types';
export declare class DictionaryDetector extends BaseDetector {
    name: string;
    version: string;
    private dictionaries;
    private loadedPaths;
    constructor(dictionaryPaths?: string[]);
    detect(text: string): PIIMatch[];
    private loadDictionaries;
    private getTypeFromPath;
    private isWordBoundary;
    private deduplicateMatches;
    addTerm(type: string, term: string): void;
    removeTerm(type: string, term: string): void;
    getTerms(type: string): string[];
    getTypes(): string[];
}
//# sourceMappingURL=dictionary.d.ts.map