import { BaseDetector } from './base';
import { PIIMatch } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class DictionaryDetector extends BaseDetector {
  name = 'dictionary';
  version = '1.0.0';
  
  private dictionaries: Map<string, Set<string>> = new Map();
  private loadedPaths: Set<string> = new Set();

  constructor(dictionaryPaths: string[] = []) {
    super();
    this.loadDictionaries(dictionaryPaths);
  }

  detect(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
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

  private loadDictionaries(paths: string[]): void {
    for (const dictPath of paths) {
      if (this.loadedPaths.has(dictPath)) continue;
      
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
            this.dictionaries.get(type)!.add(term);
          }
          
          this.loadedPaths.add(dictPath);
        }
      } catch (error) {
        console.warn(`Failed to load dictionary from ${dictPath}:`, error);
      }
    }
  }

  private getTypeFromPath(filePath: string): string {
    const filename = path.basename(filePath, path.extname(filePath));
    
    // Map common filenames to types
    const typeMap: Record<string, string> = {
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

  private isWordBoundary(char: string): boolean {
    return !/[a-zA-Z0-9\u00C0-\u017F]/.test(char);
  }

  private deduplicateMatches(matches: PIIMatch[]): PIIMatch[] {
    // Remove overlapping matches, keeping the longer one
    const sorted = matches.sort((a, b) => a.start - b.start);
    const result: PIIMatch[] = [];
    
    for (const match of sorted) {
      const overlapping = result.find(existing => 
        (match.start < existing.end && match.end > existing.start)
      );
      
      if (!overlapping) {
        result.push(match);
      } else if (match.end - match.start > overlapping.end - overlapping.start) {
        // Replace with longer match
        const index = result.indexOf(overlapping);
        result[index] = match;
      }
    }
    
    return result;
  }

  addTerm(type: string, term: string): void {
    if (!this.dictionaries.has(type)) {
      this.dictionaries.set(type, new Set());
    }
    this.dictionaries.get(type)!.add(term);
  }

  removeTerm(type: string, term: string): void {
    this.dictionaries.get(type)?.delete(term);
  }

  getTerms(type: string): string[] {
    return Array.from(this.dictionaries.get(type) || []);
  }

  getTypes(): string[] {
    return Array.from(this.dictionaries.keys());
  }
}
