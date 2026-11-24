---
name: jphone-asset-creator
description: Generate consistent 鲸娘 / 小鲸同学 wallpapers, multi-frame transparent Sprite Sheets, animated videos, moments, and Q-version pet packs anchored to the official 小鲸同学 (JingChan) clean reference sheet.
---

# JPhone Asset Creator Skill (鲸娘 Co-Creation Anchor)

Use `skills/jphone-asset-creator/assets/ref.jpeg` (the clean logo-free 小鲸同学 / JingChan character reference sheet) as the visual style anchor for all community co-creation assets:

- **Character traits**: Deep-ocean indigo-to-cyan gradient wavy long hair with ahoge, white frilly maid headband, whale fin ears with light-blue bows, dark navy & gold-trim maid dress, clean plain white frilly apron (no third-party brand logo or text), horizontal whale fluke tail, sparkling deep-blue starry eyes.
- **Tagline / vibe**: "A Little Deeper, A Kinder World" — warm, playful, curious, reliable.

## Output Targets

1. **`pet-sprite-pack` (Recommended — Zero-Codec Cross-Platform Transparent Sprite Sheets)**:
   - Generate a `16:9` horizontal 4-frame strip per action (`idle`, `happy`, `working`, `sleepy`, `walk`) on a flat `#00FF00` pure chroma-key green background with generous empty spacing between poses.
   - Run the normalization script to chroma-key, despill green edges, align foot baselines, and pack into `1024×256` (`4 × 256×256`) transparent PNG strips:
     ```bash
     python3 scripts/build_sprite_sheet.py raw_idle.jpg assets/character/sprites/sprite_idle.png --height-ratio 0.86
     python3 scripts/build_sprite_sheet.py raw_happy.jpg assets/character/sprites/sprite_happy.png --height-ratio 0.82 --preserve-jump
     ```
2. **`pet-video-pack` (Optional — Transparent Video Packs)**:
   - VP9-alpha `.webm` (Chromium/Electron/Android) + HEVC-alpha `.mov` (Safari/macOS/iOS WebKit) produced from `#00FF00` green-screen AI videos.
   - Inspired by [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) (MIT).
3. **`wallpaper`**: 9:19.5 vertical (e.g. `1170×2532`) static or animated loop, leaving the top 38% open for iOS status bar, 2×2 companion widget, and Mini-App icons.
4. **`moments`**: Short slice-of-life photo + caption written in 小鲸同学's voice.
