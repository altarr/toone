# TrendAI Brand Guide

This folder contains all TrendAI brand assets, style definitions, and the QR code generator. Import this folder into any project to maintain consistent TrendAI branding.

---

## Logo Assets

### Full Logo (Horizontal wordmark)
| File | Use | Background |
|------|-----|------------|
| `TrendAI-Logo-Full-Color-RGB.png` | Primary logo | White/light backgrounds |
| `TrendAI-Logo-Black-RGB.png` | Monochrome | White/light backgrounds |
| `TrendAI-Logo-White-RGB.png` | Inverted | Dark/black backgrounds |
| `TrendAI-Logo-Inverted-RGB.png` | Inverted with color icon | Dark backgrounds |
| `TrendAI-Tagline-Vertical-Inverse-RGB.png` | Logo with tagline (vertical) | Dark backgrounds |

### Icon Only (Star/orbit mark)
| File | Use | Background |
|------|-----|------------|
| `TrendAI-Logo-Icon-Full-Color-RGB.png` | Primary icon | White/light backgrounds |
| `TrendAI-Logo-Icon-Black-RGB.png` | Monochrome icon | White/light backgrounds |
| `TrendAI-Logo-Icon-White-RGB.png` | Inverted icon | Dark/black backgrounds |

### Favicon
| File | Size | Use |
|------|------|-----|
| `favicon.png` | 64x64 | Browser tab icon, app icon |

**Favicon generation**: The favicon is the full-color icon resized to 64x64 with `contain` fit (transparent padding, no cropping). To regenerate:
```javascript
const sharp = require('sharp');
sharp('TrendAI-Logo-Icon-Full-Color-RGB.png')
  .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toFile('favicon.png');
```

