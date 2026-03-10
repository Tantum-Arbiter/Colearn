"""
Storyboard Creator - Generation Presets

Pre-configured art styles and generation settings.
"""
from .models import GenerationPreset

# ============================================================
# Art Style Presets
# ============================================================

PRESETS = {
    "friendly-dragon": GenerationPreset(
        name="Friendly Dragon",
        art_style="warm medieval fantasy illustration",
        reference_prompt="""MEDIUM: traditional gouache painting, warm picture book illustration style
LINE WORK: soft rounded outlines, gentle curves, friendly approachable forms
COLOR PALETTE: rich warm tones (golden yellow, dragon orange, sunset red, castle grey), fairy tale colors
SHADING: soft gouache gradients, warm diffuse lighting, gentle form modeling
CHARACTERS: friendly rounded dragons, brave little knights, gentle fantasy creatures, big expressive eyes
BACKGROUNDS: storybook castle kingdoms, rolling green hills, dramatic sunset skies
LIGHTING: warm golden hour sunlight, sunset glow, magical atmosphere
COMPOSITION: classic fairy tale framing, adventure scenes, character interactions""",
        negative_prompt="""photorealistic, 3d render, scary, dark, violent, text, watermark, logo, extra limbs, malformed, distorted, ugly, blurry""",
        width=1024,
        height=704,
        steps=28,
        cfg=4.5
    ),

    "watercolor-woodland": GenerationPreset(
        name="Watercolor Woodland",
        art_style="soft watercolor woodland illustration",
        reference_prompt="""MEDIUM: traditional watercolor, wet-on-wet technique, soft paper texture visible
LINE WORK: delicate pencil or ink outlines, loose sketchy quality, organic hand-drawn feel
COLOR PALETTE: muted earth tones (moss green, warm brown, soft cream, mushroom grey), natural woodland colors
SHADING: soft watercolor washes, transparent layering, gentle tonal gradients
CHARACTERS: friendly woodland animals (rabbits, mice, hedgehogs), dressed in cozy clothes, gentle expressions
BACKGROUNDS: cottage core forests, mushroom patches, wildflower meadows, dappled sunlight
LIGHTING: soft dappled forest light, warm afternoon glow, cozy atmosphere
COMPOSITION: intimate woodland scenes, nature details, nostalgic storybook quality""",
        negative_prompt="""harsh colors, sharp edges, photorealistic, 3d, scary, dark, violent, text, watermark""",
        width=1024,
        height=704,
        steps=30,
        cfg=5.0
    ),

    "bright-adventure": GenerationPreset(
        name="Bright Adventure",
        art_style="vibrant cartoon adventure illustration",
        reference_prompt="""MEDIUM: modern digital animation style, clean vector-like quality, high polish
LINE WORK: bold clean outlines, confident curves, clear silhouettes
COLOR PALETTE: saturated primaries (bright red, royal blue, sunshine yellow), high contrast, punchy colors
SHADING: smooth gradient cel shading, rim lighting, dynamic shadows
CHARACTERS: expressive animated faces, dynamic action poses, clear readable emotions
BACKGROUNDS: adventure environments, exciting locations, sense of scale and wonder
LIGHTING: dramatic key lighting, energetic atmosphere, cinematic quality
COMPOSITION: dynamic angles, action-oriented framing, exciting visual storytelling""",
        negative_prompt="""muted colors, sketchy, photorealistic, scary, violent, text, watermark""",
        width=1024,
        height=704,
        steps=25,
        cfg=7.0
    ),

    "cozy-bedtime": GenerationPreset(
        name="Cozy Bedtime",
        art_style="soft dreamy bedtime illustration",
        reference_prompt="""MEDIUM: soft pastel illustration, gentle dreamy quality, calming aesthetic
LINE WORK: soft rounded outlines, gentle curves, soothing shapes
COLOR PALETTE: gentle pastels (lavender, soft blue, cream, pale pink), moonlight tones, low saturation
SHADING: soft diffuse gradients, gentle glow effects, no harsh shadows
CHARACTERS: sleepy gentle children and animals, plush toys, cozy pajamas, peaceful expressions
BACKGROUNDS: warm bedrooms, starry night skies, moonlit windows, cozy blankets and pillows
LIGHTING: soft moonlight glow, warm lamplight, peaceful nighttime atmosphere
COMPOSITION: calm restful scenes, intimate moments, bedtime story quality""",
        negative_prompt="""bright harsh colors, action, scary, dark shadows, photorealistic, text, watermark""",
        width=1024,
        height=704,
        steps=28,
        cfg=4.0
    ),

    "retro-storybook": GenerationPreset(
        name="Retro Storybook",
        art_style="vintage mid-century storybook illustration",
        reference_prompt="""MEDIUM: mid-century modern illustration, 1950s-1960s aesthetic, textured paper appearance
LINE WORK: stylized geometric shapes, bold graphic forms, limited detail
COLOR PALETTE: limited retro palette (mustard yellow, teal, coral, olive), vintage printing colors
SHADING: flat or minimal shading, bold color blocks, graphic simplicity
CHARACTERS: stylized geometric figures, charming simplified features, retro fashion
BACKGROUNDS: stylized landscapes, geometric trees and buildings, pattern-based environments
LIGHTING: flat or minimal, graphic poster quality
COMPOSITION: bold graphic layouts, strong shapes, nostalgic fairy tale framing""",
        negative_prompt="""modern, photorealistic, 3d, neon colors, text, watermark""",
        width=1024,
        height=704,
        steps=28,
        cfg=5.0
    ),

    "magical-garden": GenerationPreset(
        name="Magical Garden",
        art_style="enchanted garden fairy illustration",
        reference_prompt="""MEDIUM: delicate botanical illustration style, soft glowing effects, fantasy realism
LINE WORK: fine detailed linework, intricate botanical accuracy, delicate forms
COLOR PALETTE: soft magical tones (petal pink, leaf green, dewdrop silver, fairy gold), luminous colors
SHADING: soft atmospheric gradients, magical glow effects, bioluminescent accents
CHARACTERS: tiny fairies with gossamer wings, magical creatures, flower spirits, miniature scale
BACKGROUNDS: oversized flowers and plants, dewdrops catching light, secret garden paths
LIGHTING: soft glowing magical light, sparkles and fairy dust, enchanted atmosphere
COMPOSITION: miniature perspectives, botanical framing, hidden magical worlds""",
        negative_prompt="""harsh, scary, dark, photorealistic, modern, urban, text, watermark""",
        width=1024,
        height=704,
        steps=30,
        cfg=4.5
    ),

    "ocean-adventure": GenerationPreset(
        name="Ocean Adventure",
        art_style="underwater ocean adventure illustration",
        reference_prompt="""MEDIUM: vibrant digital painting, underwater lighting effects, fluid organic forms
LINE WORK: flowing organic curves, water movement, smooth character forms
COLOR PALETTE: ocean tones (turquoise, coral orange, deep blue, sandy yellow), tropical reef colors
SHADING: underwater light caustics, volumetric god rays, bioluminescent glows
CHARACTERS: friendly sea creatures (fish, turtles, octopi), anthropomorphic ocean animals, expressive faces
BACKGROUNDS: vibrant coral reefs, underwater caves, sunlit surface above, bubbles everywhere
LIGHTING: sunlight filtering through water, underwater caustics, magical ocean glow
COMPOSITION: underwater perspectives, schools of fish, coral reef environments, sense of wonder""",
        negative_prompt="""dark deep sea, scary, sharks, photorealistic, text, watermark""",
        width=1024,
        height=704,
        steps=28,
        cfg=5.0
    ),

    "space-explorer": GenerationPreset(
        name="Space Explorer",
        art_style="colorful space exploration illustration",
        reference_prompt="""MEDIUM: retro-futuristic illustration, cosmic color gradients, wonder and discovery aesthetic
LINE WORK: clean rounded shapes, friendly sci-fi forms, approachable technology
COLOR PALETTE: cosmic colors (deep purple, nebula pink, starlight blue, rocket red), bright accent pops
SHADING: cosmic gradients, starfield backgrounds, planetary glow effects
CHARACTERS: friendly aliens, cute astronauts, robot companions, adorable spacecraft
BACKGROUNDS: colorful planets, star fields, nebulae, retro-futuristic space stations
LIGHTING: cosmic glow effects, planet shine, starlight twinkle
COMPOSITION: sense of wonder and discovery, space exploration themes, educational yet magical""",
        negative_prompt="""scary aliens, dark horror, realistic, violent, text, watermark""",
        width=1024,
        height=704,
        steps=28,
        cfg=5.0
    ),

    # ============================================================
    # Modern Animation Style Presets (Technical Art Descriptions)
    # ============================================================

    "australian-flat-illustration": GenerationPreset(
        name="Australian Flat Illustration",
        art_style="flat vector Australian cartoon",
        reference_prompt="""MEDIUM: digital vector illustration, flat cel-shaded animation style
LINE WORK: clean uniform-weight outlines, smooth bezier curves, no sketchy lines
COLOR PALETTE: warm pastels (peach, sky blue, soft yellow, mint green), high saturation accents
SHADING: minimal flat shading, no gradients, solid color fills, occasional soft drop shadows
CHARACTERS: soft rounded shapes, large expressive eyes, simplified anatomy, anthropomorphic animals
BACKGROUNDS: simplified suburban Australian setting, blue sky, green grass, minimalist detail
LIGHTING: bright even daylight, warm golden hour tones, no harsh shadows
COMPOSITION: character-focused, clean negative space, uncluttered layouts""",
        negative_prompt="""realistic, photorealistic, dark, scary, complex shading, anime, 3d render, gradients, detailed backgrounds, harsh lighting, text, watermark""",
        width=1024,
        height=704,
        steps=28,
        cfg=5.5
    ),

    "textured-storybook-illustration": GenerationPreset(
        name="Textured Storybook Illustration",
        art_style="gouache woodland illustration",
        reference_prompt="""MEDIUM: traditional gouache painting, visible brush texture, thick impasto strokes
LINE WORK: bold ink outlines with slight variation, hand-drawn quality, expressive contours
COLOR PALETTE: warm earth tones (burnt sienna, moss green, golden ochre) with bright accent pops (orange, magenta)
SHADING: textured gradient shading, visible brushwork, layered paint texture
CHARACTERS: rounded friendly shapes, large expressive googly eyes, exaggerated proportions
BACKGROUNDS: detailed British woodland, lush foliage, wildflowers, mushrooms, dappled forest light
LIGHTING: warm diffused natural light, soft shadows, cozy atmosphere
COMPOSITION: characters integrated into richly detailed nature scenes""",
        negative_prompt="""scary monsters, dark horror, photorealistic, anime, minimal style, flat colors, vector art, text, watermark""",
        width=1024,
        height=704,
        steps=30,
        cfg=5.0
    ),

    "bold-preschool-flat": GenerationPreset(
        name="Bold Preschool Flat",
        art_style="simple geometric preschool cartoon",
        reference_prompt="""MEDIUM: ultra-simplified digital illustration, flat 2D shapes, no perspective
LINE WORK: thick bold black outlines (4-6px weight), uniform stroke width, geometric shapes
COLOR PALETTE: primary colors (red, blue, yellow) plus bright green and pink, pure saturated hues
SHADING: completely flat, no gradients, no shadows, solid color fills only
CHARACTERS: extremely simplified side-view profiles, basic geometric shapes (circles, ovals), dot eyes
BACKGROUNDS: minimal detail, simple rolling green hills, basic house shapes, blue sky with sun
LIGHTING: none - completely flat lighting, no shadows or highlights
COMPOSITION: simple centered layouts, maximum clarity, toddler-friendly visual simplicity""",
        negative_prompt="""detailed, realistic, 3d, shading, shadows, gradients, complex, scary, dark, photorealistic, perspective, text, watermark""",
        width=1024,
        height=704,
        steps=25,
        cfg=6.0
    ),

    "cgi-action-cartoon": GenerationPreset(
        name="CGI Action Cartoon",
        art_style="3D CG preschool action cartoon",
        reference_prompt="""MEDIUM: 3D CGI animation style, smooth plastic-like surfaces, soft subsurface scattering
LINE WORK: no outlines, form defined by shading and color
COLOR PALETTE: bright saturated primaries (fire engine red, royal blue, sunshine yellow), high contrast
SHADING: soft gradient shading, ambient occlusion, rim lighting, glossy highlights
CHARACTERS: heroic puppy/animal characters, uniforms with badges, dynamic action poses
BACKGROUNDS: coastal adventure town, vehicles, rescue equipment, clear blue skies
LIGHTING: bright key light, soft fill, dramatic but child-friendly
COMPOSITION: dynamic angles, action-oriented framing, team group shots""",
        negative_prompt="""scary, violent, realistic animals, dark, horror, 2D flat, sketchy, painterly, text, watermark""",
        width=1024,
        height=704,
        steps=26,
        cfg=5.5
    ),

    "paper-cutout-geometric": GenerationPreset(
        name="Paper Cutout Geometric",
        art_style="geometric paper cutout cartoon",
        reference_prompt="""MEDIUM: paper cutout collage style, textured construction paper appearance, layered flat shapes
LINE WORK: no outlines, shapes defined by color contrast, clean geometric edges
COLOR PALETTE: limited palette per scene (3-4 colors), bold flat primaries, kraft paper browns
SHADING: none - completely flat, texture from paper grain only
CHARACTERS: simple geometric shapes (circles, squares, triangles), basic facial features, friendly animals
BACKGROUNDS: minimalist woodland, simple tree shapes, textured paper backgrounds
LIGHTING: flat, no shadows (or simple cut-paper shadow shapes)
COMPOSITION: clean graphic design layouts, badge/emblem motifs, educational visual hierarchy""",
        negative_prompt="""detailed, realistic, 3d, complex, gradients, shading, scary, photorealistic, text, watermark""",
        width=1024,
        height=704,
        steps=25,
        cfg=5.0
    ),

    "polynesian-epic-adventure": GenerationPreset(
        name="Polynesian Epic Adventure",
        art_style="epic tropical animation",
        reference_prompt="""MEDIUM: high-quality digital painting, cinematic animation style, rich detail
LINE WORK: soft implied edges, form defined by color and light, no hard outlines
COLOR PALETTE: tropical jewel tones (turquoise, coral, golden yellow, deep ocean blue), warm oranges
SHADING: rich gradient shading, volumetric lighting, subsurface scattering on water
CHARACTERS: strong expressive features, Polynesian cultural aesthetics, flowing hair and fabric
BACKGROUNDS: volcanic islands, bioluminescent ocean, tropical flowers, coral reefs, dramatic skies
LIGHTING: golden hour sunlight, magical underwater glow, dramatic cloud formations
COMPOSITION: epic sweeping landscapes, ocean vistas, adventure and discovery themes""",
        negative_prompt="""dark, scary, violent, photorealistic, anime, flat, simple, text, watermark""",
        width=1024,
        height=704,
        steps=30,
        cfg=5.5
    ),

    "soft-3d-nursery": GenerationPreset(
        name="Soft 3D Nursery",
        art_style="3D preschool nursery animation",
        reference_prompt="""MEDIUM: soft 3D CGI animation, plastic toy-like surfaces, rounded edges on all forms
LINE WORK: no outlines, soft ambient occlusion defines edges
COLOR PALETTE: soft pastels (baby blue, mint, peach, lavender) with bright primary accents
SHADING: soft diffuse lighting, gentle gradients, no harsh shadows, subsurface scattering
CHARACTERS: big round heads, huge expressive eyes, tiny bodies, toddler proportions
BACKGROUNDS: simple clean nursery and playground settings, minimal clutter
LIGHTING: bright even studio lighting, soft shadows, cheerful atmosphere
COMPOSITION: centered characters, simple clear layouts, educational focus""",
        negative_prompt="""scary, dark, realistic, complex, violent, photorealistic, detailed, sharp shadows, text, watermark""",
        width=1024,
        height=704,
        steps=26,
        cfg=5.0
    ),

    "japanese-watercolor-fantasy": GenerationPreset(
        name="Japanese Watercolor Fantasy",
        art_style="Japanese anime watercolor illustration",
        reference_prompt="""MEDIUM: hand-painted watercolor backgrounds, soft cel animation character style
LINE WORK: delicate ink outlines on characters, soft watercolor bleeds on backgrounds
COLOR PALETTE: soft muted tones (sage green, dusty pink, sky blue), natural earth colors, occasional vivid accents
SHADING: soft watercolor gradients, atmospheric perspective, gentle color transitions
CHARACTERS: expressive anime-influenced eyes, simple but emotive features, flowing movement
BACKGROUNDS: lush detailed nature (forests, meadows, clouds), European-Japanese hybrid architecture
LIGHTING: soft diffused natural light, magical golden hour, dappled forest sunlight
COMPOSITION: contemplative peaceful scenes, characters small in vast natural landscapes, sense of wonder""",
        negative_prompt="""dark horror, scary, violent, photorealistic, 3d render, western cartoon, harsh, flat, text, watermark""",
        width=1024,
        height=704,
        steps=32,
        cfg=4.5
    ),

    "cozy-british-watercolor": GenerationPreset(
        name="Cozy British Watercolor",
        art_style="traditional British watercolor illustration",
        reference_prompt="""MEDIUM: traditional watercolor with pen and ink, delicate washes, visible paper texture
LINE WORK: fine pen outlines, loose sketchy quality, hatching for texture, hand-drawn charm
COLOR PALETTE: warm muted tones (marmalade orange, duffle coat blue, cream, brown), rainy day greys
SHADING: soft watercolor gradients, wet-on-wet blending, luminous transparency
CHARACTERS: charming friendly animals in clothing, expressive but understated, British mannerisms
BACKGROUNDS: London architecture, cozy interiors, rainy streets, vintage 1960s Britain aesthetic
LIGHTING: soft overcast daylight, warm interior lamplight, cozy atmosphere
COMPOSITION: intimate character moments, architectural framing, nostalgic storybook quality""",
        negative_prompt="""scary, dark, realistic bear, violent, photorealistic, modern, harsh colors, text, watermark""",
        width=1024,
        height=704,
        steps=28,
        cfg=4.5
    ),

    "painted-paper-collage": GenerationPreset(
        name="Painted Paper Collage",
        art_style="hand-painted tissue paper collage",
        reference_prompt="""MEDIUM: hand-painted tissue paper collage, layered torn paper edges, acrylic paint textures
LINE WORK: no outlines - shapes defined by paper edges and overlapping layers
COLOR PALETTE: bold saturated primaries (cadmium red, cobalt blue, lemon yellow), plus vibrant greens
SHADING: none - flat layered papers, texture from paint strokes and paper grain
CHARACTERS: simple iconic shapes (circles, ovals), friendly animals and insects, googly eyes
BACKGROUNDS: layered paper sky, sun/moon motifs, simple landscape elements, visible paper texture
LIGHTING: flat - no shadows, bold graphic impact
COMPOSITION: bold simple compositions, central subject, educational clarity, counting/learning themes""",
        negative_prompt="""photorealistic, smooth gradients, 3d, scary, dark, complex, digital, clean edges, text, watermark""",
        width=1024,
        height=704,
        steps=28,
        cfg=5.0
    ),

    "warm-neighborhood-cartoon": GenerationPreset(
        name="Warm Neighborhood Cartoon",
        art_style="gentle neighborhood preschool animation",
        reference_prompt="""MEDIUM: soft digital animation style, smooth gradients, gentle edges
LINE WORK: thin clean outlines, consistent weight, friendly curves
COLOR PALETTE: warm nurturing tones (soft red cardigan, golden yellows, gentle greens), cozy earth tones
SHADING: soft gradient shading, warm ambient light, gentle shadows
CHARACTERS: friendly animal characters, kind expressions, cozy clothing (cardigans, sweaters)
BACKGROUNDS: safe neighborhood settings, trolley, make-believe worlds, simple interiors
LIGHTING: warm golden hour lighting, soft and comforting, no harsh shadows
COMPOSITION: welcoming character-focused scenes, calm pacing, emotional learning themes""",
        negative_prompt="""scary, dark, complex, realistic, violent, photorealistic, harsh, cold colors, text, watermark""",
        width=1024,
        height=704,
        steps=26,
        cfg=4.5
    ),

    "educational-block-characters": GenerationPreset(
        name="Educational Block Characters",
        art_style="geometric math character animation",
        reference_prompt="""MEDIUM: clean digital vector animation, geometric precision, flat design
LINE WORK: thin precise outlines, geometric shapes, mathematical accuracy
COLOR PALETTE: rainbow spectrum primaries (red, orange, yellow, green, blue, purple), white backgrounds
SHADING: flat colors, minimal shading, clean graphic style
CHARACTERS: rectangular block characters with faces and stick limbs, stackable numbered blocks
BACKGROUNDS: pure white or simple solid colors, minimal distraction, educational focus
LIGHTING: flat even lighting, no shadows
COMPOSITION: mathematical arrangements, stacking/grouping patterns, counting layouts, clear visual math""",
        negative_prompt="""realistic, complex, scary, dark, photorealistic, detailed backgrounds, organic shapes, text, watermark""",
        width=1024,
        height=704,
        steps=24,
        cfg=5.5
    ),

    "classic-pencil-watercolor": GenerationPreset(
        name="Classic Pencil Watercolor",
        art_style="vintage pencil and watercolor illustration",
        reference_prompt="""MEDIUM: soft pencil sketches with delicate watercolor washes, vintage 1920s illustration style
LINE WORK: gentle graphite pencil lines, loose sketchy cross-hatching, hand-drawn warmth
COLOR PALETTE: soft muted earth tones (honey gold, forest green, warm brown, cream), limited palette
SHADING: soft pencil shading, transparent watercolor glazes, paper showing through
CHARACTERS: gentle friendly woodland animals, soft fuzzy textures, simple clothing, thoughtful expressions
BACKGROUNDS: cozy English woodland, treehouse homes, forest paths, wildflower meadows
LIGHTING: soft dappled forest light, warm afternoon glow, nostalgic atmosphere
COMPOSITION: intimate contemplative scenes, nature details, quiet storytelling moments""",
        negative_prompt="""3D render, modern, bright saturated, scary, dark, photorealistic, digital, sharp, text, watermark""",
        width=1024,
        height=704,
        steps=30,
        cfg=4.0
    ),

    "food-character-adventure": GenerationPreset(
        name="Food Character Adventure",
        art_style="playful food character illustration",
        reference_prompt="""MEDIUM: bold digital illustration, clean vector-like style with slight texture
LINE WORK: thick black outlines, confident strokes, cartoon clarity
COLOR PALETTE: vegetable colors (bright green, orange carrot, red tomato, yellow), supermarket whites
SHADING: simple flat colors with minimal cel shading, clean graphic look
CHARACTERS: anthropomorphic vegetables/fruits with googly eyes, stick arms and legs, superhero poses
BACKGROUNDS: supermarket aisles, kitchen settings, refrigerator interiors, clean simple environments
LIGHTING: bright even supermarket lighting, no dramatic shadows
COMPOSITION: action-packed dynamic poses, hero shots, comedic situations, food puns visual""",
        negative_prompt="""realistic food, photorealistic, scary, dark, complex, detailed, gritty, text, watermark""",
        width=1024,
        height=704,
        steps=26,
        cfg=5.5
    ),

    "whimsical-magic-gouache": GenerationPreset(
        name="Whimsical Magic Gouache",
        art_style="gouache witch and woodland illustration",
        reference_prompt="""MEDIUM: traditional gouache painting, thick opaque paint, visible brush texture
LINE WORK: bold ink outlines, hand-drawn character, expressive contours
COLOR PALETTE: autumnal tones (orange, purple, deep green) with magic sparkle accents (gold, silver)
SHADING: textured gouache gradients, rich layered paint, atmospheric depth
CHARACTERS: friendly witch with pointed hat, magical woodland animals (cat, dog, bird, frog), broomstick flying
BACKGROUNDS: British countryside, dramatic skies (stormy clouds and sunny breaks), detailed forests and fields
LIGHTING: dramatic sky lighting, magical glows, warm autumn atmosphere
COMPOSITION: adventure journey scenes, crowded broomstick compositions, whimsical problem-solving""",
        negative_prompt="""scary witch, horror, dark evil, photorealistic, anime, flat, minimal, text, watermark""",
        width=1024,
        height=704,
        steps=30,
        cfg=5.0
    )
}


def get_preset(name: str) -> GenerationPreset:
    """Get a preset by name, or return friendly-dragon as default"""
    return PRESETS.get(name, PRESETS["friendly-dragon"])


def list_presets() -> list[dict]:
    """List all available presets with their names"""
    return [{"id": k, "name": v.name, "art_style": v.art_style} for k, v in PRESETS.items()]

