export interface PIIMatch {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
  detector: string;
}

export interface AnonymizationConfig {
  locale: string;
  entities: Record<string, EntityConfig>;
  dictionaryPaths?: string[];
  hmacKey?: string;
  salt?: string;
}

export interface EntityConfig {
  enabled: boolean;
  strategy: 'REDACT' | 'MASK' | 'HASH' | 'PSEUDONYM';
  confidence?: number;
  customPattern?: string;
}

export interface AnonymizeResult {
  originalText: string;
  anonymizedText: string;
  matches: PIIMatch[];
  summary: AnonymizationSummary;
  duration: number;
}

export interface AnonymizationSummary {
  totalMatches: number;
  byType: Record<string, number>;
  byStrategy: Record<string, number>;
  detectorVersion: string;
}

export interface PseudonymMapping {
  piiHash: string;
  type: string;
  label: string;
  firstSeenAt: Date;
}

export interface AnonymizationProfile {
  id: string;
  name: string;
  config: AnonymizationConfig;
  createdBy: string;
  createdAt: Date;
}

export interface AnonymizationAudit {
  id: string;
  documentId: string;
  profileId: string;
  detectorVersion: string;
  summary: AnonymizationSummary;
  durationMs: number;
  createdAt: Date;
}

export interface Detector {
  name: string;
  version: string;
  detect(text: string): PIIMatch[];
}

export interface Strategy {
  name: string;
  apply(match: PIIMatch, context: string): string;
}

export interface Chunk {
  text: string;
  start: number;
  end: number;
}
