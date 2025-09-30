export { BaseDetector } from './base';
export { RegexDetector } from './regex';
export { DictionaryDetector } from './dictionary';
export { NERDetector, AdvancedNERDetector } from './ner';

import { Detector } from '../types';
import { RegexDetector } from './regex';
import { DictionaryDetector } from './dictionary';
import { NERDetector } from './ner';

export function createDefaultDetectors(dictionaryPaths: string[] = []): Detector[] {
  return [
    new RegexDetector(),
    new DictionaryDetector(dictionaryPaths),
    new NERDetector()
  ];
}
