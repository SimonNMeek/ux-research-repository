# Configuration Guide

This document provides comprehensive guidance on configuring the @sol/anonymizer package for different use cases and compliance requirements.

## Configuration Overview

The anonymizer uses JSON or YAML configuration files to define:
- Which PII types to detect and anonymize
- Which strategies to use for each PII type
- Confidence thresholds for detection
- Custom dictionary paths
- Locale-specific settings

## Basic Configuration Structure

```json
{
  "locale": "UK",
  "entities": {
    "PERSON": { "enabled": true, "strategy": "PSEUDONYM", "confidence": 0.6 },
    "EMAIL": { "enabled": true, "strategy": "MASK" },
    "PHONE": { "enabled": true, "strategy": "MASK" },
    "CARD": { "enabled": true, "strategy": "REDACT" },
    "NI": { "enabled": true, "strategy": "REDACT" },
    "NHS": { "enabled": true, "strategy": "REDACT" },
    "POSTCODE": { "enabled": true, "strategy": "HASH" },
    "DOB": { "enabled": true, "strategy": "REDACT" },
    "ADDRESS": { "enabled": false, "strategy": "REDACT" },
    "URL": { "enabled": true, "strategy": "REDACT" },
    "IP": { "enabled": true, "strategy": "REDACT" },
    "PASSPORT": { "enabled": true, "strategy": "REDACT" },
    "IBAN": { "enabled": true, "strategy": "REDACT" },
    "SORT_CODE_UK": { "enabled": true, "strategy": "REDACT" }
  },
  "dictionaryPaths": [
    "config/dictionaries/clients.txt",
    "config/dictionaries/staff.txt"
  ]
}
```

## Configuration Properties

### Top-Level Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `locale` | string | Yes | Locale for PII detection (e.g., "UK", "US", "EU") |
| `entities` | object | Yes | Configuration for each PII entity type |
| `dictionaryPaths` | string[] | No | Paths to custom dictionary files |

### Entity Configuration

Each entity in the `entities` object supports:

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `enabled` | boolean | No | true | Whether to detect this entity type |
| `strategy` | string | No | "REDACT" | Anonymization strategy to use |
| `confidence` | number | No | 0.5 | Minimum confidence threshold (0-1) |

### Supported Strategies

| Strategy | Description | Example Output |
|----------|-------------|----------------|
| `REDACT` | Replace with generic token | `[REDACTED:EMAIL]` |
| `MASK` | Partially mask the value | `j***@d****.com` |
| `HASH` | Replace with hash prefix | `[HASH:EMAIL:6f9c...]` |
| `PSEUDONYM` | Replace with deterministic label | `[PSEUDONYM:PERSON:Person 001]` |

## Predefined Configurations

### UK Default Configuration

```json
{
  "locale": "UK",
  "entities": {
    "PERSON": { "enabled": true, "strategy": "PSEUDONYM", "confidence": 0.6 },
    "ORG": { "enabled": true, "strategy": "PSEUDONYM" },
    "EMAIL": { "enabled": true, "strategy": "MASK" },
    "PHONE": { "enabled": true, "strategy": "MASK" },
    "CARD": { "enabled": true, "strategy": "REDACT" },
    "NI": { "enabled": true, "strategy": "REDACT" },
    "NHS": { "enabled": true, "strategy": "REDACT" },
    "POSTCODE": { "enabled": true, "strategy": "HASH" },
    "DOB": { "enabled": true, "strategy": "REDACT" },
    "URL": { "enabled": true, "strategy": "REDACT" },
    "IP": { "enabled": true, "strategy": "REDACT" },
    "PASSPORT": { "enabled": true, "strategy": "REDACT" },
    "IBAN": { "enabled": true, "strategy": "REDACT" },
    "SORT_CODE_UK": { "enabled": true, "strategy": "REDACT" }
  },
  "dictionaryPaths": []
}
```

### US Configuration

```json
{
  "locale": "US",
  "entities": {
    "PERSON": { "enabled": true, "strategy": "PSEUDONYM", "confidence": 0.6 },
    "ORG": { "enabled": true, "strategy": "PSEUDONYM" },
    "EMAIL": { "enabled": true, "strategy": "MASK" },
    "PHONE": { "enabled": true, "strategy": "MASK" },
    "CARD": { "enabled": true, "strategy": "REDACT" },
    "SSN": { "enabled": true, "strategy": "REDACT" },
    "DOB": { "enabled": true, "strategy": "REDACT" },
    "URL": { "enabled": true, "strategy": "REDACT" },
    "IP": { "enabled": true, "strategy": "REDACT" }
  },
  "dictionaryPaths": []
}
```

