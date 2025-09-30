#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { AnonymizationPipeline } from './pipeline/anonymizer';
import { ConfigLoader } from './config/loader';
import { AnonymizeResult } from './types';

interface CLIArgs {
  input: string;
  output?: string;
  profile?: string;
  config?: string;
  chunkSize?: number;
  streaming?: boolean;
  verbose?: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: CLIArgs = {
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

function printHelp(): void {
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

function loadConfig(profilePath?: string, configPath?: string) {
  if (configPath) {
    return ConfigLoader.loadFromFile(configPath);
  }
  
  if (profilePath) {
    return ConfigLoader.loadFromFile(profilePath);
  }
  
  // Try to find default profile
  const defaultProfile = path.join(__dirname, '..', 'profiles', 'uk-default.json');
  if (fs.existsSync(defaultProfile)) {
    return ConfigLoader.loadFromFile(defaultProfile);
  }
  
  return ConfigLoader.createDefaultConfig();
}

function formatResult(result: AnonymizeResult, verbose: boolean = false): string {
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

async function main(): Promise<void> {
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
    const pipeline = new AnonymizationPipeline(config);
    
    // Read input file
    const inputText = fs.readFileSync(args.input, 'utf-8');
    
    // Anonymize
    let result: AnonymizeResult;
    if (args.streaming || inputText.length > 50000) {
      result = await pipeline.anonymizeTextStreaming(
        inputText, 
        args.chunkSize || 10000
      );
    } else {
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
    } else {
      console.log(output);
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}
