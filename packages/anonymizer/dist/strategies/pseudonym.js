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
exports.PseudonymStrategy = void 0;
const base_1 = require("./base");
const crypto = __importStar(require("crypto"));
class PseudonymStrategy extends base_1.BaseStrategy {
    constructor(hmacKey = 'default-key', salt = 'default-salt') {
        super();
        this.name = 'pseudonym';
        this.pseudonymMappings = new Map();
        this.nextIds = new Map();
        this.hmacKey = hmacKey;
        this.salt = salt;
    }
    apply(match, context) {
        const piiHash = this.hashPII(match.value);
        // Check if we already have a pseudonym for this PII
        if (this.pseudonymMappings.has(piiHash)) {
            const mapping = this.pseudonymMappings.get(piiHash);
            return this.generateToken(match.type, 'PSEUDONYM', mapping.label);
        }
        // Generate new pseudonym
        const label = this.generateNewPseudonym(match.type);
        const mapping = {
            piiHash,
            type: match.type,
            label,
            firstSeenAt: new Date()
        };
        this.pseudonymMappings.set(piiHash, mapping);
        return this.generateToken(match.type, 'PSEUDONYM', label);
    }
    hashPII(value) {
        const hmac = crypto.createHmac('sha256', this.hmacKey);
        hmac.update(this.salt + value);
        return hmac.digest('hex');
    }
    generateNewPseudonym(type) {
        const currentId = this.nextIds.get(type) || 1;
        this.nextIds.set(type, currentId + 1);
        switch (type) {
            case 'PERSON':
                return `Person ${currentId.toString().padStart(3, '0')}`;
            case 'ORG':
                return `Organization ${currentId.toString().padStart(3, '0')}`;
            case 'EMAIL':
                return `email${currentId.toString().padStart(3, '0')}@example.com`;
            case 'PHONE':
                return `Phone ${currentId.toString().padStart(3, '0')}`;
            case 'ADDRESS':
                return `Address ${currentId.toString().padStart(3, '0')}`;
            default:
                return `${type} ${currentId.toString().padStart(3, '0')}`;
        }
    }
    getPseudonymMappings() {
        return Array.from(this.pseudonymMappings.values());
    }
    loadPseudonymMappings(mappings) {
        for (const mapping of mappings) {
            this.pseudonymMappings.set(mapping.piiHash, mapping);
            // Update next ID counter
            const match = mapping.label.match(/(\d+)$/);
            if (match) {
                const id = parseInt(match[1], 10);
                const currentNext = this.nextIds.get(mapping.type) || 1;
                this.nextIds.set(mapping.type, Math.max(currentNext, id + 1));
            }
        }
    }
}
exports.PseudonymStrategy = PseudonymStrategy;
//# sourceMappingURL=pseudonym.js.map