### Usage Rules
- Always use the provided PNG files — do not recreate or modify the logo
- Maintain clear space around the logo equal to the height of the "AI" text
- Never stretch, rotate, or change the logo colors
- On dark backgrounds (black, #0a0a0a, #111), use the White or Inverted variants
- On light backgrounds (white, #fff, #e5e5e5), use the Full Color or Black variants
- Minimum display height: 28px for the full logo, 16px for the icon

---

## Color Palette

### Primary Colors
| Name | Hex | RGB | Use |
|------|-----|-----|-----|
| **TrendAI Red** | `#d71920` | 215, 25, 32 | Primary brand color, buttons, accents, links |
| **TrendAI Red Dark** | `#b81419` | 184, 20, 25 | Hover states, dark red accents |
| **Accent Orange** | `#ff9500` | 255, 149, 0 | Secondary accent, gradient endpoint |

### Gradient
| Name | CSS | Use |
|------|-----|-----|
| **Brand Gradient** | `linear-gradient(135deg, #d71920 0%, #ff9500 100%)` | Primary buttons, CTAs |

### Dark Theme (Default)
| Name | Hex | Use |
|------|-----|-----|
| **Background** | `#000000` | Page background |
| **Card** | `#0a0a0a` | Card/panel backgrounds |
| **Input** | `#111111` | Form input backgrounds |
| **Border** | `#1a1a1a` | Card borders, dividers |
| **Input Border** | `#333333` | Input field borders |

### Text Colors
| Name | Hex | Use |
|------|-----|-----|
| **Primary Text** | `#e5e5e5` | Headings, body text |
| **Secondary Text** | `#888888` | Labels, captions, muted text |
| **Muted Text** | `#666666` | Very subtle text |
| **Placeholder** | `#444444` | Input placeholder text |
| **Error** | `#ff6b6f` | Error messages |

### Status Colors
| Name | Hex | Use |
|------|-----|-----|
| **Live/Active** | `#d71920` | Live indicators, active states |
| **Success/Online** | `#22c55e` (green-500) | Online indicators, success |
| **Warning** | `#ff9500` | Warnings, "must change password" |
| **Error** | `#ff6b6f` | Errors, delete buttons |

---

## Typography

### Font
**Work Sans** — Google Fonts

```html
<link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```css
font-family: 'Work Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
```

### Font Weights
| Weight | Name | Use |
|--------|------|-----|
| 400 | Regular | Body text |
| 500 | Medium | Subtle emphasis |
| 600 | Semibold | Card titles, usernames |
| 700 | Bold | Headings, buttons, labels |

### Text Styles
| Element | Size | Weight | Spacing | Transform | Color |
|---------|------|--------|---------|-----------|-------|
| Page heading | 18-20px | 700 | 0.06em | uppercase | #e5e5e5 |
| Section heading | 14px | 700 | 0.06em | uppercase | #d71920 |
| Body text | 14px | 400 | normal | none | #e5e5e5 |
| Label | 11px | 700 | 0.08em | uppercase | #888888 |
| Button text | 13px | 700 | 0.06em | uppercase | #ffffff |
| Small/caption | 12px | 400 | normal | none | #888888 |
| Tiny/badge | 10px | 700 | 0.06em | uppercase | varies |

---

## Component Styles

### Buttons

**Primary (Gradient)**
```css
.btn-gradient {
  background: linear-gradient(135deg, #d71920 0%, #ff9500 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
}
.btn-gradient:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-gradient:disabled { opacity: 0.5; cursor: not-allowed; }
```

**Outline**
```css
.btn-outline {
  background: transparent;
  color: #888;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 10px 24px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.btn-outline:hover { border-color: #d71920; color: #e5e5e5; }
```

### Cards
```css
.card {
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  border-radius: 16px;
  padding: 28px 32px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}
```

### Inputs
```css
.input {
  width: 100%;
  background: #111;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  color: #e5e5e5;
  outline: none;
  transition: border-color 0.15s;
}
.input::placeholder { color: #444; }
.input:focus { border-color: #d71920; }
```

### Labels
```css
.field-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #888;
  margin-bottom: 8px;
}
```

### Modals
```css
/* Overlay */
background: rgba(0, 0, 0, 0.8);
backdrop-filter: blur(4px);

/* Modal card — use .card styles */
max-width: 500px;
```

### Spinner
```css
.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #333;
  border-top-color: #d71920;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

---

## Role Badge Colors

| Role | Background | Text |
|------|-----------|------|
| Admin | `rgba(215,25,32,0.2)` | `#d71920` |
| Speaker | `rgba(34,197,94,0.2)` | `#4ade80` |
| Translator | `rgba(59,130,246,0.2)` | `#60a5fa` |
| Panelist | `rgba(168,85,247,0.2)` | `#c084fc` |

---

## QR Code Generator

### Files
- `qrcode.min.js` — QR code generation library (client-side, vanilla JS)

### TrendAI QR Code Styles

Three branded presets with TrendAI logo overlay:

```javascript
const QR_STYLES = {
  red:   { color: '#d71920', bg: '#ffffff', logo: 'TrendAI-Logo-Icon-Full-Color-RGB.png', logoBg: '#ffffff' },
  black: { color: '#000000', bg: '#ffffff', logo: 'TrendAI-Logo-Icon-Black-RGB.png',      logoBg: '#ffffff' },
  white: { color: '#ffffff', bg: '#1a1a1a', logo: 'TrendAI-Logo-Icon-White-RGB.png',      logoBg: '#1a1a1a' },
};
```

### Usage — Vanilla JS (with qrcode.min.js)

```html
<script src="qrcode.min.js"></script>
<script>
function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function renderTrendAIQR(canvas, url, size, styleName) {
  const style = QR_STYLES[styleName || 'red'];

  // Generate QR code
  const scratch = document.createElement('div');
  scratch.style.display = 'none';
  document.body.appendChild(scratch);
  new QRCode(scratch, {
    text: url,
    width: size,
    height: size,
    colorDark: style.color,
    colorLight: style.bg,
    correctLevel: QRCode.CorrectLevel.H
  });
  const offscreen = scratch.querySelector('canvas');
  document.body.removeChild(scratch);

  // Draw to target canvas
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(offscreen, 0, 0, size, size);

  // Overlay TrendAI logo in center
  const logo = await loadImage(style.logo);
  if (logo) {
    const logoArea = size * 0.22;
    const padding = logoArea * 0.18;
    const half = logoArea / 2 + padding;
    const cx = size / 2;
    const cy = size / 2;
    ctx.fillStyle = style.logoBg;
    ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
    ctx.drawImage(logo, cx - logoArea / 2, cy - logoArea / 2, logoArea, logoArea);
  }
}

// Example:
// <canvas id="myQR"></canvas>
// renderTrendAIQR(document.getElementById('myQR'), 'https://example.com', 300, 'red');
</script>
```

### Usage — npm (Node.js / Next.js / React)

```bash
npm install qrcode
```

```javascript
import QRCode from 'qrcode';

async function renderTrendAIQR(canvas, url, size, styleName = 'red') {
  const style = QR_STYLES[styleName];

  const tempCanvas = document.createElement('canvas');
  await QRCode.toCanvas(tempCanvas, url, {
    width: size,
    margin: 2,
    color: { dark: style.color, light: style.bg },
    errorCorrectionLevel: 'H',
  });

  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(tempCanvas, 0, 0, size, size);

  // Logo overlay
  const logo = await loadImage(style.logo);
  if (logo) {
    const logoArea = size * 0.22;
    const padding = logoArea * 0.18;
    const half = logoArea / 2 + padding;
    const cx = size / 2;
    const cy = size / 2;
    ctx.fillStyle = style.logoBg;
    ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
    ctx.drawImage(logo, cx - logoArea / 2, cy - logoArea / 2, logoArea, logoArea);
  }
}
```

### QR Code Best Practices
- Always use **error correction level H** (highest) — allows the center logo overlay without breaking scanability
- The logo area should be **~22% of the QR size** — larger may prevent scanning
- Always wrap QR codes in a white or light container when displaying on dark backgrounds
- Standard sizes: 300px for display, 120px for thumbnails, 500px for projection
- For download/print, generate at 500px+ and export as PNG

---

## Tailwind CSS Configuration

If using Tailwind CSS, add these custom colors to your config:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        red: '#d71920',
        'red-dark': '#b81419',
        orange: '#ff9500',
        card: '#0a0a0a',
        'card-border': '#1a1a1a',
        'input-bg': '#111111',
        'input-border': '#333333',
        muted: '#888888',
        'muted-2': '#666666',
        placeholder: '#444444',
        error: '#ff6b6f',
      },
    },
  },
};
```

Or use CSS custom properties (as used in TrendAI Tune In):

```css
:root {
  --background: #000000;
  --foreground: #e5e5e5;
  --card: #0a0a0a;
  --card-border: #1a1a1a;
  --input-bg: #111111;
  --input-border: #333333;
  --muted: #888888;
  --muted-2: #666666;
  --placeholder: #444444;
  --red: #d71920;
  --red-dark: #b81419;
  --orange: #ff9500;
  --error: #ff6b6f;
}
```

---

## Quick Start — Importing into a New Project

1. Copy the `brand/` folder into your project root
2. Copy logo assets to your public/static directory
3. Set favicon: copy `favicon.png` to your app's favicon location
4. Import the font: add the Google Fonts link to your HTML head
5. Apply the color palette and component styles from this guide
6. For QR codes: include `qrcode.min.js` or install `qrcode` via npm, use the render functions above
