import { 
  AnonymizeResult, 
  AnonymizationConfig, 
  PIIMatch, 
  AnonymizationSummary,
  Detector,
  Strategy,
  Chunk
} from '../types';
import { createDefaultDetectors } from '../detectors';
import { createDefaultStrategies } from '../strategies';

export class AnonymizationPipeline {
  private detectors: Detector[];
  private strategies: Map<string, Strategy>;
  private config: AnonymizationConfig;

  constructor(config: AnonymizationConfig) {
    this.config = config;
    this.detectors = createDefaultDetectors(config.dictionaryPaths);
    this.strategies = createDefaultStrategies(config.hmacKey, config.salt);
  }

  async anonymizeText(text: string): Promise<AnonymizeResult> {
    const startTime = Date.now();
    
    // Check if text is already fully anonymized (contains only anonymization tokens)
    const anonymizationTokenPattern = /\[(?:REDACTED|MASK|HASH|PSEUDONYM):[^\]]+\]/g;
    const tokens = text.match(anonymizationTokenPattern) || [];
    const tokenLength = tokens.join('').length;
    const textLength = text.replace(/\s/g, '').length; // Remove whitespace for comparison
    
    // Only skip if more than 95% of the text consists of anonymization tokens
    if (tokens.length > 0 && tokenLength > textLength * 0.95) {
      // Return the text as-is if it's already fully anonymized
      return {
        originalText: text,
        anonymizedText: text,
        matches: [],
        summary: {
          totalMatches: 0,
          byType: {},
          byStrategy: {},
          detectorVersion: '1.0.0'
        },
        duration: Date.now() - startTime
      };
    }
    
    // Step 1: Detect PII
    const matches = await this.detectPII(text);
    
    // Step 2: Filter matches based on config
    const filteredMatches = this.filterMatches(matches);
    
    // Step 3: Apply anonymization strategies
    const anonymizedText = this.applyStrategies(text, filteredMatches);
    
    // Step 4: Generate summary
    const summary = this.generateSummary(filteredMatches);
    
    const duration = Date.now() - startTime;
    
    return {
      originalText: text,
      anonymizedText,
      matches: filteredMatches,
      summary,
      duration
    };
  }

  private async detectPII(text: string): Promise<PIIMatch[]> {
    const allMatches: PIIMatch[] = [];
    
    // Run all detectors
    for (const detector of this.detectors) {
      const matches = detector.detect(text);
      allMatches.push(...matches);
    }
    
    // Merge and deduplicate matches
    return this.mergeMatches(allMatches);
  }

  private filterMatches(matches: PIIMatch[]): PIIMatch[] {
    return matches.filter(match => {
      const entityConfig = this.config.entities[match.type];
      if (!entityConfig || !entityConfig.enabled) {
        return false;
      }
      
      if (entityConfig.confidence && match.confidence < entityConfig.confidence) {
        return false;
      }
      
      return true;
    });
  }

  private applyStrategies(text: string, matches: PIIMatch[]): string {
    // Sort matches by start position (descending) to avoid offset issues
    const sortedMatches = matches.sort((a, b) => b.start - a.start);
    
    let result = text;
    
    for (const match of sortedMatches) {
      const entityConfig = this.config.entities[match.type];
      const strategy = this.strategies.get(entityConfig.strategy);
      
      if (strategy) {
        const replacement = strategy.apply(match, result);
        result = result.substring(0, match.start) + replacement + result.substring(match.end);
      }
    }
    
    return result;
  }

  private mergeMatches(matches: PIIMatch[]): PIIMatch[] {
    // Sort by start position
    const sorted = matches.sort((a, b) => a.start - b.start);
    const merged: PIIMatch[] = [];
    
    for (const match of sorted) {
      const overlapping = merged.find(existing => 
        (match.start < existing.end && match.end > existing.start)
      );
      
      if (!overlapping) {
        merged.push(match);
      } else {
        // Priority order: PERSON > SINGLE_NAME > others
        const priority: Record<string, number> = { 'PERSON': 3, 'SINGLE_NAME': 2 };
        const matchPriority = priority[match.type] || 1;
        const existingPriority = priority[overlapping.type] || 1;
        
        if (matchPriority > existingPriority || 
            (matchPriority === existingPriority && match.confidence > overlapping.confidence)) {
          const index = merged.indexOf(overlapping);
          merged[index] = match;
        }
      }
    }
    
    return merged;
  }

  private generateSummary(matches: PIIMatch[]): AnonymizationSummary {
    const byType: Record<string, number> = {};
    const byStrategy: Record<string, number> = {};
    
    for (const match of matches) {
      // Count by type
      byType[match.type] = (byType[match.type] || 0) + 1;
      
      // Count by strategy
      const entityConfig = this.config.entities[match.type];
      const strategy = entityConfig?.strategy || 'REDACT';
      byStrategy[strategy] = (byStrategy[strategy] || 0) + 1;
    }
    
    return {
      totalMatches: matches.length,
      byType,
      byStrategy,
      detectorVersion: '1.0.0'
    };
  }

  // Chunking for large texts
  private chunkText(text: string, chunkSize: number = 10000): Chunk[] {
    const chunks: Chunk[] = [];
    let start = 0;
    
    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);
      
      // Try to break at word boundary
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start + chunkSize * 0.8) {
          end = lastSpace;
        }
      }
      
      chunks.push({
        text: text.substring(start, end),
        start,
        end
      });
      
      start = end;
    }
    
    return chunks;
  }

  // Streaming anonymization for large texts
  async anonymizeTextStreaming(text: string, chunkSize: number = 10000): Promise<AnonymizeResult> {
    const startTime = Date.now();
    const chunks = this.chunkText(text, chunkSize);
    
    let allMatches: PIIMatch[] = [];
    let anonymizedText = '';
    
    for (const chunk of chunks) {
      const chunkResult = await this.anonymizeText(chunk.text);
      
      // Adjust match positions for global text
      const adjustedMatches = chunkResult.matches.map(match => ({
        ...match,
        start: match.start + chunk.start,
        end: match.end + chunk.start
      }));
      
      allMatches.push(...adjustedMatches);
      anonymizedText += chunkResult.anonymizedText;
    }
    
    // Merge overlapping matches across chunks
    const mergedMatches = this.mergeMatches(allMatches);
    const summary = this.generateSummary(mergedMatches);
    
    const duration = Date.now() - startTime;
    
    return {
      originalText: text,
      anonymizedText,
      matches: mergedMatches,
      summary,
      duration
    };
  }
}
