# @sol/anonymizer

A comprehensive PII (Personally Identifiable Information) anonymization engine for GDPR/PII compliance. This package provides modular detection, redaction strategies, and streaming support for large documents.

## Features

- **Modular Architecture**: Pluggable detectors and strategies
- **Multiple Detection Methods**: Regex-based, dictionary-based, and NER (Named Entity Recognition)
- **Flexible Redaction Strategies**: Redact, mask, hash, and pseudonymise
- **Streaming Support**: Handle large documents efficiently
- **Configuration-Driven**: JSON/YAML profiles for different use cases
- **GDPR Compliant**: No raw PII storage, only hashes and pseudonyms
- **TypeScript Support**: Full type safety and IntelliSense

## Installation

```bash
npm install @sol/anonymizer
```

## Quick Start

```typescript
import { AnonymizationPipeline, ConfigLoader } from '@sol/anonymizer';

// Create a pipeline with default configuration
const config = ConfigLoader.createDefaultConfig();
const pipeline = new AnonymizationPipeline(config);

// Anonymize text
const text = 'Contact John Smith at john@example.com or call +44 7700 900123';
const result = await pipeline.anonymizeText(text);

console.log(result.anonymizedText);
// Output: Contact [PSEUDONYM:PERSON:Person 001] at [MASK:EMAIL:j**n@e*********m] or call [MASK:PHONE:+44 **** *** 123]
```

## Configuration

### Default Configuration

The default configuration includes:

- **PERSON**: Pseudonymise (confidence: 0.6)
- **EMAIL**: Mask (e.g., `j***@d****.com`)
- **PHONE**: Mask (e.g., `+44 **** *** 123`)
- **CARD**: Redact (e.g., `[REDACTED:CARD]`)
- **NI/NHS**: Redact
- **POSTCODE**: Hash (e.g., `[HASH:POSTCODE:6f9c...]`)
- **URL/IP**: Redact

### Custom Configuration

```typescript
const config = {
  locale: 'UK',
  entities: {
    PERSON: { enabled: true, strategy: 'PSEUDONYM', confidence: 0.7 },
    EMAIL: { enabled: true, strategy: 'MASK' },
    PHONE: { enabled: true, strategy: 'REDACT' },
    // ... other entities
  },
  dictionaryPaths: ['path/to/custom/dictionary.txt']
};

const pipeline = new AnonymizationPipeline(config);
```

### Configuration Files

Load configuration from JSON or YAML files:

```typescript
// From file
const config = ConfigLoader.loadFromFile('profiles/uk-default.json');

// From object
const config = ConfigLoader.loadFromObject({
  entities: { PERSON: { enabled: true, strategy: 'PSEUDONYM' } }
});
```

## Detection Methods

### 1. Regex-Based Detection

Detects common PII patterns using regular expressions:

- UK phone numbers (`+44 7700 900123`, `020 7946 0958`)
- Email addresses (`user@domain.com`)
- UK postcodes (`SW1A 1AA`)
- Credit card numbers (with Luhn validation)
- National Insurance numbers (`AB123456C`)
- NHS numbers (`123 456 7890`)
- IBAN, sort codes, URLs, IP addresses
- Dates of birth, passport numbers

### 2. Dictionary-Based Detection

Uses custom dictionaries for specific terms:

```typescript
const detector = new DictionaryDetector(['path/to/dictionary.txt']);
```

Dictionary files should contain one term per line:
```
John Smith
Acme Corporation
Project Alpha
```

### 3. Named Entity Recognition (NER)

Basic NER using common name patterns:

- First name + last name combinations
- Title + name patterns (Mr. Smith, Dr. Jones)
- Configurable confidence thresholds

## Redaction Strategies

### 1. Redact
Replace with generic tokens: `[REDACTED:EMAIL]`

### 2. Mask
Partially mask values: `j***@d****.com`, `+44 **** *** 123`

### 3. Hash
Replace with stable HMAC-SHA256 hash: `[HASH:EMAIL:6f9c...]`

### 4. Pseudonymise
Replace with deterministic labels: `[PSEUDONYM:PERSON:Person 001]`

## Streaming for Large Documents

```typescript
const largeText = '...'; // Large document
const result = await pipeline.anonymizeTextStreaming(largeText, 10000); // 10KB chunks
```

## API Reference

### AnonymizationPipeline

#### `anonymizeText(text: string): Promise<AnonymizeResult>`
Anonymize a text string.

#### `anonymizeTextStreaming(text: string, chunkSize?: number): Promise<AnonymizeResult>`
Anonymize large texts using streaming.

### AnonymizeResult

```typescript
interface AnonymizeResult {
  originalText: string;
  anonymizedText: string;
  matches: PIIMatch[];
  summary: AnonymizationSummary;
  duration: number;
}
```

### PIIMatch

```typescript
interface PIIMatch {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
  detector: string;
}
```

### AnonymizationSummary

```typescript
interface AnonymizationSummary {
  totalMatches: number;
  byType: Record<string, number>;
  byStrategy: Record<string, number>;
  detectorVersion: string;
}
```

## CLI Usage

```bash
# Anonymize a file
npx @sol/anonymizer anonymize input.txt --profile profiles/uk-default.json --out output.txt

# Benchmark performance
npx @sol/anonymizer benchmark --profile profiles/uk-default.json
```

## Security Considerations

- **No Raw PII Storage**: Only hashes and pseudonyms are stored
- **Deterministic Pseudonyms**: Same input always produces same pseudonym
- **HMAC-SHA256**: Secure hashing with configurable secrets
- **Environment Variables**: Use `ANONYMIZE_HMAC_KEY` and `ANONYMIZE_SALT`

## Performance

- **Benchmark Target**: ≥1MB/s on typical laptop
- **Memory Efficient**: Streaming support for large documents
- **Chunking**: Automatic word-boundary chunking for large texts

## Testing

```bash
npm test
```

Tests include:
- Unit tests for each detector
- Integration tests for the pipeline
- Performance benchmarks
- Idempotence verification

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Changelog

### 1.0.0
- Initial release
- Core anonymization pipeline
- Regex, dictionary, and NER detectors
- Four redaction strategies
- Streaming support
- CLI tools
- Comprehensive test suite
