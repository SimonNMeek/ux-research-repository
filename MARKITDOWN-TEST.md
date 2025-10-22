# MarkItDown Test Page

This is a test page for evaluating Microsoft's MarkItDown utility for converting various file types to Markdown.

## What is MarkItDown?

MarkItDown is a lightweight Python utility for converting various files to Markdown for use with LLMs and related text analysis pipelines. It focuses on preserving important document structure and content as Markdown (including: headings, lists, tables, links, etc.).

## Setup

1. **Install MarkItDown:**
   ```bash
   ./scripts/install-markitdown.sh
   ```
   
   Or manually:
   ```bash
   pip3 install markitdown
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Access the test page:**
   ```
   http://localhost:3000/markitdown-test
   ```

## Supported File Formats

- **Documents:** PDF, DOCX, DOC
- **Spreadsheets:** XLSX, XLS, CSV
- **Presentations:** PPTX, PPT
- **Text files:** TXT, MD

## How It Works

1. **Upload a file** using the file input
2. **Click "Convert to Markdown"** to process the file
3. **View the results** including:
   - Conversion success/failure
   - Processing time
   - Markdown preview
   - Raw markdown text
   - Download option

## Fallback Conversion

If MarkItDown is not installed, the system will attempt basic fallback conversions for:
- **TXT/MD files:** Direct text reading
- **CSV files:** Basic CSV to Markdown table conversion

## Testing Different File Types

### CSV Files
Test with various CSV structures:
- Simple data tables
- CSV with headers
- CSV with quoted fields
- Large CSV files

### PDF Files
Test with:
- Text-based PDFs
- PDFs with tables
- PDFs with images (may not convert well)
- Scanned PDFs (may not work)

### Office Documents
Test with:
- DOCX with formatting
- XLSX with multiple sheets
- PPTX with slides

## Integration Considerations

Based on the test results, consider:

1. **Quality of conversion** - How well does MarkItDown preserve structure?
2. **Performance** - How fast is the conversion?
3. **File size limits** - What's the practical limit?
4. **Error handling** - How to handle failed conversions?
5. **User experience** - Should conversion happen automatically or on-demand?

## Next Steps

After testing, decide whether to:
1. **Integrate MarkItDown** into the main app for file uploads
2. **Extend current file support** from just TXT/MD to include CSV, PDF, etc.
3. **Add conversion options** for users (convert on upload vs. keep original)
4. **Implement batch processing** for multiple files

## Current App File Support

The main app currently supports:
- **Kanban board:** CSV, MD files (for import)
- **Project documents:** TXT, MD files (for upload)

This test will help determine if we should expand support to more file types.
