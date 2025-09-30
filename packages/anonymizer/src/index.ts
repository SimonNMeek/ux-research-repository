// Main exports
export { AnonymizationPipeline } from './pipeline/anonymizer';
export { ConfigLoader } from './config/loader';

// Type exports
export * from './types';

// Detector exports
export * from './detectors';

// Strategy exports
export * from './strategies';

// Main anonymization function
import { AnonymizationPipeline } from './pipeline/anonymizer';
import { ConfigLoader } from './config/loader';
import { AnonymizeResult, AnonymizationConfig } from './types';

export async function anonymizeText(
  text: string, 
  config: AnonymizationConfig
): Promise<AnonymizeResult> {
  const pipeline = new AnonymizationPipeline(config);
  return await pipeline.anonymizeText(text);
}

export async function anonymizeTextStreaming(
  text: string, 
  config: AnonymizationConfig,
  chunkSize: number = 10000
): Promise<AnonymizeResult> {
  const pipeline = new AnonymizationPipeline(config);
  return await pipeline.anonymizeTextStreaming(text, chunkSize);
}

// CLI support
export function createPipelineFromConfig(configPath: string): AnonymizationPipeline {
  const config = ConfigLoader.loadFromFile(configPath);
  return new AnonymizationPipeline(config);
}

export function createPipelineFromObject(config: AnonymizationConfig): AnonymizationPipeline {
  return new AnonymizationPipeline(config);
}
