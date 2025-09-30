"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ConfigLoader {
    static loadFromFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const ext = path.extname(filePath).toLowerCase();
            if (ext === '.json') {
                return JSON.parse(content);
            }
            else if (ext === '.yaml' || ext === '.yml') {
                // For now, assume JSON - in production, use a YAML parser
                return JSON.parse(content);
            }
            else {
                throw new Error(`Unsupported config file format: ${ext}`);
            }
        }
        catch (error) {
            throw new Error(`Failed to load config from ${filePath}: ${error}`);
        }
    }
    static loadFromObject(config) {
        return this.validateConfig(config);
    }
    static createDefaultConfig() {
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
    static validateConfig(config) {
        if (!config.locale) {
            config.locale = 'UK';
        }
        if (!config.entities) {
            config.entities = {};
        }
        // Validate entity configurations
        for (const [type, entityConfig] of Object.entries(config.entities)) {
            if (typeof entityConfig === 'object' && entityConfig !== null) {
                const entity = entityConfig;
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
        return config;
    }
}
exports.ConfigLoader = ConfigLoader;
//# sourceMappingURL=loader.js.map