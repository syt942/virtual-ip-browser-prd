# Virtual IP Browser Icons

This directory contains application icons for all platforms.

## Required Icon Files

### Linux (.png files)
Linux requires PNG icons at multiple resolutions. Place icons in this directory with the following names:

| Size | Filename | Purpose |
|------|----------|---------|
| 16x16 | `16x16.png` | System tray, small contexts |
| 24x24 | `24x24.png` | Toolbars |
| 32x32 | `32x32.png` | Desktop shortcuts |
| 48x48 | `48x48.png` | File managers |
| 64x64 | `64x64.png` | Larger displays |
| 128x128 | `128x128.png` | High-DPI small |
| 256x256 | `256x256.png` | Application menus |
| 512x512 | `512x512.png` | High-DPI displays |
| 1024x1024 | `1024x1024.png` | Source/highest quality |

**Note**: electron-builder will automatically use these PNG files to generate the appropriate icon sizes for Linux packages.

### Windows (.ico file)
- `icon.ico` - Multi-resolution ICO file (should contain 16x16, 32x32, 48x48, 256x256)

### macOS (.icns file)
- `icon.icns` - Apple Icon Image format (should contain 16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024)

## Icon Design Guidelines

1. **Design**: Use a clear, recognizable design that represents privacy/security
2. **Background**: Use transparent background for all PNG files
3. **Format**: PNG-24 with alpha transparency
4. **Padding**: Leave ~10% padding around the icon edges
5. **Colors**: Use consistent colors across all sizes

## Generating Icons

### From a high-resolution source (1024x1024 or larger):

```bash
# Install ImageMagick if not present
sudo apt-get install imagemagick

# Generate all sizes from source
SOURCE="source/icon-1024.png"

for SIZE in 16 24 32 48 64 128 256 512 1024; do
    convert "$SOURCE" -resize ${SIZE}x${SIZE} "${SIZE}x${SIZE}.png"
done

# Alternatively, use the provided script
./scripts/generate-icons.sh
```

### For Windows ICO:

```bash
# Using ImageMagick
convert 16x16.png 32x32.png 48x48.png 256x256.png icon.ico
```

### For macOS ICNS:

```bash
# On macOS, use iconutil
mkdir icon.iconset
cp 16x16.png icon.iconset/icon_16x16.png
cp 32x32.png icon.iconset/icon_16x16@2x.png
cp 32x32.png icon.iconset/icon_32x32.png
cp 64x64.png icon.iconset/icon_32x32@2x.png
cp 128x128.png icon.iconset/icon_128x128.png
cp 256x256.png icon.iconset/icon_128x128@2x.png
cp 256x256.png icon.iconset/icon_256x256.png
cp 512x512.png icon.iconset/icon_256x256@2x.png
cp 512x512.png icon.iconset/icon_512x512.png
cp 1024x1024.png icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
```

## Placeholder Icon

If you need a placeholder icon for development, you can generate one:

```bash
# Create a simple colored square placeholder
convert -size 256x256 xc:"#3B82F6" \
    -fill white -gravity center \
    -pointsize 120 -annotate 0 "VIP" \
    256x256.png
```

## Current Status

### Linux Icons ✅
- [x] `16x16.png`
- [ ] `24x24.png` - *Optional, can be generated*
- [x] `32x32.png`
- [x] `48x48.png`
- [x] `64x64.png`
- [x] `128x128.png`
- [x] `256x256.png`
- [x] `512x512.png`
- [x] `icon.png` (256x256 default)

### Windows Icon
- [ ] `icon.ico` - *Needs to be generated for Windows builds*

### macOS Icon
- [ ] `icon.icns` - *Needs to be generated for macOS builds*

### Optional
- [ ] `1024x1024.png` (source for regeneration)
