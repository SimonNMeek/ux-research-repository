import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create temporary files
    const tempDir = tmpdir();
    const inputPath = join(tempDir, `input_${Date.now()}_${file.name}`);
    const outputPath = join(tempDir, `output_${Date.now()}.md`);
    
    try {
      // Write uploaded file to temp location
      const buffer = Buffer.from(await file.arrayBuffer());
      writeFileSync(inputPath, buffer);

      // Run MarkItDown conversion
      const markdown = await convertWithMarkItDown(inputPath, outputPath);
      
      const conversionTime = Date.now() - startTime;
      
      return NextResponse.json({
        success: true,
        markdown,
        conversionTime,
      });
      
    } finally {
      // Clean up temporary files
      try {
        unlinkSync(inputPath);
        unlinkSync(outputPath);
      } catch (cleanupError) {
        console.warn('Failed to clean up temp files:', cleanupError);
      }
    }
    
  } catch (error) {
    console.error('MarkItDown conversion error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Conversion failed',
        success: false 
      },
      { status: 500 }
    );
  }
}

async function convertWithMarkItDown(inputPath: string, outputPath: string): Promise<string> {
  // For now, MarkItDown package is incomplete (alpha version)
  // Skip MarkItDown and go directly to fallback conversion
  console.warn('MarkItDown package is incomplete, using fallback conversion');
  return tryFallbackConversion(inputPath);
}

async function tryFallbackConversion(inputPath: string): Promise<string> {
  // Fallback conversion for common file types
  const fileExtension = inputPath.split('.').pop()?.toLowerCase();
  
  switch (fileExtension) {
    case 'txt':
    case 'md':
      // For text files, just read them directly
      return readFileSync(inputPath, 'utf-8');
      
    case 'csv':
      // Basic CSV to Markdown table conversion
      return convertCsvToMarkdown(inputPath);
      
    default:
      throw new Error(`Unsupported file type: ${fileExtension}. MarkItDown package is currently incomplete. Supported types: CSV, TXT, MD`);
  }
}

function convertCsvToMarkdown(inputPath: string): string {
  const content = readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return 'Empty CSV file';
  }
  
  // Parse CSV (simple implementation)
  const rows = lines.map(line => {
    // Simple CSV parsing - handles basic cases
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  });
  
  if (rows.length === 0) {
    return 'No data found in CSV';
  }
  
  // Convert to Markdown table
  let markdown = '';
  
  // Header row
  markdown += '| ' + rows[0].join(' | ') + ' |\n';
  markdown += '| ' + rows[0].map(() => '---').join(' | ') + ' |\n';
  
  // Data rows
  for (let i = 1; i < rows.length; i++) {
    markdown += '| ' + rows[i].join(' | ') + ' |\n';
  }
  
  return markdown;
}
