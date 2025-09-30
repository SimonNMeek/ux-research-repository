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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLoader = exports.AnonymizationPipeline = void 0;
exports.anonymizeText = anonymizeText;
exports.anonymizeTextStreaming = anonymizeTextStreaming;
exports.createPipelineFromConfig = createPipelineFromConfig;
exports.createPipelineFromObject = createPipelineFromObject;
// Main exports
var anonymizer_1 = require("./pipeline/anonymizer");
Object.defineProperty(exports, "AnonymizationPipeline", { enumerable: true, get: function () { return anonymizer_1.AnonymizationPipeline; } });
var loader_1 = require("./config/loader");
Object.defineProperty(exports, "ConfigLoader", { enumerable: true, get: function () { return loader_1.ConfigLoader; } });
// Type exports
__exportStar(require("./types"), exports);
// Detector exports
__exportStar(require("./detectors"), exports);
// Strategy exports
__exportStar(require("./strategies"), exports);
// Main anonymization function
const anonymizer_2 = require("./pipeline/anonymizer");
const loader_2 = require("./config/loader");
async function anonymizeText(text, config) {
    const pipeline = new anonymizer_2.AnonymizationPipeline(config);
    return await pipeline.anonymizeText(text);
}
async function anonymizeTextStreaming(text, config, chunkSize = 10000) {
    const pipeline = new anonymizer_2.AnonymizationPipeline(config);
    return await pipeline.anonymizeTextStreaming(text, chunkSize);
}
// CLI support
function createPipelineFromConfig(configPath) {
    const config = loader_2.ConfigLoader.loadFromFile(configPath);
    return new anonymizer_2.AnonymizationPipeline(config);
}
function createPipelineFromObject(config) {
    return new anonymizer_2.AnonymizationPipeline(config);
}
//# sourceMappingURL=index.js.map