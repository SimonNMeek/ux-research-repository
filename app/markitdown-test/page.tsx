"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Download, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ConversionResult {
  success: boolean;
  markdown?: string;
  error?: string;
  originalFileName?: string;
  originalFileSize?: number;
  conversionTime?: number;
}

export default function MarkItDownTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/markitdown-test/convert', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Conversion failed');
      }

      setResult({
        success: true,
        markdown: data.markdown,
        originalFileName: file.name,
        originalFileSize: file.size,
        conversionTime: data.conversionTime,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Conversion failed',
        originalFileName: file.name,
        originalFileSize: file.size,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadMarkdown = () => {
    if (!result?.markdown) return;
    
    const blob = new Blob([result.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name?.split('.')[0] || 'converted'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(`${type} copied to clipboard!`);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopySuccess(`Failed to copy ${type.toLowerCase()}`);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            MarkItDown Test Page
          </h1>
          <p className="text-gray-600">
            Test Microsoft's MarkItDown utility for converting various file types to Markdown
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                File Upload
              </CardTitle>
              <CardDescription>
                Upload a file to test MarkItDown conversion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-input">Select File</Label>
                <Input
                  id="file-input"
                  type="file"
                  onChange={handleFileChange}
                  accept=".csv,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.md"
                  className="mt-1"
                />
              </div>

              {file && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">{file.name}</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    Size: {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              )}

              <Button 
                onClick={handleConvert} 
                disabled={!file || isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Converting...' : 'Convert to Markdown'}
              </Button>

              {error && (
                <div className="p-3 bg-red-50 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              {copySuccess && (
                <div className="p-3 bg-green-50 rounded-lg flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">{copySuccess}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result?.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : result?.error ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
                Conversion Result
              </CardTitle>
              <CardDescription>
                {result?.success ? 'Successfully converted to Markdown' : 'Conversion failed'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result && (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">
                      <div><strong>Original File:</strong> {result.originalFileName}</div>
                      <div><strong>File Size:</strong> {result.originalFileSize ? `${(result.originalFileSize / 1024).toFixed(1)} KB` : 'Unknown'}</div>
                      {result.conversionTime && (
                        <div><strong>Conversion Time:</strong> {result.conversionTime}ms</div>
                      )}
                    </div>
                  </div>

                  {/* Download and Copy Buttons */}
                  {result.success && result.markdown && (
                    <div className="flex gap-2">
                      <Button onClick={downloadMarkdown} className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download Markdown
                      </Button>
                      <Button 
                        onClick={() => copyToClipboard(result.markdown!, 'Raw Markdown')} 
                        variant="outline"
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Raw
                      </Button>
                    </div>
                  )}

                  {/* Markdown Preview */}
                  {result.success && result.markdown && (
                    <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Markdown Preview:</h4>
                        <Button 
                          onClick={() => copyToClipboard(result.markdown!, 'Preview')} 
                          variant="ghost"
                          size="sm"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Preview
                        </Button>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{result.markdown}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Raw Markdown */}
                  {result.success && result.markdown && (
                    <details className="border rounded-lg">
                      <summary className="p-3 cursor-pointer font-medium flex items-center justify-between">
                        View Raw Markdown
                        <Button 
                          onClick={(e) => {
                            e.preventDefault();
                            copyToClipboard(result.markdown!, 'Raw Markdown');
                          }} 
                          variant="ghost"
                          size="sm"
                          className="ml-2"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </summary>
                      <pre className="p-3 bg-gray-50 text-xs overflow-x-auto max-h-64">
                        {result.markdown}
                      </pre>
                    </details>
                  )}

                  {/* Error Display */}
                  {result.error && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-red-700 font-medium">Error:</div>
                      <div className="text-red-600 text-sm mt-1">{result.error}</div>
                    </div>
                  )}
                </div>
              )}

              {!result && (
                <div className="text-center text-gray-500 py-8">
                  Upload a file and click "Convert to Markdown" to see results
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Supported Formats Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Supported File Formats</CardTitle>
            <CardDescription>
              MarkItDown supports conversion from these formats to Markdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">Documents</div>
                <div className="text-gray-600">PDF, DOCX, DOC</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">Spreadsheets</div>
                <div className="text-gray-600">XLSX, XLS, CSV</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">Presentations</div>
                <div className="text-gray-600">PPTX, PPT</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">Text Files</div>
                <div className="text-gray-600">TXT, MD</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
