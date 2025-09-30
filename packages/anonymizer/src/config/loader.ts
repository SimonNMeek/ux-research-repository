import { AnonymizationConfig } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class ConfigLoader {
  static loadFromFile(filePath: string): AnonymizationConfig {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();
      
      if (ext === '.json') {
        return JSON.parse(content);
      } else if (ext === '.yaml' || ext === '.yml') {
        // For now, assume JSON - in production, use a YAML parser
        return JSON.parse(content);
      } else {
        throw new Error(`Unsupported config file format: ${ext}`);
      }
    } catch (error) {
      throw new Error(`Failed to load config from ${filePath}: ${error}`);
    }
  }

  static loadFromObject(config: any): AnonymizationConfig {
    return this.validateConfig(config);
  }

  static createDefaultConfig(): AnonymizationConfig {
    return {
      locale: 'UK',
      entities: {
        PERSON: { enabled: true, strategy: 'PSEUDONYM', confidence: 0.6 },
        SINGLE_NAME: { enabled: true, strategy: 'PSEUDONYM', confidence: 0.7 },
        ORG: { enabled: true, strategy: 'PSEUDONYM' },
        EMAIL: { enabled: true, strategy: 'MASK' },
        PHONE: { enabled: true, strategy: 'MASK' },
        CARD: { enabled: true, strategy: 'REDACT' },
        NI: { enabled: true, strategy: 'REDACT' },
        NHS: { enabled: true, strategy: 'REDACT' },
        POSTCODE: { enabled: true, strategy: 'HASH' },
        DOB: { enabled: true, strategy: 'REDACT' },
        ADDRESS: { enabled: false, strategy: 'REDACT' },
        URL: { enabled: true, strategy: 'REDACT' },
        IP: { enabled: true, strategy: 'REDACT' },
        PASSPORT: { enabled: true, strategy: 'REDACT' },
        IBAN: { enabled: true, strategy: 'REDACT' },
        SORT_CODE_UK: { enabled: true, strategy: 'REDACT' }
      },
      dictionaryPaths: []
    };
  }

  private static validateConfig(config: any): AnonymizationConfig {
    if (!config.locale) {
      config.locale = 'UK';
    }

    if (!config.entities) {
      config.entities = {};
    }

    // Validate entity configurations
    for (const [type, entityConfig] of Object.entries(config.entities)) {
      if (typeof entityConfig === 'object' && entityConfig !== null) {
        const entity = entityConfig as any;
        
        if (typeof entity.enabled !== 'boolean') {
          entity.enabled = true;
        }
        
        if (!['REDACT', 'MASK', 'HASH', 'PSEUDONYM'].includes(entity.strategy)) {
          entity.strategy = 'REDACT';
        }
        
        if (entity.confidence !== undefined && (entity.confidence < 0 || entity.confidence > 1)) {
          entity.confidence = 0.5;
        }
      }
    }

    if (!Array.isArray(config.dictionaryPaths)) {
      config.dictionaryPaths = [];
    }

    return config as AnonymizationConfig;
  }
}
