import { BaseStrategy } from './base';
import { PIIMatch } from '../types';

export class MaskStrategy extends BaseStrategy {
  name = 'mask';

  apply(match: PIIMatch, context: string): string {
    return this.generateToken(match.type, 'MASK', match.value);
  }
}
