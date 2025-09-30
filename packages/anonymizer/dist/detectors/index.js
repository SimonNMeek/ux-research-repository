"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedNERDetector = exports.NERDetector = exports.DictionaryDetector = exports.RegexDetector = exports.BaseDetector = void 0;
exports.createDefaultDetectors = createDefaultDetectors;
var base_1 = require("./base");
Object.defineProperty(exports, "BaseDetector", { enumerable: true, get: function () { return base_1.BaseDetector; } });
var regex_1 = require("./regex");
Object.defineProperty(exports, "RegexDetector", { enumerable: true, get: function () { return regex_1.RegexDetector; } });
var dictionary_1 = require("./dictionary");
Object.defineProperty(exports, "DictionaryDetector", { enumerable: true, get: function () { return dictionary_1.DictionaryDetector; } });
var ner_1 = require("./ner");
Object.defineProperty(exports, "NERDetector", { enumerable: true, get: function () { return ner_1.NERDetector; } });
Object.defineProperty(exports, "AdvancedNERDetector", { enumerable: true, get: function () { return ner_1.AdvancedNERDetector; } });
const regex_2 = require("./regex");
const dictionary_2 = require("./dictionary");
const ner_2 = require("./ner");
function createDefaultDetectors(dictionaryPaths = []) {
    return [
        new regex_2.RegexDetector(),
        new dictionary_2.DictionaryDetector(dictionaryPaths),
        new ner_2.NERDetector()
    ];
}
//# sourceMappingURL=index.js.map