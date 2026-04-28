"""
Storyboard Creator - Generation Presets

Pre-configured art styles based on popular children's book illustration styles.
Each preset is designed to produce a distinct, recognizable visual aesthetic.

All presets are optimized for SD 3.5 Medium:
- Steps: 30-40 (35 recommended)
- CFG: 5.0-6.0 (5.5 recommended)
- Sampler: euler
- Scheduler: sgm_uniform
"""
from .models import GenerationPreset

# ============================================================
# SD 3.5 MEDIUM OPTIMIZED DEFAULTS
# ============================================================
# Base settings that work best across all styles
SD35_STEPS = 35  # Sweet spot for SD 3.5 Medium
SD35_CFG = 5.5   # Optimal CFG for this model

# ============================================================
# POPULAR CHILDREN'S BOOK ART STYLES
# ============================================================

PRESETS = {
    # --------------------------------------------------------
    # BLUEY-STYLE: Modern Australian Flat Animation
    # Like: Bluey, Peppa Pig, Hey Duggee
    # --------------------------------------------------------
    "bluey-cartoon": GenerationPreset(
        name="Bluey Cartoon",
        art_style="flat 2D Australian cartoon animation",
        reference_prompt="""MEDIUM: flat digital vector illustration, clean 2D animation style, no perspective distortion
LINE WORK: bold colored outlines (NOT black - use darker shade of fill color), uniform 3-4px stroke weight, smooth bezier curves
COLOR PALETTE: warm vibrant pastels (sky blue, coral pink, sunshine yellow, mint green, warm orange), Australian summer colors
SHADING: completely flat fills, NO gradients, NO shadows, solid color blocks only
CHARACTERS: soft rounded shapes, simple dot eyes with white highlights, minimalist facial features, blue heeler dog family style
BACKGROUNDS: simple Australian suburban homes, backyard settings, blue sky, green grass, minimal detail
LIGHTING: bright flat daylight, no shadows, cheerful atmosphere
COMPOSITION: character-focused, lots of negative space, clean uncluttered layouts, TV animation framing""",
        negative_prompt="""realistic, photorealistic, 3d render, gradients, shading, shadows, complex backgrounds, dark, scary, detailed, anime, painterly, textured, black outlines""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # CLASSIC OIL PAINTING: Traditional European Storybook
    # Like: Classic Grimm's fairytales, Golden Age illustration
    # --------------------------------------------------------
    "classic-oil-painting": GenerationPreset(
        name="Classic Oil Painting",
        art_style="traditional European oil painting illustration",
        reference_prompt="""MEDIUM: traditional oil painting on canvas, visible impasto brushstrokes, rich paint texture
LINE WORK: no outlines, forms defined by color and light, soft blended edges
COLOR PALETTE: rich old master tones (burnt sienna, prussian blue, cadmium yellow, alizarin crimson), warm earth colors, jewel tones
SHADING: classical chiaroscuro, rich value gradients, volumetric form modeling, glazing technique
CHARACTERS: realistic proportions with storybook charm, expressive faces, period costume details, fairy tale elegance
BACKGROUNDS: detailed European landscapes, castle interiors, enchanted forests, dramatic skies, romantic atmosphere
LIGHTING: dramatic Rembrandt lighting, warm candlelight, golden hour sunsets, atmospheric depth
COMPOSITION: classical golden ratio, Renaissance framing, narrative storytelling, rich environmental detail""",
        negative_prompt="""flat, cartoon, anime, 3d render, digital, modern, minimalist, harsh, scary violence, text, watermark""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # WATERCOLOR STORYBOOK: Beatrix Potter / Peter Rabbit
    # Like: Peter Rabbit, Winnie the Pooh (E.H. Shepard)
    # --------------------------------------------------------
    "watercolor-storybook": GenerationPreset(
        name="Watercolor Storybook",
        art_style="classic British watercolor illustration",
        reference_prompt="""MEDIUM: traditional watercolor on textured paper, delicate wet-on-wet washes, visible paper grain
LINE WORK: fine pen and ink outlines, loose sketchy hatching, hand-drawn charm, sepia or brown ink
COLOR PALETTE: soft muted English countryside tones (sage green, warm brown, cream, dusty pink, sky blue), natural colors
SHADING: transparent watercolor glazes, soft gradients, luminous paper showing through, gentle tonal washes
CHARACTERS: anthropomorphic woodland animals in Victorian clothing, realistic animal anatomy with human expressions, cozy dressed characters
BACKGROUNDS: English countryside, cottage gardens, woodland paths, cozy interiors, wildflower meadows
LIGHTING: soft diffused daylight, dappled forest light, warm afternoon glow, gentle atmosphere
COMPOSITION: intimate vignettes, botanical framing, white space borders, nostalgic storybook quality""",
        negative_prompt="""harsh colors, digital, flat, modern, 3d, anime, scary, dark, violent, photorealistic, bold outlines""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # MODERN 3D DIGITAL: Pixar/Disney Inspired
    # Like: Toy Story, Frozen, modern animated films
    # --------------------------------------------------------
    "modern-3d-digital": GenerationPreset(
        name="Modern 3D Digital",
        art_style="Pixar-style 3D CGI animation",
        reference_prompt="""MEDIUM: high-quality 3D CGI rendering, smooth plastic-like surfaces, subsurface scattering on skin
LINE WORK: no outlines, form defined by lighting and shading, soft ambient occlusion edges
COLOR PALETTE: vibrant saturated colors, warm skin tones, appealing color harmony, cinematic color grading
SHADING: soft gradient shading, global illumination, rim lighting, glossy highlights, realistic light bounce
CHARACTERS: appealing 3D proportions, large expressive eyes, smooth rounded features, Pixar-style charm
BACKGROUNDS: detailed 3D environments, depth of field blur, atmospheric perspective, cinematic sets
LIGHTING: professional three-point lighting, dramatic key light, soft fill, magical rim lighting
COMPOSITION: cinematic framing, rule of thirds, dynamic camera angles, blockbuster quality""",
        negative_prompt="""2D, flat, hand-drawn, sketchy, anime, scary, dark horror, photorealistic human, uncanny valley, text, watermark""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # BOLD GRAPHIC: Mo Willems / Elephant & Piggie
    # Like: Pigeon books, Elephant & Piggie, simple expressive
    # --------------------------------------------------------
    "bold-graphic": GenerationPreset(
        name="Bold Graphic",
        art_style="simple expressive cartoon illustration",
        reference_prompt="""MEDIUM: clean digital illustration, marker-like quality, intentionally simple
LINE WORK: bold expressive black outlines (6-8px), hand-drawn wobbly quality, energetic strokes, varied line weight
COLOR PALETTE: limited bold palette (3-4 colors per scene), flat bright colors, white backgrounds, primary accents
SHADING: completely flat, NO gradients, NO shadows, solid fills only
CHARACTERS: extremely simple shapes, huge expressive eyes, minimal features, exaggerated emotions, stick-figure arms
BACKGROUNDS: minimal to none, simple ground line or white space, speech bubbles, exclamation marks
LIGHTING: none - completely flat, graphic novel style
COMPOSITION: character emotions front and center, lots of white space, comic strip clarity, maximum expression""",
        negative_prompt="""detailed, realistic, 3d, shading, gradients, complex backgrounds, scary, photorealistic, painterly, textured""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # COLLAGE ART: Eric Carle / Very Hungry Caterpillar
    # Like: The Very Hungry Caterpillar, tissue paper collage
    # --------------------------------------------------------
    "collage-art": GenerationPreset(
        name="Collage Art",
        art_style="painted tissue paper collage illustration",
        reference_prompt="""MEDIUM: hand-painted tissue paper collage, torn paper edges visible, layered flat shapes, acrylic paint texture
LINE WORK: no outlines - shapes defined by paper edges and color contrast, organic torn edges
COLOR PALETTE: bold saturated primaries (cadmium red, cobalt blue, lemon yellow), plus bright greens and oranges, kraft paper browns
SHADING: none - flat layered papers, texture from paint strokes and paper grain, visible brush marks on paper
CHARACTERS: simple iconic shapes, friendly animals and insects (caterpillars, butterflies, ladybugs), googly eyes, simple features
BACKGROUNDS: layered paper sky, bold sun/moon shapes, simple grass and trees, visible paper texture everywhere
LIGHTING: flat - no shadows, bold graphic impact, collage aesthetic
COMPOSITION: bold simple compositions, central subjects, educational counting themes, paper craft appearance""",
        negative_prompt="""smooth, digital, gradients, photorealistic, 3d, detailed, scary, dark, clean edges, vector, anime""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # SOFT PASTEL: Guess How Much I Love You
    # Like: Guess How Much I Love You, gentle bedtime stories
    # --------------------------------------------------------
    "soft-pastel": GenerationPreset(
        name="Soft Pastel",
        art_style="gentle pastel pencil illustration",
        reference_prompt="""MEDIUM: soft colored pencil and pastel on textured paper, gentle blending, dreamy quality
LINE WORK: soft sketchy outlines, gentle graphite or brown pencil, loose and warm
COLOR PALETTE: extremely soft muted pastels (dusty pink, pale blue, cream, soft lavender, warm beige), low saturation
SHADING: soft gradual blending, gentle tonal transitions, no harsh contrasts, dreamy atmosphere
CHARACTERS: soft fuzzy animals (rabbits, bears, deer), gentle expressions, warm and cuddly, parent-child pairs
BACKGROUNDS: soft meadows, moonlit fields, gentle rolling hills, starry skies, cozy beds
LIGHTING: soft golden hour, gentle moonlight, warm diffused glow, peaceful atmosphere
COMPOSITION: intimate emotional moments, parent and child scenes, bedtime quality, tender and warm""",
        negative_prompt="""harsh colors, bright saturated, action, scary, dark, photorealistic, digital, sharp, bold, high contrast""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # WHIMSICAL LINE ART: Dr. Seuss / Quentin Blake
    # Like: Dr. Seuss, Roald Dahl illustrations, quirky
    # --------------------------------------------------------
    "whimsical-line": GenerationPreset(
        name="Whimsical Line Art",
        art_style="quirky ink and watercolor illustration",
        reference_prompt="""MEDIUM: loose pen and ink with watercolor washes, scratchy energetic lines, playful sketchy quality
LINE WORK: energetic scratchy ink lines, cross-hatching, wobbly intentional imperfection, expressive movement
COLOR PALETTE: bright watercolor washes (red, blue, yellow, green), white space between colors, splashy and loose
SHADING: loose watercolor washes, not filling outlines perfectly, white space showing through
CHARACTERS: exaggerated lanky proportions, wild hair, big noses, googly eyes, impossible poses, zany expressions
BACKGROUNDS: fantastical impossible architecture, swirly patterns, surreal landscapes, visual wordplay
LIGHTING: minimal, line-work focused, watercolor accents
COMPOSITION: dynamic wonky angles, characters bursting out of frames, energetic chaos, visual humor""",
        negative_prompt="""realistic, clean, neat, photorealistic, 3d, symmetrical, dark horror, serious, digital smooth""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # ANIME CUTE: Ghibli-inspired
    # Like: My Neighbor Totoro, Ponyo, gentle anime
    # --------------------------------------------------------
    "anime-cute": GenerationPreset(
        name="Anime Cute",
        art_style="Studio Ghibli-inspired gentle anime",
        reference_prompt="""MEDIUM: clean cel animation style, soft digital painting, anime illustration
LINE WORK: clean thin black outlines, consistent line weight, smooth curves, anime style
COLOR PALETTE: soft warm colors, pastel accents, natural greens and blues, sunset oranges, sky gradients
SHADING: soft cel shading, gentle gradients, warm highlights, cool shadows
CHARACTERS: large expressive anime eyes, round faces, cute proportions, expressive poses, detailed hair
BACKGROUNDS: lush painted landscapes, fluffy clouds, detailed nature, magical forests, cozy interiors
LIGHTING: magical golden hour, soft diffused light, sparkles and particles, atmospheric
COMPOSITION: cinematic anime framing, environmental storytelling, peaceful scenes""",
        negative_prompt="""western cartoon, 3d, photorealistic, dark, scary, violent, chibi, super deformed""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # PEPPA PIG STYLE: Simple flat shapes
    # Like: Peppa Pig, Ben & Holly, simple preschool
    # --------------------------------------------------------
    "peppa-simple": GenerationPreset(
        name="Peppa Simple",
        art_style="simple flat preschool cartoon",
        reference_prompt="""MEDIUM: extremely simple flat vector illustration, preschool TV animation style
LINE WORK: thin black outlines, simple shapes only, basic geometric forms
COLOR PALETTE: bright primary colors (red, blue, yellow, green), flat solid fills, white backgrounds
SHADING: absolutely NO shading, completely flat colors, no gradients whatsoever
CHARACTERS: extremely simple shapes, circle/oval heads, dot eyes, simple smile lines, stick limbs
BACKGROUNDS: simple hills, basic houses, single trees, minimal detail, lots of empty space
LIGHTING: none - completely flat
COMPOSITION: centered subjects, lots of white/sky space, preschool simplicity, 2-3 elements max""",
        negative_prompt="""detailed, complex, realistic, 3d, shading, gradients, textures, scary, anime, painterly""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # ADVENTURE TIME: Quirky cartoon network style
    # Like: Adventure Time, Steven Universe, modern cartoon
    # --------------------------------------------------------
    "adventure-cartoon": GenerationPreset(
        name="Adventure Cartoon",
        art_style="quirky modern cartoon network style",
        reference_prompt="""MEDIUM: clean digital cartoon, bold flat colors, modern TV animation
LINE WORK: thick black outlines (4-6px), smooth clean lines, consistent weight, cartoonish
COLOR PALETTE: candy bright colors, unexpected color choices, pastels mixed with bold, adventurous palette
SHADING: minimal flat shading, simple ambient occlusion, mostly flat fills
CHARACTERS: stretchy noodle arms, simple expressive faces, bean-shaped bodies, exaggerated emotions
BACKGROUNDS: fantastical landscapes, candy kingdoms, strange architecture, whimsical worlds
LIGHTING: flat bright lighting, magical glows, simple highlights
COMPOSITION: dynamic poses, action-oriented, expressive character acting, visual gags""",
        negative_prompt="""realistic, photorealistic, 3d render, anime, detailed, dark, scary, painterly""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # CRAYON KIDS: Child-like crayon drawing
    # Like: Harold and the Purple Crayon, kids drawings
    # --------------------------------------------------------
    "crayon-kids": GenerationPreset(
        name="Crayon Kids",
        art_style="child-like crayon and marker drawing",
        reference_prompt="""MEDIUM: crayon and marker on paper, child's drawing style, rough coloring
LINE WORK: wobbly crayon lines, uneven pressure, going outside the lines, childlike quality
COLOR PALETTE: bright crayon colors, primary colors, uneven fills, white paper showing through
SHADING: none - flat uneven crayon fills, scribble texture, waxy appearance
CHARACTERS: stick figures, simple faces, oversized heads, uneven proportions, childlike charm
BACKGROUNDS: simple suns with rays, lollipop trees, box houses, rainbow arches, clouds
LIGHTING: none - flat crayon coloring
COMPOSITION: centered subjects, sky at top, ground at bottom, child's perspective""",
        negative_prompt="""professional, detailed, realistic, 3d, anime, clean lines, perfect, symmetrical""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # RETRO DISNEY: Classic golden age animation
    # Like: Snow White, Bambi, classic Disney
    # --------------------------------------------------------
    "retro-disney": GenerationPreset(
        name="Retro Disney",
        art_style="classic 1940s Disney animation",
        reference_prompt="""MEDIUM: traditional cel animation, hand-painted backgrounds, golden age Disney
LINE WORK: clean flowing ink lines, masterful draftsmanship, elegant curves
COLOR PALETTE: rich technicolor palette, saturated jewel tones, warm and cool contrast
SHADING: soft airbrush shading, gentle gradients, volumetric forms, glossy highlights
CHARACTERS: classic Disney proportions, large expressive eyes, elegant poses, flowing animation
BACKGROUNDS: lush painted forests, fairy tale castles, romantic landscapes, atmospheric depth
LIGHTING: dramatic theatrical lighting, rim lights, magical glows, fairy tale atmosphere
COMPOSITION: elegant framing, flowing lines, narrative clarity, storybook romance""",
        negative_prompt="""modern, 3d CGI, anime, flat, minimalist, scary, photorealistic, rough""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # ANIME ADVENTURE: Action anime style
    # Like: Pokemon, Digimon, shonen adventure
    # --------------------------------------------------------
    "anime-adventure": GenerationPreset(
        name="Anime Adventure",
        art_style="action adventure anime style",
        reference_prompt="""MEDIUM: Japanese TV anime, clean digital coloring, action animation
LINE WORK: bold black outlines, dynamic line weight, speed lines, action poses
COLOR PALETTE: vibrant saturated colors, bold contrasts, energy effects (blue, orange, green)
SHADING: anime cel shading, sharp shadows, dramatic highlights, rim lighting effects
CHARACTERS: dynamic anime proportions, determined expressions, action poses, spiky hair, heroic
BACKGROUNDS: epic landscapes, adventure locations, dramatic skies, battle arenas
LIGHTING: dramatic action lighting, energy glows, lens flares, impact effects
COMPOSITION: dynamic angles, action framing, impact shots, heroic poses""",
        negative_prompt="""western cartoon, 3d, photorealistic, realistic, dark horror, gore, minimalist""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # KAWAII CHIBI: Super cute chibi style
    # Like: Sanrio, cute mascot characters
    # --------------------------------------------------------
    "kawaii-chibi": GenerationPreset(
        name="Kawaii Chibi",
        art_style="super cute chibi kawaii style",
        reference_prompt="""MEDIUM: clean kawaii digital illustration, cute mascot style, Sanrio-like
LINE WORK: thin clean outlines, soft rounded curves, no sharp angles
COLOR PALETTE: soft pastels (pink, mint, lavender, peach), candy colors, sparkles
SHADING: minimal soft shading, blush marks, cute highlights, sparkle effects
CHARACTERS: chibi proportions (2-3 heads tall), huge sparkly eyes, tiny mouth, blushing cheeks, round everything
BACKGROUNDS: pastel clouds, hearts, stars, rainbows, cute patterns, sparkle effects
LIGHTING: soft flat lighting, kawaii glow, everything cute and cheerful
COMPOSITION: centered cute characters, decorative borders, sticker-like quality""",
        negative_prompt="""realistic, scary, dark, mature, detailed anatomy, western cartoon, complex, serious""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # RETRO COMIC: Vintage comic book style
    # Like: Classic Archie comics, vintage cartoons
    # --------------------------------------------------------
    "retro-comic": GenerationPreset(
        name="Retro Comic",
        art_style="vintage comic book illustration",
        reference_prompt="""MEDIUM: classic comic book printing, halftone dots, newsprint texture
LINE WORK: bold black ink outlines, cross-hatching, vintage comic style, clear forms
COLOR PALETTE: limited CMYK palette, bold primaries, halftone shading, retro feel
SHADING: Ben-Day dots pattern, halftone gradients, vintage printing effects
CHARACTERS: classic comic proportions, expressive faces, action poses, retro fashion
BACKGROUNDS: simple geometric, pop art elements, speed lines, comic panels
LIGHTING: flat comic lighting, bold shadows, graphic contrast
COMPOSITION: comic panel framing, action poses, speech bubble space, dynamic angles""",
        negative_prompt="""modern, photorealistic, 3d, anime, watercolor, painterly, scary horror""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),

    # --------------------------------------------------------
    # CLAYMATION: Stop motion clay style
    # Like: Wallace & Gromit, Shaun the Sheep
    # --------------------------------------------------------
    "claymation-style": GenerationPreset(
        name="Claymation Style",
        art_style="stop motion claymation animation",
        reference_prompt="""MEDIUM: clay animation, plasticine characters, stop motion photography
LINE WORK: no outlines, forms defined by sculpted edges, fingerprint texture on clay
COLOR PALETTE: muted plasticine colors, earthy tones, clay material appearance
SHADING: real lighting on clay, soft shadows, ambient occlusion, physical materials
CHARACTERS: sculpted clay look, visible fingerprints, chunky proportions, googly bead eyes, clay texture
BACKGROUNDS: miniature sets, physical props, craft materials, dollhouse scale
LIGHTING: stop motion studio lighting, soft fill, visible light sources
COMPOSITION: stop motion camera angles, practical sets, handmade charm""",
        negative_prompt="""2d, flat, drawn, anime, photorealistic human, digital art, smooth""",
        width=1080,
        height=704,
        steps=SD35_STEPS,
        cfg=SD35_CFG
    ),
}


def get_preset(name: str) -> GenerationPreset:
    """Get a preset by name, or return bluey-cartoon as default"""
    return PRESETS.get(name, PRESETS["bluey-cartoon"])


def list_presets() -> list[dict]:
    """List all available presets with their names"""
    return [{"id": k, "name": v.name, "art_style": v.art_style} for k, v in PRESETS.items()]

