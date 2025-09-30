export { AnonymizationPipeline } from './pipeline/anonymizer';
export { ConfigLoader } from './config/loader';
export * from './types';
export * from './detectors';
export * from './strategies';
import { AnonymizationPipeline } from './pipeline/anonymizer';
import { AnonymizeResult, AnonymizationConfig } from './types';
export declare function anonymizeText(text: string, config: AnonymizationConfig): Promise<AnonymizeResult>;
export declare function anonymizeTextStreaming(text: string, config: AnonymizationConfig, chunkSize?: number): Promise<AnonymizeResult>;
export declare function createPipelineFromConfig(configPath: string): AnonymizationPipeline;
export declare function createPipelineFromObject(config: AnonymizationConfig): AnonymizationPipeline;
//# sourceMappingURL=index.d.ts.map