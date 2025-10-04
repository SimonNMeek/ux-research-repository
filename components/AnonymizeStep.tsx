"use client";

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Settings, CheckCircle, AlertCircle } from 'lucide-react';

interface EntityConfig {
  enabled: boolean;
  strategy: 'REDACT' | 'MASK' | 'HASH' | 'PSEUDONYM';
  confidence?: number;
}

interface AnonymizationConfig {
  locale: string;
  entities: Record<string, EntityConfig>;
  dictionaryPaths?: string[];
}

interface PIIMatch {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

interface AnonymizationSummary {
  totalMatches: number;
  byType: Record<string, number>;
  byStrategy: Record<string, number>;
}

interface AnonymizeStepProps {
  files: File[];
  onConfigChange: (config: AnonymizationConfig | null) => void;
  onPreview: (text: string, config: AnonymizationConfig) => Promise<{
    anonymizedText: string;
    matches: PIIMatch[];
    summary: AnonymizationSummary;
  }>;
}

const DEFAULT_ENTITIES = {
  PERSON: { enabled: true, strategy: 'PSEUDONYM' as const, confidence: 0.85 },
  SINGLE_NAME: { enabled: true, strategy: 'PSEUDONYM' as const, confidence: 0.7 },
  ORG: { enabled: true, strategy: 'PSEUDONYM' as const },
  EMAIL: { enabled: true, strategy: 'MASK' as const },
  PHONE: { enabled: true, strategy: 'MASK' as const },
  CARD: { enabled: true, strategy: 'REDACT' as const },
  NI: { enabled: true, strategy: 'REDACT' as const },
  NHS: { enabled: true, strategy: 'REDACT' as const },
  POSTCODE: { enabled: true, strategy: 'HASH' as const },
  DOB: { enabled: true, strategy: 'REDACT' as const },
  ADDRESS: { enabled: false, strategy: 'REDACT' as const },
  URL: { enabled: true, strategy: 'REDACT' as const },
  IP: { enabled: true, strategy: 'REDACT' as const },
  PASSPORT: { enabled: true, strategy: 'REDACT' as const },
  IBAN: { enabled: true, strategy: 'REDACT' as const },
  SORT_CODE_UK: { enabled: true, strategy: 'REDACT' as const }
};

const ENTITY_LABELS: Record<string, string> = {
  PERSON: 'Person Names',
  SINGLE_NAME: 'Single Names',
  ORG: 'Organizations',
  EMAIL: 'Email Addresses',
  PHONE: 'Phone Numbers',
  CARD: 'Credit Cards',
  NI: 'National Insurance',
  NHS: 'NHS Numbers',
  POSTCODE: 'Postcodes',
  DOB: 'Dates of Birth',
  ADDRESS: 'Addresses',
  URL: 'URLs',
  IP: 'IP Addresses',
  PASSPORT: 'Passport Numbers',
  IBAN: 'IBAN Numbers',
  SORT_CODE_UK: 'Sort Codes'
};

const STRATEGY_LABELS: Record<string, string> = {
  REDACT: 'Redact',
  MASK: 'Mask',
  HASH: 'Hash',
  PSEUDONYM: 'Pseudonym'
};

export default function AnonymizeStep({ files, onConfigChange, onPreview }: AnonymizeStepProps) {
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<AnonymizationConfig>({
    locale: 'UK',
    entities: { ...DEFAULT_ENTITIES }
  });
  const [previewText, setPreviewText] = useState('');
  const [previewResult, setPreviewResult] = useState<{
    anonymizedText: string;
    matches: PIIMatch[];
    summary: AnonymizationSummary;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyToAll, setApplyToAll] = useState(true);

  // Update parent when config changes
  useEffect(() => {
    onConfigChange(enabled ? config : null);
  }, [enabled, config, onConfigChange]);

  // Generate preview text from first file
  useEffect(() => {
    if (files.length > 0) {
      const firstFile = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setPreviewText(text.substring(0, 1000)); // Limit preview to first 1000 chars
      };
      reader.readAsText(firstFile);
    } else {
      // Clear all state when files are empty (e.g., after upload)
      setPreviewText('');
      setShowPreview(false);
      setPreviewResult(null);
      setEnabled(false); // Close the anonymization panel
    }
  }, [files]);

