# Built-in Themes

::: warning Slides: not implemented
Slide decks and slide theming are not available yet. References to slides and slide examples on this page describe planned behavior.
:::

A theme defines the color palette, typography baseline, and default border radius used across a diagram or slide deck. Themes are applied via the `dark` / `light` class tokens or by referencing a named theme. Custom themes can override any variable.

---

## Theme Variables

Every theme maps to a set of CSS custom properties. These are the variables you override when creating a custom theme:

| Variable | Role |
|----------|------|
| `--tg-color-background` | Canvas / slide background |
| `--tg-color-foreground` | Default text and border color |
| `--tg-color-surface` | Default node fill (foreground at 15% opacity) |
| `--tg-color-primary` | Primary accent color |
| `--tg-color-secondary` | Secondary accent color |
| `--tg-color-info` | Info state (typically blue) |
| `--tg-color-success` | Success state (typically green) |
| `--tg-color-warning` | Warning state (typically amber) |
| `--tg-color-danger` | Danger / error state (typically red) |
| `--tg-color-edge` | Default edge / arrow stroke color |
| `--tg-font-family` | Font family for all text |
| `--tg-font-size` | Base font size |
| `--tg-border-radius` | Default corner rounding |
| `--tg-border-width` | Default border stroke width |

---

## Built-in Themes

### `light` (default)

Clean white background with dark text. Used when no theme class is declared.

| Variable | Value |
|----------|-------|
| `--tg-color-background` | `#ffffff` |
| `--tg-color-foreground` | `#1a1a1a` |
| `--tg-color-surface` | `#1a1a1a26` *(foreground 15%)* |
| `--tg-color-primary` | `#2563eb` |
| `--tg-color-secondary` | `#7c3aed` |
| `--tg-color-info` | `#0ea5e9` |
| `--tg-color-success` | `#16a34a` |
| `--tg-color-warning` | `#d97706` |
| `--tg-color-danger` | `#dc2626` |
| `--tg-color-edge` | `#6b7280` |
| `--tg-border-radius` | `6px` |
| `--tg-border-width` | `1.5px` |

### `dark`

Dark background with light text. Applied via the `dark` class token on a scope or slide boundary.

| Variable | Value |
|----------|-------|
| `--tg-color-background` | `#0f1117` |
| `--tg-color-foreground` | `#e8eaf0` |
| `--tg-color-surface` | `#e8eaf026` *(foreground 15%)* |
| `--tg-color-primary` | `#3b82f6` |
| `--tg-color-secondary` | `#a78bfa` |
| `--tg-color-info` | `#38bdf8` |
| `--tg-color-success` | `#4ade80` |
| `--tg-color-warning` | `#fbbf24` |
| `--tg-color-danger` | `#f87171` |
| `--tg-color-edge` | `#6b7280` |
| `--tg-border-radius` | `6px` |
| `--tg-border-width` | `1.5px` |

---

## Custom Themes

### CSS file

Define a custom theme by setting all CSS variables on the `.tg-theme-<name>` class. Every variable must be specified — there is no inheritance from built-in themes. The theme name can then be used as a class token anywhere `dark` or `light` is valid.

```css
/* my-theme.css */
.tg-theme-ocean {
  --tg-color-background: #0d1b2a;
  --tg-color-foreground: #e0f0ff;
  --tg-color-surface:    #e0f0ff26;
  --tg-color-primary:    #00b4d8;
  --tg-color-secondary:  #90e0ef;
  --tg-color-info:       #48cae4;
  --tg-color-success:    #52b788;
  --tg-color-warning:    #f4a261;
  --tg-color-danger:     #e63946;
  --tg-color-edge:       #5e8a99;
  --tg-font-family:      sans-serif;
  --tg-font-size:        14px;
  --tg-border-radius:    4px;
  --tg-border-width:     1px;
}
```

Reference it in a diagram:

```
@slide(ocean): my-slide

# Slide Title

a -> b
```

### Inline theme block

For self-contained files, define theme variables inside a fenced `theme` block in an HTML comment at the top of the document. All variables must be specified — there is no inheritance from built-in themes:

````
<!--
```theme ocean
--tg-color-background: #0d1b2a;
--tg-color-foreground: #e0f0ff;
--tg-color-surface:    #e0f0ff26;
--tg-color-primary:    #00b4d8;
--tg-color-secondary:  #90e0ef;
--tg-color-info:       #48cae4;
--tg-color-success:    #52b788;
--tg-color-warning:    #f4a261;
--tg-color-danger:     #e63946;
--tg-color-edge:       #5e8a99;
--tg-font-family:      sans-serif;
--tg-font-size:        14px;
--tg-border-radius:    4px;
--tg-border-width:     1px;
```
-->

---(ocean): my-slide

# Slide Title

a -> b
````
