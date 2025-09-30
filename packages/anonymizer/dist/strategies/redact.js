"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedactStrategy = void 0;
const base_1 = require("./base");
class RedactStrategy extends base_1.BaseStrategy {
    constructor() {
        super(...arguments);
        this.name = 'redact';
    }
    apply(match, context) {
        return this.generateToken(match.type, 'REDACT', match.value);
    }
}
exports.RedactStrategy = RedactStrategy;
//# sourceMappingURL=redact.js.map