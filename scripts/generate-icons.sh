#!/bin/bash
# Icon Generation Script for Virtual IP Browser
# Generates all required icon sizes from a high-resolution source image

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ICONS_DIR="$PROJECT_ROOT/resources/icons"
SOURCE_DIR="$ICONS_DIR/source"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "  Virtual IP Browser Icon Generator"
echo "========================================="
echo

# Check for ImageMagick
if ! command -v convert &> /dev/null; then
    echo -e "${RED}Error: ImageMagick is not installed.${NC}"
    echo "Install it with: sudo apt-get install imagemagick"
    exit 1
fi

# Find source image
SOURCE_IMAGE=""
for ext in png svg; do
    for name in icon-1024 icon-source icon source; do
        if [ -f "$SOURCE_DIR/$name.$ext" ]; then
            SOURCE_IMAGE="$SOURCE_DIR/$name.$ext"
            break 2
        fi
    done
done

if [ -z "$SOURCE_IMAGE" ]; then
    echo -e "${YELLOW}No source image found in $SOURCE_DIR${NC}"
    echo
    echo "Please provide a high-resolution source image (1024x1024 or larger)."
    echo "Expected locations:"
    echo "  - $SOURCE_DIR/icon-1024.png"
    echo "  - $SOURCE_DIR/icon-source.png"
    echo "  - $SOURCE_DIR/source.png"
    echo
    echo "Creating placeholder icons for development..."
    echo
    
    # Create placeholder icons
    mkdir -p "$ICONS_DIR"
    
    for SIZE in 16 24 32 48 64 128 256 512; do
        OUTPUT="$ICONS_DIR/${SIZE}x${SIZE}.png"
        if [ ! -f "$OUTPUT" ]; then
            # Create a simple blue square with "VIP" text
            convert -size ${SIZE}x${SIZE} xc:"#3B82F6" \
                -fill white -gravity center \
                -pointsize $((SIZE / 3)) -annotate 0 "VIP" \
                "$OUTPUT"
            echo -e "${GREEN}Created placeholder:${NC} ${SIZE}x${SIZE}.png"
        else
            echo -e "${YELLOW}Skipped (exists):${NC} ${SIZE}x${SIZE}.png"
        fi
    done
    
    echo
    echo -e "${YELLOW}Warning: Placeholder icons created for development only.${NC}"
    echo "Replace with proper icons before release."
    exit 0
fi

echo -e "${GREEN}Found source image:${NC} $SOURCE_IMAGE"
echo

# Create output directory
mkdir -p "$ICONS_DIR"

# Linux PNG icons
LINUX_SIZES=(16 24 32 48 64 128 256 512)

echo "Generating Linux PNG icons..."
for SIZE in "${LINUX_SIZES[@]}"; do
    OUTPUT="$ICONS_DIR/${SIZE}x${SIZE}.png"
    convert "$SOURCE_IMAGE" -resize ${SIZE}x${SIZE} -background none -gravity center -extent ${SIZE}x${SIZE} "$OUTPUT"
    echo -e "  ${GREEN}✓${NC} ${SIZE}x${SIZE}.png"
done

# Windows ICO
echo
echo "Generating Windows ICO..."
if command -v icotool &> /dev/null; then
    icotool -c -o "$ICONS_DIR/icon.ico" \
        "$ICONS_DIR/16x16.png" \
        "$ICONS_DIR/32x32.png" \
        "$ICONS_DIR/48x48.png" \
        "$ICONS_DIR/256x256.png"
    echo -e "  ${GREEN}✓${NC} icon.ico (using icotool)"
else
    convert "$ICONS_DIR/16x16.png" \
            "$ICONS_DIR/32x32.png" \
            "$ICONS_DIR/48x48.png" \
            "$ICONS_DIR/256x256.png" \
            "$ICONS_DIR/icon.ico"
    echo -e "  ${GREEN}✓${NC} icon.ico (using ImageMagick)"
fi

# macOS ICNS
echo
echo "Generating macOS ICNS..."
if command -v png2icns &> /dev/null; then
    png2icns "$ICONS_DIR/icon.icns" \
        "$ICONS_DIR/16x16.png" \
        "$ICONS_DIR/32x32.png" \
        "$ICONS_DIR/128x128.png" \
        "$ICONS_DIR/256x256.png" \
        "$ICONS_DIR/512x512.png"
    echo -e "  ${GREEN}✓${NC} icon.icns (using png2icns)"
elif [ "$(uname)" == "Darwin" ]; then
    # On macOS, use iconutil
    ICONSET="$ICONS_DIR/icon.iconset"
    mkdir -p "$ICONSET"
    cp "$ICONS_DIR/16x16.png" "$ICONSET/icon_16x16.png"
    cp "$ICONS_DIR/32x32.png" "$ICONSET/icon_16x16@2x.png"
    cp "$ICONS_DIR/32x32.png" "$ICONSET/icon_32x32.png"
    cp "$ICONS_DIR/64x64.png" "$ICONSET/icon_32x32@2x.png"
    cp "$ICONS_DIR/128x128.png" "$ICONSET/icon_128x128.png"
    cp "$ICONS_DIR/256x256.png" "$ICONSET/icon_128x128@2x.png"
    cp "$ICONS_DIR/256x256.png" "$ICONSET/icon_256x256.png"
    cp "$ICONS_DIR/512x512.png" "$ICONSET/icon_256x256@2x.png"
    cp "$ICONS_DIR/512x512.png" "$ICONSET/icon_512x512.png"
    iconutil -c icns "$ICONSET"
    rm -rf "$ICONSET"
    echo -e "  ${GREEN}✓${NC} icon.icns (using iconutil)"
else
    echo -e "  ${YELLOW}⚠${NC} icon.icns - Cannot generate on Linux without png2icns"
    echo "    Install with: sudo apt-get install icnsutils"
fi

echo
echo "========================================="
echo -e "${GREEN}Icon generation complete!${NC}"
echo "========================================="
echo
echo "Generated files in $ICONS_DIR:"
ls -la "$ICONS_DIR"/*.png "$ICONS_DIR"/*.ico "$ICONS_DIR"/*.icns 2>/dev/null || true
