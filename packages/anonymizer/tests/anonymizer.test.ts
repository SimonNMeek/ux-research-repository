import { AnonymizationPipeline } from '../src/pipeline/anonymizer';
import { ConfigLoader } from '../src/config/loader';
import * as fs from 'fs';
import * as path from 'path';

describe('AnonymizationPipeline', () => {
  let pipeline: AnonymizationPipeline;
  let config: any;

  beforeEach(() => {
    config = ConfigLoader.createDefaultConfig();
    pipeline = new AnonymizationPipeline(config);
  });

  test('should anonymize email addresses', async () => {
    const text = 'Contact us at john@example.com for more information.';
    const result = await pipeline.anonymizeText(text);
    
    expect(result.anonymizedText).toContain('[MASK:EMAIL:');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].type).toBe('EMAIL');
  });

  test('should anonymize phone numbers', async () => {
    const text = 'Call us at +44 7700 900123 or 020 7946 0958.';
    const result = await pipeline.anonymizeText(text);
    
    expect(result.anonymizedText).toContain('[MASK:PHONE:');
    expect(result.matches.length).toBeGreaterThan(0);
  });

  test('should anonymize credit card numbers', async () => {
    const text = 'Card number: 4532 1234 5678 9012';
    const result = await pipeline.anonymizeText(text);
    
    expect(result.anonymizedText).toContain('[REDACTED:CARD]');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].type).toBe('CARD');
  });

  test('should anonymize UK postcodes', async () => {
    const text = 'Address: 123 Main Street, London, SW1A 1AA';
    const result = await pipeline.anonymizeText(text);
    
    expect(result.anonymizedText).toContain('[HASH:POSTCODE:');
    expect(result.matches.length).toBeGreaterThan(0);
  });

  test('should anonymize National Insurance numbers', async () => {
    const text = 'NI number: AB123456C';
    const result = await pipeline.anonymizeText(text);
    
    expect(result.anonymizedText).toContain('[REDACTED:NI]');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].type).toBe('NI');
  });

  test('should anonymize NHS numbers', async () => {
    const text = 'NHS number: 123 456 7890';
    const result = await pipeline.anonymizeText(text);
    
    expect(result.anonymizedText).toContain('[REDACTED:NHS]');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].type).toBe('NHS');
  });

  test('should anonymize URLs', async () => {
    const text = 'Visit https://example.com for more info.';
    const result = await pipeline.anonymizeText(text);
    
    expect(result.anonymizedText).toContain('[REDACTED:URL]');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].type).toBe('URL');
  });

  test('should anonymize IP addresses', async () => {
    const text = 'Server IP: 192.168.1.100';
    const result = await pipeline.anonymizeText(text);
    
    expect(result.anonymizedText).toContain('[REDACTED:IP]');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].type).toBe('IP');
  });

  test('should anonymize dates of birth', async () => {
    const text = 'Born on 15/03/1985';
    const result = await pipeline.anonymizeText(text);
    
    expect(result.anonymizedText).toContain('[REDACTED:DOB]');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].type).toBe('DOB');
  });

  test('should generate consistent pseudonyms', async () => {
    const text1 = 'John Smith is a developer.';
    const text2 = 'John Smith works at Acme Corp.';
    
    const result1 = await pipeline.anonymizeText(text1);
    const result2 = await pipeline.anonymizeText(text2);
    
    // Extract pseudonyms from results
    const pseudonym1 = result1.anonymizedText.match(/\[PSEUDONYM:PERSON:([^\]]+)\]/)?.[1];
    const pseudonym2 = result2.anonymizedText.match(/\[PSEUDONYM:PERSON:([^\]]+)\]/)?.[1];
    
    expect(pseudonym1).toBe(pseudonym2);
  });

  test('should handle complex text with multiple PII types', async () => {
    const text = `John Smith (john@example.com, +44 7700 900123) lives at 123 Main St, London, SW1A 1AA.
    Born 15/03/1985, NI: AB123456C, NHS: 123 456 7890.
    Card: 4532 1234 5678 9012, Sort Code: 20-00-00.
    Visit https://example.com or call 192.168.1.100.`;
    
    const result = await pipeline.anonymizeText(text);
    
    expect(result.matches.length).toBeGreaterThan(5);
    expect(result.summary.totalMatches).toBeGreaterThan(5);
    expect(result.summary.byType).toHaveProperty('EMAIL');
    expect(result.summary.byType).toHaveProperty('PHONE');
    expect(result.summary.byType).toHaveProperty('CARD');
  });

  test('should respect confidence thresholds', async () => {
    config.entities.PERSON.confidence = 0.9;
    pipeline = new AnonymizationPipeline(config);
    
    const text = 'John Smith is a developer.';
    const result = await pipeline.anonymizeText(text);
    
    // With high confidence threshold, name detection might be filtered out
    expect(result.matches.length).toBeLessThanOrEqual(1);
  });

  test('should handle disabled entity types', async () => {
    config.entities.EMAIL.enabled = false;
    pipeline = new AnonymizationPipeline(config);
    
    const text = 'Contact us at john@example.com';
    const result = await pipeline.anonymizeText(text);
    
    expect(result.anonymizedText).toBe(text); // No changes
    expect(result.matches).toHaveLength(0);
  });

  test('should be idempotent', async () => {
    const text = 'Contact john@example.com for support.';
    
    const result1 = await pipeline.anonymizeText(text);
    const result2 = await pipeline.anonymizeText(result1.anonymizedText);
    
    expect(result2.anonymizedText).toBe(result1.anonymizedText);
    expect(result2.matches).toHaveLength(0);
  });

  test('should handle streaming for large texts', async () => {
    const largeText = 'John Smith (john@example.com) '.repeat(1000);
    
    const result = await pipeline.anonymizeTextStreaming(largeText, 1000);
    
    expect(result.anonymizedText).toContain('[PSEUDONYM:PERSON:');
    expect(result.anonymizedText).toContain('[MASK:EMAIL:');
    expect(result.matches.length).toBeGreaterThan(0);
  });
});

describe('ConfigLoader', () => {
  test('should create default config', () => {
    const config = ConfigLoader.createDefaultConfig();
    
    expect(config.locale).toBe('UK');
    expect(config.entities.PERSON.enabled).toBe(true);
    expect(config.entities.PERSON.strategy).toBe('PSEUDONYM');
    expect(config.entities.EMAIL.strategy).toBe('MASK');
    expect(config.entities.CARD.strategy).toBe('REDACT');
  });

  test('should load config from file', () => {
    const configPath = path.join(__dirname, '..', 'profiles', 'uk-default.json');
    const config = ConfigLoader.loadFromFile(configPath);
    
    expect(config.locale).toBe('UK');
    expect(config.entities.PERSON.strategy).toBe('PSEUDONYM');
  });

  test('should validate and fix invalid config', () => {
    const invalidConfig = {
      entities: {
        PERSON: { enabled: 'yes', strategy: 'INVALID' },
        EMAIL: { confidence: 1.5 }
      }
    };
    
    const config = ConfigLoader.loadFromObject(invalidConfig);
    
    expect(config.entities.PERSON.enabled).toBe(true);
    expect(config.entities.PERSON.strategy).toBe('REDACT');
    expect(config.entities.EMAIL.confidence).toBe(0.5);
  });
});
