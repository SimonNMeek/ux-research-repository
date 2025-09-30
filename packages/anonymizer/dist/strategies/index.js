"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PseudonymStrategy = exports.HashStrategy = exports.MaskStrategy = exports.RedactStrategy = exports.BaseStrategy = void 0;
exports.createDefaultStrategies = createDefaultStrategies;
var base_1 = require("./base");
Object.defineProperty(exports, "BaseStrategy", { enumerable: true, get: function () { return base_1.BaseStrategy; } });
var redact_1 = require("./redact");
Object.defineProperty(exports, "RedactStrategy", { enumerable: true, get: function () { return redact_1.RedactStrategy; } });
var mask_1 = require("./mask");
Object.defineProperty(exports, "MaskStrategy", { enumerable: true, get: function () { return mask_1.MaskStrategy; } });
var hash_1 = require("./hash");
Object.defineProperty(exports, "HashStrategy", { enumerable: true, get: function () { return hash_1.HashStrategy; } });
var pseudonym_1 = require("./pseudonym");
Object.defineProperty(exports, "PseudonymStrategy", { enumerable: true, get: function () { return pseudonym_1.PseudonymStrategy; } });
const redact_2 = require("./redact");
const mask_2 = require("./mask");
const hash_2 = require("./hash");
const pseudonym_2 = require("./pseudonym");
function createDefaultStrategies(hmacKey, salt) {
    const strategies = new Map();
    strategies.set('REDACT', new redact_2.RedactStrategy());
    strategies.set('MASK', new mask_2.MaskStrategy());
    strategies.set('HASH', new hash_2.HashStrategy(hmacKey, salt));
    strategies.set('PSEUDONYM', new pseudonym_2.PseudonymStrategy(hmacKey, salt));
    return strategies;
}
//# sourceMappingURL=index.js.map