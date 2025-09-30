import { AnonymizeResult, AnonymizationConfig } from '../types';
export declare class AnonymizationPipeline {
    private detectors;
    private strategies;
    private config;
    constructor(config: AnonymizationConfig);
    anonymizeText(text: string): Promise<AnonymizeResult>;
    private detectPII;
    private filterMatches;
    private applyStrategies;
    private mergeMatches;
    private generateSummary;
    private chunkText;
    anonymizeTextStreaming(text: string, chunkSize?: number): Promise<AnonymizeResult>;
}
//# sourceMappingURL=anonymizer.d.ts.map