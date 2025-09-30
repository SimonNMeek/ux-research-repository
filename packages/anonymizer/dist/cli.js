#!/usr/bin/env node
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const anonymizer_1 = require("./pipeline/anonymizer");
const loader_1 = require("./config/loader");
function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {
        input: ''
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--input':
            case '-i':
                parsed.input = args[++i];
                break;
            case '--output':
            case '-o':
                parsed.output = args[++i];
                break;
            case '--profile':
            case '-p':
                parsed.profile = args[++i];
                break;
            case '--config':
            case '-c':
                parsed.config = args[++i];
                break;
            case '--chunk-size':
                parsed.chunkSize = parseInt(args[++i], 10);
                break;
            case '--streaming':
            case '-s':
                parsed.streaming = true;
                break;
            case '--verbose':
            case '-v':
                parsed.verbose = true;
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
                break;
            default:
                if (!parsed.input) {
                    parsed.input = arg;
                }
                break;
        }
    }
    return parsed;
}
function printHelp() {
    console.log(`
Usage: anonymize [options] <input-file>

Options:
  -i, --input <file>     Input file to anonymize
  -o, --output <file>    Output file (default: stdout)
  -p, --profile <file>   Anonymization profile (default: uk-default.json)
  -c, --config <file>    Custom config file
  --chunk-size <size>    Chunk size for streaming (default: 10000)
  -s, --streaming        Use streaming mode for large files
  -v, --verbose          Verbose output
  -h, --help             Show this help message

Examples:
  anonymize document.txt
  anonymize -i document.txt -o anonymized.txt -p uk-default.json
  anonymize -i large-file.txt -s --chunk-size 5000
`);
}
function loadConfig(profilePath, configPath) {
    if (configPath) {
        return loader_1.ConfigLoader.loadFromFile(configPath);
    }
    if (profilePath) {
        return loader_1.ConfigLoader.loadFromFile(profilePath);
    }
    // Try to find default profile
    const defaultProfile = path.join(__dirname, '..', 'profiles', 'uk-default.json');
    if (fs.existsSync(defaultProfile)) {
        return loader_1.ConfigLoader.loadFromFile(defaultProfile);
    }
    return loader_1.ConfigLoader.createDefaultConfig();
}
function formatResult(result, verbose = false) {
    let output = '';
    if (verbose) {
        output += `Anonymization completed in ${result.duration}ms\n`;
        output += `Total matches: ${result.summary.totalMatches}\n`;
        output += `By type: ${JSON.stringify(result.summary.byType, null, 2)}\n`;
        output += `By strategy: ${JSON.stringify(result.summary.byStrategy, null, 2)}\n`;
        output += '\n';
    }
    output += result.anonymizedText;
    return output;
}
async function main() {
    try {
        const args = parseArgs();
        if (!args.input) {
            console.error('Error: Input file is required');
            printHelp();
            process.exit(1);
        }
        if (!fs.existsSync(args.input)) {
            console.error(`Error: Input file '${args.input}' not found`);
            process.exit(1);
        }
        // Load configuration
        const config = loadConfig(args.profile, args.config);
        // Create pipeline
        const pipeline = new anonymizer_1.AnonymizationPipeline(config);
        // Read input file
        const inputText = fs.readFileSync(args.input, 'utf-8');
        // Anonymize
        let result;
        if (args.streaming || inputText.length > 50000) {
            result = await pipeline.anonymizeTextStreaming(inputText, args.chunkSize || 10000);
        }
        else {
            result = await pipeline.anonymizeText(inputText);
        }
        // Format output
        const output = formatResult(result, args.verbose);
        // Write output
        if (args.output) {
            fs.writeFileSync(args.output, output, 'utf-8');
            if (args.verbose) {
                console.log(`Output written to ${args.output}`);
            }
        }
        else {
            console.log(output);
        }
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
// Run CLI if this file is executed directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=cli.js.map