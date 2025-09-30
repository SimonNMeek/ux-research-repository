import { Detector, PIIMatch } from '../types';

export abstract class BaseDetector implements Detector {
  abstract name: string;
  abstract version: string;

  abstract detect(text: string): PIIMatch[];

  protected createMatch(
    type: string,
    value: string,
    start: number,
    end: number,
    confidence: number = 1.0
  ): PIIMatch {
    return {
      type,
      value,
      start,
      end,
      confidence,
      detector: this.name
    };
  }

  protected normalizeText(text: string): string {
    return text.normalize('NFKC');
  }

  protected findWordBoundaries(text: string, start: number, end: number): { start: number; end: number } {
    // Find word boundaries for better matching
    const beforeStart = Math.max(0, start - 1);
    const afterEnd = Math.min(text.length, end + 1);
    
    // Check if we're at word boundaries
    const isWordChar = (char: string) => /[\w\u00C0-\u017F]/.test(char);
    
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