### EU GDPR Configuration

```json
{
  "locale": "EU",
  "entities": {
    "PERSON": { "enabled": true, "strategy": "PSEUDONYM", "confidence": 0.7 },
    "ORG": { "enabled": true, "strategy": "PSEUDONYM" },
    "EMAIL": { "enabled": true, "strategy": "HASH" },
    "PHONE": { "enabled": true, "strategy": "HASH" },
    "CARD": { "enabled": true, "strategy": "REDACT" },
    "DOB": { "enabled": true, "strategy": "REDACT" },
    "URL": { "enabled": true, "strategy": "REDACT" },
    "IP": { "enabled": true, "strategy": "REDACT" }
  },
  "dictionaryPaths": []
}
```

## Custom Dictionary Configuration

### Dictionary File Format

Dictionary files should contain one term per line:

```
# clients.txt
John Smith
Acme Corporation
Project Alpha
Beta Testing
Gamma Solutions

# staff.txt
Alice Johnson
Bob Wilson
Carol Davis
David Brown
```

### Loading Custom Dictionaries

```json
{
  "locale": "UK",
  "entities": {
    "PERSON": { "enabled": true, "strategy": "PSEUDONYM" },
    "ORG": { "enabled": true, "strategy": "PSEUDONYM" }
  },
  "dictionaryPaths": [
    "config/dictionaries/clients.txt",
    "config/dictionaries/staff.txt",
    "config/dictionaries/products.txt"
  ]
}
```

## Strategy Selection Guidelines

### When to Use REDACT

- **Sensitive data**: Credit cards, SSNs, NHS numbers
- **High privacy requirements**: When any trace of the original is unacceptable
- **Compliance requirements**: When regulations require complete removal

```json
{
  "CARD": { "enabled": true, "strategy": "REDACT" },
  "SSN": { "enabled": true, "strategy": "REDACT" },
  "NHS": { "enabled": true, "strategy": "REDACT" }
}
```

### When to Use MASK

- **Contact information**: Emails, phone numbers
- **Balanced privacy**: When some context is needed but privacy is important
- **User experience**: When users need to recognize their own data

```json
{
  "EMAIL": { "enabled": true, "strategy": "MASK" },
  "PHONE": { "enabled": true, "strategy": "MASK" }
}
```

### When to Use HASH

- **Data linkage**: When you need to link records across systems
- **Analytics**: When you need to count unique entities
- **Audit trails**: When you need to track changes

```json
{
  "POSTCODE": { "enabled": true, "strategy": "HASH" },
  "EMAIL": { "enabled": true, "strategy": "HASH" }
}
```

### When to Use PSEUDONYM

- **Names and organizations**: When you need readable labels
- **Data analysis**: When you need to track entities across documents
- **User experience**: When you need human-readable references

```json
{
  "PERSON": { "enabled": true, "strategy": "PSEUDONYM" },
  "ORG": { "enabled": true, "strategy": "PSEUDONYM" }
}
```

## Confidence Thresholds

### Understanding Confidence

Confidence scores range from 0.0 to 1.0:
- **1.0**: Perfect match (e.g., regex patterns)
- **0.8-0.9**: High confidence (e.g., dictionary matches)
- **0.6-0.7**: Medium confidence (e.g., NER with common names)
- **0.4-0.5**: Low confidence (e.g., ambiguous patterns)

### Setting Thresholds

```json
{
  "entities": {
    "PERSON": { "enabled": true, "strategy": "PSEUDONYM", "confidence": 0.6 },
    "EMAIL": { "enabled": true, "strategy": "MASK", "confidence": 0.9 },
    "PHONE": { "enabled": true, "strategy": "MASK", "confidence": 0.8 }
  }
}
```

### Threshold Guidelines

- **High precision needed**: Use higher thresholds (0.8-0.9)
- **High recall needed**: Use lower thresholds (0.5-0.6)
- **Balanced approach**: Use medium thresholds (0.6-0.7)

## Environment-Specific Configurations

### Development Environment

