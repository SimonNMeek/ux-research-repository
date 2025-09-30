# Security Policy

## Overview

This document outlines the security considerations and best practices for the @sol/anonymizer package, designed to ensure GDPR/PII compliance and data protection.

## Core Security Principles

### 1. No Raw PII Storage

**Principle**: Never store raw PII in any persistent storage.

**Implementation**:
- Only hashes and pseudonyms are stored in databases
- Original PII is processed in memory only
- No logging of raw PII values
- All PII is immediately anonymized after detection

### 2. Deterministic Pseudonymisation

**Principle**: Same input always produces the same pseudonym for consistency.

**Implementation**:
- Uses HMAC-SHA256 with configurable secrets
- Pseudonyms are stored in a `pseudonyms` table
- Keyed by hash of original PII, not the raw value
- Enables data linkage while maintaining privacy

### 3. Secure Hashing

**Principle**: Use cryptographically secure hashing for PII.

**Implementation**:
- HMAC-SHA256 with configurable key and salt
- Environment variables for secrets: `ANONYMIZE_HMAC_KEY`, `ANONYMIZE_SALT`
- Short hash prefixes (8 characters) for readability
- Salt prevents rainbow table attacks

## Configuration Security

### Environment Variables

```bash
# Required for secure hashing
export ANONYMIZE_HMAC_KEY="your-secure-hmac-key-here"
export ANONYMIZE_SALT="your-secure-salt-here"

# Optional: Custom confidence thresholds
export ANONYMIZE_DEFAULT_CONFIDENCE="0.7"
```

### Secret Management

- **Never commit secrets to version control**
- Use environment variables or secret management systems
- Rotate keys periodically
- Use different keys for different environments

### Configuration Validation

- All configurations are validated before use
- Invalid configurations fall back to secure defaults
- Confidence thresholds are clamped to valid ranges (0-1)
- Unknown strategies default to 'REDACT' (most secure)

## Data Flow Security

### 1. Input Validation

```typescript
// All inputs are validated
const MAX_BYTES = 2 * 1024 * 1024; // 2MB limit
const isTxt = filename.endsWith('.txt');
const isMd = filename.endsWith('.md');

if (!isTxt && !isMd) {
  throw new Error('Only .txt and .md files allowed');
}
```

### 2. Processing Pipeline

1. **Detection**: PII is detected using regex, dictionary, or NER
2. **Filtering**: Matches are filtered by confidence thresholds
3. **Anonymization**: PII is replaced with tokens/pseudonyms
4. **Storage**: Only anonymized content and metadata are stored

### 3. Output Sanitization

- All output is sanitized to prevent injection attacks
- Redaction tokens use unlikely bracketed schema: `[REDACTED:TYPE]`
- No raw PII in error messages or logs

## Database Security

### Schema Design

```sql
-- Pseudonyms table - only stores hashes and labels
CREATE TABLE pseudonyms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pii_hash TEXT NOT NULL UNIQUE,  -- HMAC of original PII
  type TEXT NOT NULL,             -- PII type (EMAIL, PERSON, etc.)
  label TEXT NOT NULL,            -- Pseudonym (Person 001, etc.)
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit table - tracks anonymization operations
CREATE TABLE anonymization_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  profile_id TEXT NOT NULL,
  detector_version TEXT NOT NULL,
  summary TEXT NOT NULL,          -- JSON summary (no raw PII)
  duration_ms INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Access Control

- Database connections use least privilege principles
- Separate read/write permissions where possible
- Regular security audits of database access
- Encrypted connections (TLS) for remote databases

## API Security

### Input Sanitization

```typescript
// All API inputs are sanitized
const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
    .trim()
    .substring(0, 10000); // Limit length
};
```

### Rate Limiting

- Implement rate limiting on anonymization endpoints
- Prevent abuse of computational resources
- Monitor for unusual usage patterns

### Authentication

- All API endpoints require authentication
- Use JWT tokens or session-based auth
- Implement proper authorization checks
- Log all API access for audit trails

## Compliance Considerations

### GDPR Compliance

- **Right to Erasure**: Pseudonyms can be deleted from the database
- **Data Portability**: Anonymized data can be exported
- **Purpose Limitation**: Anonymization is only for specified purposes
- **Data Minimization**: Only necessary PII is processed

### Data Retention

- Anonymized data can be retained indefinitely
- Original PII is not retained after processing
- Audit logs should be retained per compliance requirements
- Pseudonym mappings should be retained for data linkage

### Cross-Border Transfers

- Anonymized data can be transferred internationally
- Ensure pseudonym mappings comply with local laws
- Consider data residency requirements
- Implement appropriate safeguards

## Security Monitoring

### Logging

```typescript
// Security-relevant events are logged
logger.info('Anonymization completed', {
  documentId: result.id,
  matchesFound: result.summary.totalMatches,
  duration: result.duration,
  profileId: config.profileId
  // Never log raw PII
});
```

### Monitoring

- Monitor for unusual anonymization patterns
- Alert on high-volume processing
- Track performance metrics
- Monitor for potential security breaches

### Incident Response

1. **Detection**: Monitor logs and metrics
2. **Assessment**: Determine scope and impact
3. **Containment**: Isolate affected systems
4. **Recovery**: Restore from backups if needed
5. **Lessons Learned**: Update security measures

## Best Practices

### Development

- Use TypeScript for type safety
- Implement comprehensive testing
- Code reviews for all changes
- Security-focused development practices

### Deployment

- Use HTTPS for all communications
- Implement proper firewall rules
- Regular security updates
- Monitor system resources

### Operations

- Regular security audits
- Penetration testing
- Employee security training
- Incident response procedures

## Vulnerability Reporting

If you discover a security vulnerability, please:

1. **Do not** create a public GitHub issue
2. Email security concerns to: security@example.com
3. Include detailed information about the vulnerability
4. Allow reasonable time for response before disclosure

## Security Updates

- Security updates are released as soon as possible
- Critical vulnerabilities are patched within 24 hours
- Regular security updates are released monthly
- All updates are thoroughly tested

## Contact

For security-related questions or concerns:
- Email: security@example.com
- Security Team: security-team@example.com
- Emergency: +1-XXX-XXX-XXXX

## Version History

### 1.0.0
- Initial security policy
- Core security measures implemented
- GDPR compliance framework
- Comprehensive audit logging