  const handleEntityToggle = useCallback((entityType: string, enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      entities: {
        ...prev.entities,
        [entityType]: {
          ...prev.entities[entityType],
          enabled
        }
      }
    }));
  }, []);

  const handleStrategyChange = useCallback((entityType: string, strategy: string) => {
    setConfig(prev => ({
      ...prev,
      entities: {
        ...prev.entities,
        [entityType]: {
          ...prev.entities[entityType],
          strategy: strategy as any
        }
      }
    }));
  }, []);

  const handlePreview = useCallback(async () => {
    if (!previewText) return;
    
    setPreviewLoading(true);
    try {
      const result = await onPreview(previewText, config);
      setPreviewResult(result);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setPreviewLoading(false);
    }
  }, [previewText, config, onPreview]);

  const renderPreviewDiff = () => {
    if (!previewResult) return null;

    const { anonymizedText, matches } = previewResult;
    const original = previewText;
    
    // Ensure matches is an array
    const safeMatches = matches || [];
    
    // Simple diff highlighting
    const parts = [];
    let lastIndex = 0;
    
    for (const match of safeMatches) {
      // Add text before match
      if (match.start > lastIndex) {
        parts.push({
          text: original.substring(lastIndex, match.start),
          type: 'normal'
        });
      }
      
      // Add highlighted match
      parts.push({
        text: original.substring(match.start, match.end),
        type: 'match',
        matchType: match.type
      });
      
      lastIndex = match.end;
    }
    
    // Add remaining text
    if (lastIndex < original.length) {
      parts.push({
        text: original.substring(lastIndex),
        type: 'normal'
      });
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2 text-red-600 dark:text-red-400">Original</h4>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-gray-900 dark:text-gray-100">
              {parts.map((part, i) => (
                <span
                  key={i}
                  className={
                    part.type === 'match'
                      ? 'bg-yellow-200 dark:bg-yellow-800 px-1 rounded'
                      : ''
                  }
                  title={part.type === 'match' ? `Detected: ${part.matchType}` : ''}
                >
                  {part.text}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2 text-green-600 dark:text-green-400">Anonymized</h4>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-gray-900 dark:text-gray-100">
              {anonymizedText}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {previewResult.summary.byType && Object.entries(previewResult.summary.byType).map(([type, count]) => (
            <Badge key={type} variant="secondary">
              {ENTITY_LABELS[type] || type}: {count}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="anonymize"
          checked={enabled}
          onCheckedChange={setEnabled}
          className="border-gray-300 dark:border-gray-600"
        />
        <Label htmlFor="anonymize" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Anonymize on import
        </Label>
      </div>

      {enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Anonymization Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="entities" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entities">Entity Types</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="entities" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(config.entities).map(([entityType, entityConfig]) => (
                    <div key={entityType} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={entityConfig.enabled}
                          onCheckedChange={(checked) => handleEntityToggle(entityType, checked as boolean)}
                          className="border-gray-300 dark:border-gray-600"
                        />
                        <Label className="text-sm text-gray-900 dark:text-gray-100">
                          {ENTITY_LABELS[entityType] || entityType}
                        </Label>
                      </div>
                      
                      {entityConfig.enabled && (
                        <Select
                          value={entityConfig.strategy}
                          onValueChange={(value) => handleStrategyChange(entityType, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STRATEGY_LABELS).map(([strategy, label]) => (
                              <SelectItem key={strategy} value={strategy}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="preview" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Preview Anonymization</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Preview how the first file will be anonymized
                    </p>
                  </div>
                  <Button
                    onClick={handlePreview}
                    disabled={previewLoading || !previewText}
                    size="sm"
                  >
                    {previewLoading ? 'Processing...' : 'Generate Preview'}
                  </Button>
                </div>
                
                {previewResult && (
                  <div className="mt-4">
                    {renderPreviewDiff()}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="flex items-center space-x-2 pt-4 border-t">
              <Checkbox
                id="applyToAll"
                checked={applyToAll}
                onCheckedChange={setApplyToAll}
                className="border-gray-300 dark:border-gray-600"
              />
              <Label htmlFor="applyToAll" className="text-sm text-gray-900 dark:text-gray-100">
                Apply to all files in this batch
              </Label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
