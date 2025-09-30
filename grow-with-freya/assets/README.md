# Assets Directory Structure

This directory contains all the visual assets for the Grow with Freya app, organized for optimal performance and maintainability.

## Directory Structure

```
assets/
├── images/
│   ├── illustrations/          # Onboarding and story illustrations
│   ├── menu-icons/            # Navigation and menu icons
│   ├── characters/            # Character assets (avatars, mascots)
│   ├── backgrounds/           # Background elements and patterns
│   └── ui-elements/           # UI components and decorative elements
├── animations/                # Lottie animation files
├── audio/                     # Sound effects and music
└── fonts/                     # Custom typography
```

## Current Assets

### Illustrations (PNG - High Quality)
- `welcome-family.png` - Family reading together (Welcome screen)
- `screen-time-family.png` - Parent with children (Screen time screen)
- `tina-bruno-characters.png` - Two child avatars (Personalization screen)
- `research-backed.png` - Mother and child (Research screen)
- **Missing**: `voice-recording.png` - Voice recording illustration

### Menu Icons (SVG/PNG)
Ready for your custom icons:
- `stories.svg/png` - Stories/reading icon
- `sensory.svg/png` - Sensory activities icon
- `emotions.svg/png` - Emotions/feelings icon
- `bedtime-music.svg/png` - Bedtime music icon
- `screen-time.svg/png` - Screen time management icon
- `parents.svg/png` - Parent dashboard icon
- `settings.svg/png` - Settings/preferences icon

## Usage

### High-Quality PNG Illustrations
```tsx
import { PngIllustration } from '@/components/ui/png-illustration';

<PngIllustration 
  name="welcome-family" 
  maxWidth={400}
  maxHeight={300}
/>
```

### Custom Icons
```tsx
import { CustomIcon } from '@/components/ui/custom-icon';

<CustomIcon 
  name="stories" 
  size={40} 
  color="#4A90E2" 
/>
```

### Direct Asset Usage
```tsx
import { AssetIcon } from '@/components/ui/asset-icon';

<AssetIcon 
  source={require('@/assets/images/menu-icons/stories.png')} 
  size={32} 
/>
```

## Responsive Design

The `PngIllustration` component automatically handles:
- **Device scaling**: Adapts to phones, large phones, and tablets
- **High-DPI displays**: Optimized for Retina and high-density screens
- **Aspect ratio preservation**: Maintains original proportions
- **Quality optimization**: Uses appropriate rendering methods

### Responsive Breakpoints
- **Tablets** (≥768px): Larger illustrations (up to 450×350px)
- **Large phones** (≥414px): Medium illustrations (up to 340×260px)
- **Standard phones** (375-413px): Standard illustrations (up to 320×245px)
- **Small phones** (<375px): Compact illustrations (up to 300×230px)

## Adding New Assets

### 1. PNG Illustrations
1. Add your PNG file to `images/illustrations/`
2. Update the mapping in `components/ui/png-illustration.tsx`
3. Use descriptive names (e.g., `voice-recording.png`)

### 2. Custom Icons
1. Add SVG/PNG files to appropriate subdirectories
2. Update the mapping in `components/ui/custom-icon.tsx`
3. Use consistent naming conventions

### 3. Optimization Tips
- **PNG files**: Use high resolution (2x-3x) for crisp display
- **SVG files**: Preferred for icons and simple graphics, but keep under 500KB to avoid Babel limits
- **File sizes**: Optimize for mobile (aim for <500KB per file)
- **Naming**: Use kebab-case (e.g., `voice-recording.png`)

## Quality Standards

- **Illustrations**: Minimum 600×400px, optimized PNG
- **Icons**: SVG preferred, or PNG at 2x/3x resolution
- **Consistency**: Maintain visual style across all assets
- **Accessibility**: Ensure sufficient contrast and clarity

## Current Status

✅ **Complete**: Asset structure, responsive components, 4/5 illustrations
⏳ **Pending**: Voice recording illustration, custom menu icons
🔄 **Ready for**: Your custom icons and additional assets
