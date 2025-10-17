# Story Assets Directory Structure

This directory contains all story book assets organized by story ID for easy CMS integration and local storage.

## Directory Structure

```
assets/stories/
├── README.md                           # This documentation
├── {story-id}/                         # Each story has its own directory
│   ├── cover/                          # Cover/thumbnail images
│   │   ├── thumbnail.webp              # Small thumbnail (400x300px)
│   │   └── cover-large.webp            # Large cover image (800x600px)
│   ├── characters/                     # Character images for overlays
│   │   ├── main-character.webp         # Primary character
│   │   ├── secondary-character.webp    # Secondary characters
│   │   └── character-{name}.webp       # Named character variants
│   ├── props/                          # Story props and objects
│   │   ├── prop-{name}.webp            # Individual props
│   │   └── interactive-{element}.webp  # Interactive elements
│   ├── page-1/                         # Page 1 assets
│   │   ├── background.webp             # Page background (1920x1080px)
│   │   ├── foreground.webp             # Optional foreground overlay
│   │   └── elements/                   # Page-specific elements
│   ├── page-2/                         # Page 2 assets
│   │   └── ...                         # Same structure as page-1
│   ├── ...                             # Pages 3-8
│   └── page-8/                         # Page 8 assets
│       └── ...                         # Same structure as page-1
└── {next-story-id}/                    # Next story directory
    └── ...                             # Same structure as above
```

## Naming Conventions

### Story IDs
- Use kebab-case: `snuggle-little-wombat`, `pirate-adventure`, `magic-rainbow`
- Match the story ID in your JSON data structure
- Keep names descriptive but concise

### File Naming
- **Backgrounds**: `background.webp` (consistent across all pages)
- **Characters**: `{character-name}.webp` (e.g., `wombat.webp`, `mama-wombat.webp`)
- **Props**: `{prop-name}.webp` (e.g., `blanket.webp`, `teddy-bear.webp`)
- **Covers**: `thumbnail.webp` for cards, `cover-large.webp` for full display

### Image Specifications
- **Backgrounds**: 2732x2048px (4:3 ratio), WebP lossy 80-85% quality
  - Designed for iPad Pro 12.9" max resolution
  - Phone landscape crops to bottom portion (2732x1536px equivalent)
  - Allows for responsive cropping across all device sizes
- **Characters**: 800x800px (square), WebP lossless or 90%+ quality with transparency
- **Props**: Variable size, WebP lossless with transparency
- **Thumbnails**: 400x300px (4:3 ratio), WebP lossy 75-80% quality
- **Large covers**: 800x600px (4:3 ratio), WebP lossy 85% quality

### Responsive Design Strategy
- **App navigation**: Portrait mode maintained throughout app
- **Story reader**: Automatic transition to landscape mode with smooth orientation change
- **Large tablets (iPad Pro)**: Full 2732x2048px image displayed (70% width), text panel (30% width)
- **Standard tablets**: Scaled down proportionally, same landscape layout
- **Phones**: Landscape mode, bottom-crop of 2732x2048px image, same layout
- **Important content**: Keep characters and key elements in the bottom 75% of the image for phone compatibility

## CMS Integration

This structure maps directly to your CMS JSON structure:

```json
{
  "id": "snuggle-little-wombat",
  "title": "Snuggle Little Wombat",
  "coverImage": "assets/stories/snuggle-little-wombat/cover/thumbnail.webp",
  "pages": [
    {
      "id": "snuggle-little-wombat-1",
      "pageNumber": 1,
      "backgroundImage": "assets/stories/snuggle-little-wombat/page-1/background.webp",
      "characterImage": "assets/stories/snuggle-little-wombat/characters/wombat.webp",
      "text": "Little wombat was getting ready for bed..."
    }
  ]
}
```

## File Size Guidelines

- **Total story size**: Aim for <8MB per complete story (due to larger background images)
- **Background images**: 200-400KB each (2732x2048px WebP)
- **Character images**: 30-100KB each
- **Props**: 10-50KB each
- **Thumbnails**: 15-40KB each

## WebP Conversion Settings for 2732x2048px Images

### Recommended Settings:
- **Quality**: 82-88% (balance between size and quality)
- **Method**: 6 (highest compression efficiency)
- **Target file size**: 250-350KB per background image
- **Lossless**: Only for images requiring perfect transparency

## Development Workflow

1. **Local Development**: Place WebP files in appropriate directories
2. **CMS Upload**: Upload entire story directory to CMS
3. **JSON Generation**: CMS generates story JSON with correct asset paths
4. **App Download**: App downloads story JSON + assets as needed
