# Build #137 Journal — Neon Burger VR

## Session: PM 2026-07-28

### Concept
Classic 1982 Data East BurgerTime platformer reimagined in WebXR. Walk over burger ingredients on platforms to drop them, dodge enemies, use pepper to stun, stack burgers on plates.

### Architecture
- 8 source files: index, game-state, game-system, input-system, audio-system, effects-system, environment-system, ui-system
- 8 uikitml templates: menu, hud, pause, results, settings, tutorial, stats, achv
- ECS-based with createSystem pattern

### Critical Discoveries

#### UIKit Text Rendering Fix
The major blocker was text not rendering in PanelUI panels. Root cause chain:
1. `<text content="X"/>` in uikitml gets parsed by HTML parser (parse5) which lowercases all attributes
2. Self-closing custom tags don't work in HTML — they become open tags that swallow siblings  
3. The `<text>` tag becomes `type: "custom"` in the parser, and since htmlKit has no "text" entry, it falls through to createCustomElement() which creates a plain Container
4. **Fix:** Replace all `<text content="X"/>` with `<div>X</div>` — the parser creates `type: "container"` with string children, and UIKit's `interpret()` function properly creates Text components for string children

#### Attribute Casing
- parse5 lowercases all HTML attributes: `backgroundColor` → `backgroundcolor`
- UIKit's kebab-to-camelCase converter expects kebab input: `background-color` → `backgroundColor`
- **Fix:** Use kebab-case in all uikitml templates (e.g., `background-color`, `font-size`, `border-radius`)

#### Panel Root Element  
- `<panel>` root tag becomes `type: "custom"` with no kit entry → plain Container
- This works fine as a Container wrapper — doesn't affect rendering

#### Component Visibility
- `visible: false` on UIKit Components is NORMAL — instanced rendering (InstancedPanelMesh, InstancedGlyphMesh) handles the actual visuals
- Text had `visible: false` but `size: [231, 38]` — font loaded, layout computed, glyphs rendered correctly

#### Multi-Panel Entity Creation
- Nested Group approach failed: `createTransformEntity(childGroup)` reparents to scene root
- **Fix:** Create independent entities per panel, each with own Group at same position

### Deployment
- GitHub Pages: https://ellyz2426.github.io/neon-burger/
- Repo: https://github.com/ellyz2426/neon-burger
