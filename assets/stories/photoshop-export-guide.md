# Photoshop Export Guide for Story Book Images

## Image Specifications for 2732x2048px Story Backgrounds

###  **Canvas Setup**
- **Dimensions**: 2732 × 2048 pixels
- **Resolution**: 72 DPI (for digital use)
- **Color Mode**: RGB Color
- **Bit Depth**: 8 Bits/Channel

###  **Design Guidelines**

#### Safe Areas for Responsive Design (Landscape Mode)
```
┌─────────────────────────────────────┐ ← Top 25% (512px)
│           Sky/Background            │   (May be cropped on phones)
│                                     │
├─────────────────────────────────────┤ ← 25% mark (512px from top)
│                                     │
│        Main Content Area            │ ← Bottom 75% (512-2048px)
│     (Always visible on all         │   (Safe area for all devices)
│         devices)                    │
│                                     │
│   Characters & Key Elements       │
│     should be in this area          │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

#### Content Placement Strategy (All Devices in Landscape)
1. **Top 25% (0-512px)**: Background elements, sky, distant objects
   - May be cropped on phones in landscape mode
   - Use for atmospheric elements only

2. **Bottom 75% (512-2048px)**: Main story conten
   - Always visible on all devices (tablets and phones in landscape)
   - Place characters, important props, and story elements here
   - This is the "safe zone" for all conten

###  **Device Cropping Preview**

#### Large Tablets (iPad Pro 12.9")
- **Display**: Full 2732x2048px image
- **Scaling**: Proportional scaling to fit screen
- **Crop**: None

#### Standard Tablets (iPad, Android tablets)
- **Display**: Slight crop from top (~10%)
- **Visible area**: ~2732x1840px
- **Crop**: Minimal top cropping

#### Phones (Landscape - Forced)
- **Display**: Bottom-focused crop
- **Visible area**: Bottom 75% of 2732x2048px (shows 2732x1536px equivalent)
- **Crop**: Top ~25% may be hidden
- **Strategy**: Shows bottom 75% of image where characters are placed
- **Layout**: Image on left 70% of screen, text/controls on right 30%

###  **WebP Export Settings**

#### Method 1: Photoshop WebP Plugin
1. **Install**: Download Google's WebP plugin for Photoshop
2. **Export Settings**:
   - Quality: 82-88% (adjust based on image complexity)
   - Method: 6 (best compression)
   - Target file size: 250-350KB

#### Method 2: Export as PNG then Conver
1. **Export PNG**: File → Export → Export As → PNG
2. **Convert to WebP**: Use online tool or command line
   ```bash
   cwebp -q 85 input.png -o output.webp
   ```

#### Method 3: Save for Web (Legacy)
1. **File → Export → Save for Web (Legacy)**
2. **Format**: PNG-24 (for conversion later)
3. **Quality**: Maximum
4. **Convert**: Use external WebP converter

###  **Export Checklist**

#### Before Export:
- [ ] Characters and key elements are in bottom 75% of canvas
- [ ] Important story elements avoid the bottom 20% (text overlay area)
- [ ] Background elements in top 25% are non-essential
- [ ] Image is 2732x2048px exactly
- [ ] All layers are flattened (except character layers if separate)

#### File Naming Convention:
- **Background**: `background.webp`
- **Character overlays**: `{character-name}.webp` (if separate)
- **Props**: `{prop-name}.webp` (if separate)

#### Quality Check:
- [ ] File size: 250-350KB for backgrounds
- [ ] Visual quality: No visible compression artifacts
- [ ] Transparency: Preserved for character/prop overlays
- [ ] Dimensions: Exactly 2732x2048px

###  **Optimization Tips**

#### For Complex Scenes:
- **Quality**: 85-88%
- **Expected size**: 300-400KB
- **Focus**: Preserve detail in character areas

#### For Simple Scenes:
- **Quality**: 80-85%
- **Expected size**: 200-300KB
- **Focus**: Maintain color gradients

#### For Character Overlays:
- **Format**: WebP lossless (if transparency needed)
- **Size**: 800x800px recommended
- **Quality**: 90-95% if using lossy
- **Expected size**: 50-150KB

###  **Batch Processing**

#### For Multiple Stories:
1. **Create Action**: Record export settings in Photoshop
2. **Batch Process**: File → Automate → Batch
3. **Naming**: Use consistent naming convention
4. **Organization**: Export directly to story directories

#### Recommended Workflow:
1. Design all pages for one story
2. Set up export action with optimal settings
3. Batch export all backgrounds
4. Export character overlays separately (if used)
5. Test one complete story before processing others

###  **Testing Your Exports**

#### Device Testing:
1. **Large tablet**: Check full image display
2. **Phone landscape**: Verify bottom-crop shows key conten
3. **Loading speed**: Ensure files load quickly
4. **Memory usage**: Monitor app performance with multiple images

#### Quality Verification:
- Zoom to 100% to check for compression artifacts
- Test on actual devices, not just simulators
- Verify colors match your design inten
- Check file sizes meet target ranges

This guide ensures your 2732x2048px images work perfectly across all devices while maintaining optimal file sizes and visual quality!
