# Toone Brand Guide

## Logo

The Toone logo combines a soundwave icon with the wordmark **TOONE**. The soundwave is 7 vertical rounded bars in a symmetric wave pattern, representing live audio broadcasting.

### Variants

| File | Use |
|------|-----|
| `logo-full.svg` | Primary logo (red on light backgrounds) |
| `logo-full-white.svg` | Inverted logo (white on dark backgrounds) |
| `logo-icon.svg` | Icon only (red, for favicons, app icons, small spaces) |
| `logo-icon-white.svg` | Icon only (white on dark backgrounds) |

### Clear Space

Maintain a minimum clear space equal to the height of one soundwave bar on all sides of the logo. Do not place text, images, or other elements within this zone.

### Minimum Size

- Full logo: minimum 120px wide (digital) / 30mm (print)
- Icon only: minimum 24px (digital) / 6mm (print)

### Don'ts

- Do not rotate, skew, or distort the logo
- Do not change the bar proportions
- Do not add effects (drop shadows, outlines, gradients) to the logo
- Do not place the red logo on busy or low-contrast backgrounds

---

## Colors

### Primary

| Name | Hex | Usage |
|------|-----|-------|
| Toone Red | `#d71920` | Logo, primary actions, accent |
| Toone Red Dark | `#b81419` | Hover states, pressed buttons |

### Secondary

| Name | Hex | Usage |
|------|-----|-------|
| Toone Orange | `#ff9500` | Gradient endpoints, status indicators |

### Gradient

```css
background: linear-gradient(135deg, #d71920 0%, #ff9500 100%);
```

Used for primary action buttons.

### Backgrounds

| Name | Hex | Usage |
|------|-----|-------|
| Black | `#000000` | Page background |
| Card | `#0a0a0a` | Card surfaces |
| Surface | `#1a1a1a` | Elevated surfaces, borders |
| Input | `#111111` | Input field backgrounds |

### Text

| Name | Hex | Usage |
|------|-----|-------|
| Foreground | `#e5e5e5` | Primary text |
| Muted | `#888888` | Secondary text, labels |
| Muted 2 | `#666666` | Tertiary text, hints |

---

## Typography

**Primary Font**: [Work Sans](https://fonts.google.com/specimen/Work+Sans)

| Weight | Usage |
|--------|-------|
| 400 (Regular) | Body text |
| 500 (Medium) | Subtle emphasis |
| 600 (SemiBold) | Subheadings, labels |
| 700 (Bold) | Headings, buttons, logo wordmark |

### Headings

- All caps, letter-spacing `0.05em–0.15em`
- Font weight 700

### Body

- Sentence case
- Font weight 400–500
- Line height 1.5

---

## QR Codes

QR codes use the Toone Red (`#d71920`) for modules on a white background with the soundwave icon centered. Error correction level H ensures the center logo doesn't break scanning.

---

## Soundwave Icon Specification

The icon is 7 vertical bars with rounded ends (rx=2), evenly spaced 8px apart (center-to-center), symmetric about the center bar:

| Bar | Width | Height | Offset from center |
|-----|-------|--------|-------------------|
| 1, 7 | 4 | 10 | 24 |
| 2, 6 | 4 | 22 | 16 |
| 3, 5 | 4 | 30 | 8 |
| 4 | 4 | 38 | 0 |

Canonical viewBox: `0 0 52 40`
