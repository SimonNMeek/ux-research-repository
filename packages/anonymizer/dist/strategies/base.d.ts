import { Strategy, PIIMatch } from '../types';
export declare abstract class BaseStrategy implements Strategy {
    abstract name: string;
    abstract apply(match: PIIMatch, context: string): string;
    protected generateToken(type: string, strategy: string, value: string): string;
    protected maskValue(value: string): string;
    protected hashValue(value: string): string;
    protected generatePseudonym(type: string, value: string): string;
}
//# sourceMappingURL=base.d.ts.map