#!/bin/bash

# MarkItDown Installation Script
echo "Installing MarkItDown..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    echo "Please install Python 3 and try again."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "Error: pip3 is required but not installed."
    echo "Please install pip3 and try again."
    exit 1
fi

# Install MarkItDown
echo "Installing MarkItDown via pip..."
pip3 install markitdown

# Verify installation
if command -v markitdown &> /dev/null; then
    echo "✅ MarkItDown installed successfully!"
    echo "You can now test file conversions at http://localhost:3000/markitdown-test"
else
    echo "⚠️  MarkItDown installation completed, but the command may not be in PATH."
    echo "You may need to restart your terminal or add Python's bin directory to your PATH."
    echo "Try running: python3 -m markitdown --help"
fi

echo ""
echo "Supported file formats:"
echo "- Documents: PDF, DOCX, DOC"
echo "- Spreadsheets: XLSX, XLS, CSV"
echo "- Presentations: PPTX, PPT"
echo "- Text files: TXT, MD"
echo ""
echo "Test the conversion at: http://localhost:3000/markitdown-test"
