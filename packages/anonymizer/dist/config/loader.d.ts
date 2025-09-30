import { AnonymizationConfig } from '../types';
export declare class ConfigLoader {
    static loadFromFile(filePath: string): AnonymizationConfig;
    static loadFromObject(config: any): AnonymizationConfig;
    static createDefaultConfig(): AnonymizationConfig;
    private static validateConfig;
}
//# sourceMappingURL=loader.d.ts.map