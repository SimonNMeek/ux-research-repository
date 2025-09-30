"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDetector = void 0;
class BaseDetector {
    createMatch(type, value, start, end, confidence = 1.0) {
        return {
            type,
            value,
            start,
            end,
            confidence,
            detector: this.name
        };
    }
    normalizeText(text) {
        return text.normalize('NFKC');
    }
    findWordBoundaries(text, start, end) {
        // Find word boundaries for better matching
        const beforeStart = Math.max(0, start - 1);
        const afterEnd = Math.min(text.length, end + 1);
        // Check if we're at word boundaries
        const isWordChar = (char) => /[\w\u00C0-\u017F]/.test(char);
        let newStart = start;
        let newEnd = end;
        // Extend start backwards if not at word boundary
        if (start > 0 && isWordChar(text[beforeStart])) {
            while (newStart > 0 && isWordChar(text[newStart - 1])) {
                newStart--;
            }
        }
        // Extend end forwards if not at word boundary
        if (end < text.length && isWordChar(text[afterEnd - 1])) {
            while (newEnd < text.length && isWordChar(text[newEnd])) {
                newEnd++;
            }
        }
        return { start: newStart, end: newEnd };
    }
}
exports.BaseDetector = BaseDetector;
//# sourceMappingURL=base.js.map