```json
{
  "locale": "UK",
  "entities": {
    "PERSON": { "enabled": true, "strategy": "MASK", "confidence": 0.5 },
    "EMAIL": { "enabled": true, "strategy": "MASK", "confidence": 0.5 }
  },
  "dictionaryPaths": ["config/dev-dictionary.txt"]
}
```

### Staging Environment

```json
{
  "locale": "UK",
  "entities": {
    "PERSON": { "enabled": true, "strategy": "PSEUDONYM", "confidence": 0.6 },
    "EMAIL": { "enabled": true, "strategy": "MASK", "confidence": 0.7 }
  },
  "dictionaryPaths": ["config/staging-dictionary.txt"]
}
```

### Production Environment

```json
{
  "locale": "UK",
  "entities": {
    "PERSON": { "enabled": true, "strategy": "PSEUDONYM", "confidence": 0.7 },
    "EMAIL": { "enabled": true, "strategy": "HASH", "confidence": 0.8 },
    "PHONE": { "enabled": true, "strategy": "HASH", "confidence": 0.8 }
  },
  "dictionaryPaths": ["config/prod-dictionary.txt"]
}
```

## Configuration Validation

### Automatic Validation

The configuration loader automatically validates and fixes common issues:

```typescript
// Invalid configuration
const invalidConfig = {
  entities: {
    PERSON: { enabled: 'yes', strategy: 'INVALID' },
    EMAIL: { confidence: 1.5 }
  }
};

// Automatically fixed
const fixedConfig = ConfigLoader.loadFromObject(invalidConfig);
// Result:
// {
//   entities: {
//     PERSON: { enabled: true, strategy: 'REDACT' },
//     EMAIL: { confidence: 0.5 }
//   }
// }
```

### Manual Validation

```typescript
import { ConfigLoader } from '@sol/anonymizer';

try {
  const config = ConfigLoader.loadFromFile('config.json');
  console.log('Configuration is valid');
} catch (error) {
  console.error('Configuration error:', error.message);
}
```

## Best Practices

### 1. Start with Defaults

Begin with the default configuration and customize as needed:

```typescript
const config = ConfigLoader.createDefaultConfig();
// Customize specific entities
config.entities.PERSON.confidence = 0.7;
config.entities.EMAIL.strategy = 'HASH';
```

### 2. Use Environment Variables

Store sensitive configuration in environment variables:

```bash
export ANONYMIZE_HMAC_KEY="your-secure-key"
export ANONYMIZE_SALT="your-secure-salt"
export ANONYMIZE_DEFAULT_CONFIDENCE="0.7"
```

### 3. Version Control

- Store configuration files in version control
- Use different files for different environments
- Document configuration changes

### 4. Testing

Test configurations with sample data:

```typescript
const testText = 'Contact John Smith at john@example.com';
const result = await pipeline.anonymizeText(testText);
console.log('Test result:', result.anonymizedText);
```

### 5. Monitoring

Monitor anonymization results:

```typescript
const result = await pipeline.anonymizeText(text);
console.log('Matches found:', result.summary.totalMatches);
console.log('By type:', result.summary.byType);
console.log('By strategy:', result.summary.byStrategy);
```

## Troubleshooting

### Common Issues

1. **No matches found**: Check confidence thresholds
2. **Too many false positives**: Increase confidence thresholds
3. **Missing PII types**: Ensure entities are enabled
4. **Dictionary not working**: Check file paths and format

### Debug Mode

Enable debug logging:

```typescript
const config = ConfigLoader.createDefaultConfig();
config.debug = true; // Enable debug logging
const pipeline = new AnonymizationPipeline(config);
```

### Performance Tuning

- Adjust chunk sizes for large documents
- Use streaming for very large texts
- Monitor memory usage
- Profile detection performance

## Migration Guide

### Upgrading Configurations

When upgrading the anonymizer package:

1. **Backup existing configurations**
2. **Review new default settings**
3. **Test with sample data**
4. **Update confidence thresholds if needed**
5. **Validate all custom dictionaries**

### Configuration Changes

- **New entity types**: Add to configuration as needed
- **Strategy changes**: Update strategy settings
- **Threshold adjustments**: Fine-tune confidence levels
- **Dictionary updates**: Refresh custom dictionaries

## Support

For configuration questions or issues:

- Check the [README.md](README.md) for basic usage
- Review [SECURITY.md](SECURITY.md) for security considerations
- Open an issue on GitHub for bugs or feature requests
- Contact support for enterprise configurations
