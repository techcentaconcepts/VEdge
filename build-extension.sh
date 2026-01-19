#!/bin/bash
# Build script for Vantedge Extension

echo "Building Vantedge Extension..."

# Check if config.js has been updated
if grep -q "YOUR_SUPABASE_URL" extension/config.js; then
  echo "⚠️  WARNING: config.js still contains placeholder values!"
  echo "   Update SUPABASE_URL and SUPABASE_ANON_KEY before building."
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Create build directory
rm -rf extension-build
mkdir -p extension-build

# Copy extension files
cp -r extension/* extension-build/

# Remove development files
rm -f extension-build/README.md
rm -f extension-build/.DS_Store

# Create zip for Chrome Web Store
cd extension-build
zip -r ../vantedge-extension.zip .
cd ..

echo "✓ Extension built successfully!"
echo "  - Unpacked: extension-build/"
echo "  - Packaged: vantedge-extension.zip"
echo ""
echo "Next steps:"
echo "  1. Load unpacked in Chrome: chrome://extensions → Load unpacked → extension-build/"
echo "  2. Or upload to Chrome Web Store: vantedge-extension.zip"
