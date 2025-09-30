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
exports.DictionaryDetector = void 0;
const base_1 = require("./base");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DictionaryDetector extends base_1.BaseDetector {
    constructor(dictionaryPaths = []) {
        super();
        this.name = 'dictionary';
        this.version = '1.0.0';
        this.dictionaries = new Map();
        this.loadedPaths = new Set();
        this.loadDictionaries(dictionaryPaths);
    }
    detect(text) {
        const matches = [];
        const normalizedText = this.normalizeText(text.toLowerCase());
        for (const [type, dictionary] of this.dictionaries) {
            for (const term of dictionary) {
                const normalizedTerm = term.toLowerCase();
                let index = 0;
                while ((index = normalizedText.indexOf(normalizedTerm, index)) !== -1) {
                    // Check word boundaries
                    const before = index > 0 ? normalizedText[index - 1] : ' ';
                    const after = index + normalizedTerm.length < normalizedText.length
                        ? normalizedText[index + normalizedTerm.length]
                        : ' ';
                    if (this.isWordBoundary(before) && this.isWordBoundary(after)) {
                        const originalValue = text.substring(index, index + normalizedTerm.length);
                        matches.push(this.createMatch(type, originalValue, index, index + normalizedTerm.length));
                    }
                    index += normalizedTerm.length;
                }
            }
        }
        return this.deduplicateMatches(matches);
    }
    loadDictionaries(paths) {
        for (const dictPath of paths) {
            if (this.loadedPaths.has(dictPath))
                continue;
            try {
                if (fs.existsSync(dictPath)) {
                    const content = fs.readFileSync(dictPath, 'utf-8');
                    const terms = content
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line && !line.startsWith('#')); // Skip empty lines and comments
                    // Determine type from filename or use default
                    const type = this.getTypeFromPath(dictPath);
                    if (!this.dictionaries.has(type)) {
                        this.dictionaries.set(type, new Set());
                    }
                    for (const term of terms) {
                        this.dictionaries.get(type).add(term);
                    }
                    this.loadedPaths.add(dictPath);
                }
            }
            catch (error) {
                console.warn(`Failed to load dictionary from ${dictPath}:`, error);
            }
        }
    }
    getTypeFromPath(filePath) {
        const filename = path.basename(filePath, path.extname(filePath));
        // Map common filenames to types
        const typeMap = {
            'clients': 'ORG',
            'staff': 'PERSON',
            'people': 'PERSON',
            'organizations': 'ORG',
            'companies': 'ORG',
            'products': 'PRODUCT',
            'codenames': 'CODEWORD'
        };
        return typeMap[filename.toLowerCase()] || 'CUSTOM';
    }
    isWordBoundary(char) {
        return !/[a-zA-Z0-9\u00C0-\u017F]/.test(char);
    }
    deduplicateMatches(matches) {
        // Remove overlapping matches, keeping the longer one
        const sorted = matches.sort((a, b) => a.start - b.start);
        const result = [];
        for (const match of sorted) {
            const overlapping = result.find(existing => (match.start < existing.end && match.end > existing.start));
            if (!overlapping) {
                result.push(match);
            }
            else if (match.end - match.start > overlapping.end - overlapping.start) {
                // Replace with longer match
                const index = result.indexOf(overlapping);
                result[index] = match;
            }
        }
        return result;
    }
    addTerm(type, term) {
        if (!this.dictionaries.has(type)) {
            this.dictionaries.set(type, new Set());
        }
        this.dictionaries.get(type).add(term);
    }
    removeTerm(type, term) {
        this.dictionaries.get(type)?.delete(term);
    }
    getTerms(type) {
        return Array.from(this.dictionaries.get(type) || []);
    }
    getTypes() {
        return Array.from(this.dictionaries.keys());
    }
}
exports.DictionaryDetector = DictionaryDetector;
//# sourceMappingURL=dictionary.js.map