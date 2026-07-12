{
  "product": {
    "name": "ProductPulse AI",
    "tagline": "Every customer complaint becomes product intelligence.",
    "design_personality": {
      "keywords": [
        "Linear-like precision",
        "Stripe-like financial clarity",
        "Shopify Admin familiarity",
        "calm + trustworthy",
        "data-rich (not crowded)",
        "action-oriented",
        "premium light-theme SaaS"
      ],
      "do_not": [
        "No dark theme",
        "No transparent/glass backgrounds (spec says no transparent backgrounds)",
        "No purple for AI vibe",
        "No gradients on text-heavy areas",
        "No return-portal/helpdesk/CRM visual metaphors"
      ]
    }
  },

  "design_tokens": {
    "notes": [
      "Update /app/frontend/src/index.css :root HSL tokens to match below.",
      "Keep gradients decorative only (<=20% viewport).",
      "Use solid card backgrounds (white) with subtle borders."
    ],
    "css_variables": {
      ":root": {
        "--background": "210 33% 99%",
        "--foreground": "222 47% 11%",

        "--card": "0 0% 100%",
        "--card-foreground": "222 47% 11%",

        "--popover": "0 0% 100%",
        "--popover-foreground": "222 47% 11%",

        "--primary": "221 83% 53%",
        "--primary-foreground": "210 40% 98%",

        "--secondary": "210 40% 96%",
        "--secondary-foreground": "222 47% 11%",

        "--muted": "210 40% 96%",
        "--muted-foreground": "215 16% 47%",

        "--accent": "210 40% 96%",
        "--accent-foreground": "222 47% 11%",

        "--border": "214 32% 91%",
        "--input": "214 32% 91%",
        "--ring": "221 83% 53%",

        "--destructive": "0 84% 60%",
        "--destructive-foreground": "210 40% 98%",

        "--radius": "0.75rem",

        "--pp-surface": "210 33% 99%",
        "--pp-surface-2": "210 40% 97%",
        "--pp-ink": "222 47% 11%",
        "--pp-ink-2": "215 25% 27%",
        "--pp-ink-3": "215 16% 47%",

        "--pp-accent": "221 83% 53%",
        "--pp-accent-2": "199 89% 48%",
        "--pp-success": "142 71% 45%",
        "--pp-warning": "45 93% 47%",
        "--pp-critical": "0 84% 60%",

        "--pp-success-bg": "142 76% 95%",
        "--pp-warning-bg": "48 96% 92%",
        "--pp-critical-bg": "0 93% 94%",

        "--pp-shadow-sm": "0 1px 2px rgba(15, 23, 42, 0.06)",
        "--pp-shadow-md": "0 10px 24px rgba(15, 23, 42, 0.08)",

        "--pp-grid-gutter": "24px",
        "--pp-page-pad": "24px",
        "--pp-page-pad-mobile": "16px"
      },
      "gradients_decorative_only": {
        "hero_header_bg": "linear-gradient(135deg, hsl(210 33% 99%) 0%, hsl(210 40% 97%) 55%, hsl(210 33% 99%) 100%)",
        "accent_wash": "radial-gradient(600px circle at 20% 10%, rgba(59,130,246,0.10), transparent 55%), radial-gradient(500px circle at 90% 20%, rgba(34,211,238,0.10), transparent 55%)"
      }
    },
    "status_system": {
      "health_score": {
        "healthy": { "range": "80-100", "tone": "success", "color": "--pp-success" },
        "watch": { "range": "50-79", "tone": "warning", "color": "--pp-warning" },
        "critical": { "range": "0-49", "tone": "destructive", "color": "--pp-critical" }
      },
      "severity_badges": {
        "low": "muted",
        "medium": "warning",
        "high": "destructive"
      },
      "recommendation_status": {
        "needs_review": "muted",
        "approved": "success",
        "in_progress": "primary",
        "done": "success",
        "rejected": "destructive"
      }
    }
  },

  "typography": {
    "font_pairing": {
      "primary_ui": {
        "name": "Manrope",
        "fallback": "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
      },
      "numbers_optional": {
        "name": "IBM Plex Mono",
        "usage": "Optional for KPI numbers / health score chips only (sparingly)."
      }
    },
    "google_fonts_import": [
      "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap"
    ],
    "scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg font-medium text-muted-foreground",
      "section_title": "text-sm font-semibold tracking-tight text-foreground",
      "kpi_number": "text-3xl md:text-4xl font-semibold tabular-nums",
      "body": "text-sm md:text-base text-foreground",
      "label": "text-xs font-medium text-muted-foreground",
      "table": "text-sm",
      "mono_number_optional": "font-mono tabular-nums"
    },
    "rules": [
      "Use tabular-nums for all numeric KPIs, health scores, currency, percentages.",
      "Avoid all-caps paragraphs; allow all-caps only for tiny labels (text-xs tracking-wide)."
    ]
  },

  "layout": {
    "grid": {
      "desktop": {
        "columns": 12,
        "gutter": "24px",
        "max_width": "1280px (content area), but allow full-width tables when needed",
        "page_padding": "24px"
      },
      "mobile": {
        "columns": 4,
        "gutter": "16px",
        "page_padding": "16px",
        "bottom_nav_safe_area": "pb-[calc(16px+env(safe-area-inset-bottom))]"
      }
    },
    "app_shell": {
      "desktop": {
        "sidebar": {
          "width": "256px",
          "style": "solid white, subtle border-r, grouped nav",
          "active_state": "bg-primary/5 + left accent bar (2px) in primary",
          "collapse_optional": "64px icon-only (optional; not required for MVP)"
        },
        "topbar": {
          "height": "56px",
          "contents": ["page title", "global search (optional)", "store chip", "user menu"],
          "style": "sticky, bg-background, border-b"
        }
      },
      "mobile": {
        "bottom_nav": {
          "items": ["Home", "Add (center CTA)", "Products", "Alerts", "Settings"],
          "height": "64px",
          "style": "solid bg-white, border-t, large tap targets",
          "center_cta": "circular/squircle primary button with plus icon"
        }
      }
    },
    "page_patterns": {
      "dashboard": {
        "top_kpis": "4 KPI cards in responsive grid; on mobile 2x2",
        "main": "Product Health table (desktop) + right column (Top Failure Trends + Alert Feed). On mobile: Product Health becomes stacked cards with score chip + status badge."
      },
      "new_insight": {
        "form": "Two-column on desktop (fields left, guidance panel right). Single column on mobile.",
        "guidance_panel": "Shows examples of good complaints + privacy note."
      },
      "insight_result": {
        "layout": "Left: structured analysis; Right: actions/status + business impact cards. Mobile: actions sticky bottom bar with Approve / In Progress / Copy."
      },
      "product_detail": {
        "layout": "Header with health score visualization + key stats; tabs for Timeline / Recommendations / Raw Complaints.",
        "timeline": "Vertical list with date, severity dot, short summary; expandable for full text."
      },
      "recommendations": {
        "desktop": "Queue table or stacked cards with filters",
        "mobile": "Large swipeable-feel cards (carousel-like) with big Approve/Reject buttons"
      },
      "alerts": {
        "layout": "Cards grouped by severity with quick actions"
      },
      "settings": {
        "layout": "Form sections with separators; PWA install instructions in an info card"
      }
    }
  },

  "components": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui/",
      "use_these": {
        "navigation": ["sheet.jsx", "breadcrumb.jsx", "separator.jsx"],
        "structure": ["card.jsx", "tabs.jsx", "resizable.jsx", "scroll-area.jsx"],
        "data_display": ["table.jsx", "badge.jsx", "progress.jsx", "tooltip.jsx", "hover-card.jsx", "skeleton.jsx"],
        "forms": ["form.jsx", "input.jsx", "textarea.jsx", "select.jsx", "switch.jsx", "label.jsx", "checkbox.jsx"],
        "overlays": ["dialog.jsx", "drawer.jsx", "alert-dialog.jsx", "popover.jsx"],
        "feedback": ["sonner.jsx", "alert.jsx"],
        "date": ["calendar.jsx"],
        "actions": ["button.jsx", "dropdown-menu.jsx"]
      }
    },
    "custom_components_to_create": [
      {
        "name": "AppShell",
        "purpose": "Responsive shell: desktop sidebar + topbar; mobile bottom nav + header.",
        "notes": "Use CSS grid: sidebar + main; sticky topbar; bottom nav fixed with safe-area padding."
      },
      {
        "name": "KpiCard",
        "purpose": "KPI card with label, big number, delta badge, tiny sparkline placeholder.",
        "notes": "Sparkline can be a simple SVG path (no library) for MVP."
      },
      {
        "name": "HealthScoreChip",
        "purpose": "0-100 chip with color-coded background + border.",
        "notes": "Use status mapping; include tooltip for thresholds."
      },
      {
        "name": "SeverityBadge",
        "purpose": "Consistent severity badge for alerts + insight severity.",
        "notes": "Use Badge with tone classes; never rely on only color—include label."
      },
      {
        "name": "StagedAiLoader",
        "purpose": "Premium 5–10s AI analysis loader with staged progress messages.",
        "notes": "Use Progress + Skeleton + rotating messages; respect prefers-reduced-motion."
      },
      {
        "name": "MobileActionBar",
        "purpose": "Sticky bottom action bar on Insight Result for Approve/In Progress/Copy.",
        "notes": "Large buttons, thumb-friendly; hide when keyboard open if possible."
      }
    ]
  },

  "component_specs": {
    "buttons": {
      "style": "Professional / Corporate",
      "tokens": {
        "radius": "rounded-xl",
        "shadow": "shadow-[var(--pp-shadow-sm)] hover:shadow-[var(--pp-shadow-md)]",
        "motion": "transition-colors transition-shadow duration-200",
        "press": "active:translate-y-[1px]"
      },
      "variants": {
        "primary": "bg-primary text-primary-foreground hover:bg-primary/90",
        "secondary": "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        "outline": "border border-input bg-white hover:bg-secondary",
        "ghost": "hover:bg-secondary",
        "destructive": "bg-destructive text-destructive-foreground hover:bg-destructive/90"
      },
      "sizes": {
        "sm": "h-9 px-3 text-sm",
        "md": "h-10 px-4 text-sm",
        "lg": "h-11 px-5 text-base"
      }
    },
    "cards": {
      "base": "bg-card border border-border rounded-xl shadow-[var(--pp-shadow-sm)]",
      "header": "px-5 pt-5 pb-3",
      "content": "px-5 pb-5",
      "kpi": "hover:border-primary/30 hover:shadow-[var(--pp-shadow-md)] transition-colors transition-shadow duration-200"
    },
    "tables": {
      "density": {
        "default_row": "h-12",
        "dense_row": "h-10 (use only for long lists)",
        "header": "text-xs font-semibold text-muted-foreground"
      },
      "alignment": {
        "numbers": "text-right tabular-nums",
        "status": "text-center",
        "primary_text": "text-left"
      },
      "interactions": [
        "Row hover: bg-secondary/60",
        "Clickable row: cursor-pointer + focus ring",
        "Sort indicators: subtle chevrons; active column emphasized"
      ]
    },
    "badges": {
      "health": {
        "healthy": "bg-[hsl(var(--pp-success-bg))] text-[hsl(var(--pp-success))] border border-[hsl(var(--pp-success))]/20",
        "watch": "bg-[hsl(var(--pp-warning-bg))] text-[hsl(var(--pp-warning))] border border-[hsl(var(--pp-warning))]/25",
        "critical": "bg-[hsl(var(--pp-critical-bg))] text-[hsl(var(--pp-critical))] border border-[hsl(var(--pp-critical))]/20"
      },
      "severity": {
        "low": "bg-secondary text-secondary-foreground border border-border",
        "medium": "bg-[hsl(var(--pp-warning-bg))] text-[hsl(var(--pp-warning))] border border-[hsl(var(--pp-warning))]/25",
        "high": "bg-[hsl(var(--pp-critical-bg))] text-[hsl(var(--pp-critical))] border border-[hsl(var(--pp-critical))]/20"
      }
    },
    "forms": {
      "inputs": "bg-white border-border rounded-lg focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]",
      "helper_text": "text-xs text-muted-foreground",
      "sectioning": "Group fields in Cards; use Separator between sections"
    }
  },

  "motion": {
    "principles": [
      "Motion communicates system status (loading, success, warning) and hierarchy.",
      "Keep durations short (150–250ms) for UI; longer (600–1200ms) only for staged AI loader.",
      "Respect prefers-reduced-motion: reduce loader animation to simple progress updates."
    ],
    "micro_interactions": {
      "sidebar_item": "hover:bg-secondary; active has left bar + bg-primary/5",
      "kpi_card": "hover shadow lift + border tint",
      "table_row": "hover highlight; click opens detail",
      "copy_button": "on click: toast 'Copied summary'",
      "approve": "on approve: toast + badge changes + subtle confetti NOT allowed; instead use checkmark icon + success toast"
    },
    "ai_loading_stages": [
      { "t": "0-1s", "label": "Parsing complaint…" },
      { "t": "1-3s", "label": "Classifying failure mode…" },
      { "t": "3-6s", "label": "Estimating impact & severity…" },
      { "t": "6-9s", "label": "Drafting operational fix…" },
      { "t": "9-10s", "label": "Finalizing insight…" }
    ]
  },

  "data_viz": {
    "libraries": [
      {
        "name": "recharts",
        "why": "Top Failure Trends bar chart + health score trend line on Product Detail.",
        "install": "npm i recharts",
        "usage_notes": [
          "Use minimal axes, light gridlines (stroke: hsl(var(--border))).",
          "Use status colors for series; avoid gradients in charts.",
          "Provide empty states with Skeleton + 'No data yet'."
        ]
      },
      {
        "name": "framer-motion",
        "why": "Entrance animations for cards + staged loader transitions.",
        "install": "npm i framer-motion",
        "usage_notes": [
          "Animate opacity + y only; avoid layout thrash.",
          "Disable heavy animations on prefers-reduced-motion."
        ]
      }
    ],
    "health_score_visual": {
      "recommended": "Use Progress component as a horizontal meter + numeric chip; optional small radial gauge via SVG (no heavy libs).",
      "classes": "h-2 rounded-full bg-secondary; indicator uses status color"
    }
  },

  "images": {
    "image_urls": [
      {
        "category": "login_hero_background",
        "description": "Subtle abstract light background for login hero (use as right-side panel image on desktop; hidden on mobile).",
        "url": "https://images.unsplash.com/photo-1708724195876-1156245fce21?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwxfHxjbGVhbiUyMGVjb21tZXJjZSUyMG9wZXJhdGlvbnMlMjBkYXNoYm9hcmQlMjBhYnN0cmFjdCUyMGxpZ2h0JTIwYmFja2dyb3VuZHxlbnwwfHx8Ymx1ZXwxNzgyOTM3OTkzfDA&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "product_detail_placeholder",
        "description": "Minimal product packaging photo for product detail header placeholder (optional).",
        "url": "https://images.unsplash.com/photo-1620744734633-7ddf26aa2066?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxtaW5pbWFsJTIwcHJvZHVjdCUyMHBhY2thZ2luZyUyMHN0dWRpbyUyMHBob3RvJTIwbGlnaHQlMjBiYWNrZ3JvdW5kfGVufDB8fHxncmVlbnwxNzgyOTM3OTk5fDA&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "texture_reference",
        "description": "Reference for subtle grain/noise texture (do not use as full-screen image; recreate via CSS noise overlay).",
        "url": "https://images.unsplash.com/photo-1708305729900-906f34a7d49d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNTl8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMHN1YnRsZSUyMGdyYWluJTIwdGV4dHVyZSUyMGxpZ2h0JTIwYmFja2dyb3VuZHxlbnwwfHx8dGVhbHwxNzgyOTM4MDA4fDA&ixlib=rb-4.1.0&q=85"
      }
    ]
  },

  "accessibility": {
    "requirements": [
      "WCAG AA contrast for text and interactive elements.",
      "Visible focus states: focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2.",
      "Do not rely on color alone for status: include labels (Healthy/Watch/Critical) and icons.",
      "Touch targets on mobile: min-h-[44px] for primary actions.",
      "Respect prefers-reduced-motion for loader and transitions."
    ]
  },

  "testing": {
    "data_testid_rules": {
      "must_apply_to": [
        "Buttons",
        "Links",
        "Inputs/Textareas/Selects/Switches",
        "Navigation items",
        "Key informational elements (health score, severity, confidence, impact numbers)",
        "Toasts/alerts"
      ],
      "convention": "kebab-case describing role, not appearance",
      "examples": [
        "data-testid=\"login-demo-button\"",
        "data-testid=\"sidebar-nav-dashboard\"",
        "data-testid=\"dashboard-kpi-monthly-loss-prevented\"",
        "data-testid=\"health-table-row-open-product\"",
        "data-testid=\"insight-result-severity-badge\"",
        "data-testid=\"recommendation-approve-button\"",
        "data-testid=\"mobile-bottomnav-add\""
      ]
    }
  },

  "implementation_notes_for_js": {
    "notes": [
      "Project uses .js (not .tsx). Keep components in .jsx where needed; avoid TS-only patterns.",
      "Use lucide-react icons (already common with shadcn) or FontAwesome CDN; no emoji icons.",
      "Replace CRA default App.css styles; do not center the app container.",
      "Use Sonner for toasts: /app/frontend/src/components/ui/sonner.jsx"
    ],
    "suggested_global_css_additions": {
      "where": "/app/frontend/src/index.css",
      "add": [
        "body { font-family: 'Manrope', ui-sans-serif, system-ui; }",
        "::selection { background: rgba(59,130,246,0.18); }",
        ".pp-noise::before { content:''; position:fixed; inset:0; pointer-events:none; background-image:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.035\"/></svg>'); mix-blend-mode:multiply; }"
      ]
    }
  },

  "instructions_to_main_agent": [
    "1) Update /app/frontend/src/index.css :root tokens to match design_tokens.css_variables[':root'] and set body font to Manrope.",
    "2) Remove CRA demo styles in /app/frontend/src/App.css (logo spin, centered header).",
    "3) Build AppShell with desktop sidebar + topbar and mobile bottom nav (5 items with center Add CTA).",
    "4) Implement consistent status mapping utilities (health score -> badge classes; severity -> badge classes; recommendation status -> badge classes).",
    "5) Dashboard: KPI cards grid + Product Health table (desktop) and card list (mobile).",
    "6) New Insight: staged AI loader (Progress + Skeleton + staged messages).",
    "7) Insight Result: structured cards + sticky MobileActionBar; include disclaimer text for impact estimates.",
    "8) Use shadcn components only for inputs/selects/dialogs/toasts; avoid raw HTML dropdowns.",
    "9) Add data-testid to every interactive element and key info fields per testing rules.",
    "10) Keep gradients decorative only (<=20% viewport) and never on reading areas; no transparent backgrounds."
  ],

  "appendix_general_ui_ux_design_guidelines": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
