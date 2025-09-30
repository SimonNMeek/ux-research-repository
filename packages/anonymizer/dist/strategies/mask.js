"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaskStrategy = void 0;
const base_1 = require("./base");
class MaskStrategy extends base_1.BaseStrategy {
    constructor() {
        super(...arguments);
        this.name = 'mask';
    }
    apply(match, context) {
        return this.generateToken(match.type, 'MASK', match.value);
    }
}
exports.MaskStrategy = MaskStrategy;
//# sourceMappingURL=mask.js.map