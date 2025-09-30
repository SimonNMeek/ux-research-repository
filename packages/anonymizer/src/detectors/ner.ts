import { BaseDetector } from './base';
import { PIIMatch } from '../types';

export class NERDetector extends BaseDetector {
  name = 'ner';
  version = '1.0.0';

  // Simple deterministic name patterns for basic NER
  private namePatterns = {
    // Common first names (UK/US)
    FIRST_NAMES: new Set([
      'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'charles', 'joseph', 'thomas',
      'christopher', 'daniel', 'paul', 'mark', 'donald', 'george', 'kenneth', 'steven', 'edward', 'brian',
      'ronald', 'anthony', 'kevin', 'jason', 'matthew', 'gary', 'timothy', 'jose', 'larry', 'jeffrey',
      'frank', 'scott', 'eric', 'stephen', 'andrew', 'raymond', 'gregory', 'joshua', 'jerry', 'dennis',
      'walter', 'patrick', 'peter', 'harold', 'douglas', 'henry', 'carl', 'arthur', 'ryan', 'roger',
      'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
      'nancy', 'lisa', 'betty', 'helen', 'sandra', 'donna', 'carol', 'ruth', 'sharon', 'michelle',
      'laura', 'sarah', 'kimberly', 'deborah', 'dorothy', 'lisa', 'nancy', 'karen', 'betty', 'helen',
      'sandra', 'donna', 'carol', 'ruth', 'sharon', 'michelle', 'laura', 'sarah', 'kimberly', 'deborah'
    ]),
    
    // Common last names (UK/US)
    LAST_NAMES: new Set([
      'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis', 'rodriguez', 'martinez',
      'hernandez', 'lopez', 'gonzalez', 'wilson', 'anderson', 'thomas', 'taylor', 'moore', 'jackson', 'martin',
      'lee', 'perez', 'thompson', 'white', 'harris', 'sanchez', 'clark', 'ramirez', 'lewis', 'robinson',
      'walker', 'young', 'allen', 'king', 'wright', 'scott', 'torres', 'nguyen', 'hill', 'flores',
      'green', 'adams', 'nelson', 'baker', 'hall', 'rivera', 'campbell', 'mitchell', 'carter', 'roberts',
      'gomez', 'phillips', 'evans', 'turner', 'diaz', 'parker', 'cruz', 'edwards', 'collins', 'reyes',
      'stewart', 'morris', 'morales', 'murphy', 'cook', 'rogers', 'gutierrez', 'ortiz', 'morgan', 'cooper'
    ])
  };

  detect(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const normalizedText = this.normalizeText(text);
    
    // Simple name detection using common patterns
    matches.push(...this.detectNames(normalizedText));
    
    return this.deduplicateMatches(matches);
  }

  private detectNames(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length - 1; i++) {
      const word1 = words[i].toLowerCase().replace(/[^\w]/g, '');
      const word2 = words[i + 1].toLowerCase().replace(/[^\w]/g, '');
      
      // Check for first name + last name pattern
      if (this.namePatterns.FIRST_NAMES.has(word1) && this.namePatterns.LAST_NAMES.has(word2)) {
        const start = text.indexOf(words[i]);
        const end = text.indexOf(words[i + 1]) + words[i + 1].length;
        const fullName = text.substring(start, end);
        
        matches.push(this.createMatch('PERSON', fullName, start, end, 0.7));
      }
      
      // Check for title + name pattern
      const titlePattern = /^(mr|mrs|ms|miss|dr|prof|sir|dame)\.?$/i;
      if (titlePattern.test(word1) && this.namePatterns.LAST_NAMES.has(word2)) {
        const start = text.indexOf(words[i]);
        const end = text.indexOf(words[i + 1]) + words[i + 1].length;
        const fullName = text.substring(start, end);
        
        matches.push(this.createMatch('PERSON', fullName, start, end, 0.8));
      }
    }
    
    return matches;
  }

  private deduplicateMatches(matches: PIIMatch[]): PIIMatch[] {
    // Remove overlapping matches, keeping the one with higher confidence
    const sorted = matches.sort((a, b) => a.start - b.start);
    const result: PIIMatch[] = [];
    
    for (const match of sorted) {
      const overlapping = result.find(existing => 
        (match.start < existing.end && match.end > existing.start)
      );
      
      if (!overlapping) {
        result.push(match);
      } else if (match.confidence > overlapping.confidence) {
        // Replace with higher confidence match
        const index = result.indexOf(overlapping);
        result[index] = match;
      }
    }
    
    return result;
  }
}

// Future: This could be extended to use spaCy, Hugging Face, or Presidio
export class AdvancedNERDetector extends NERDetector {
  name = 'advanced-ner';
  version = '1.0.0';

  // Placeholder for future ML-based NER implementation
  detect(text: string): PIIMatch[] {
    // For now, fall back to basic NER
    return super.detect(text);
  }
}
