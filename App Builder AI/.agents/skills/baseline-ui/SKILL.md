---
name: baseline-ui
description: >-
  Quickly deslop UI code by fixing spacing, hierarchy, typography, and small layout issues.
  Use when the interface needs a fast cleanup, anti-slop pass, or pre-delivery quality audit.
---

# Baseline UI (Anti-Slop UI Guardian)

Enforces an opinionated UI baseline to prevent AI-generated interface slop.

## How to use

- `/baseline-ui`
  Apply these constraints to any UI work in this conversation.

- `/baseline-ui <file>`
  Review the file against all constraints below and output:
  - violations (quote the exact line/snippet)
  - why it matters (1 short sentence)
  - a concrete fix (code-level suggestion)

## Stack & Styling

- MUST use the project's native CSS and design tokens (Vanilla CSS default in AG, or Tailwind CSS if the project specifically uses it)
- MUST use existing CSS variables and design system tokens before introducing new ones
- MUST use native Web Animations API, CSS transitions, or lightweight animation libraries when JavaScript animation is required
- NEVER invent arbitrary pixel values when tokens or a consistent spacing scale exist

## Components

- MUST use accessible component primitives or semantic HTML for anything with keyboard or focus behavior
- MUST use the project’s existing component primitives first
- NEVER mix primitive systems within the same interaction surface
- MUST add an `aria-label` to icon-only buttons
- NEVER rebuild keyboard or focus behavior by hand without adhering to standard ARIA patterns

## Interaction

- MUST use confirmation dialogs/alerts for destructive or irreversible actions
- SHOULD use structural skeletons for loading states (avoid raw full-page spinners)
- NEVER use `h-screen`, use `h-dvh` or `100dvh`
- MUST respect `safe-area-inset` for fixed elements
- MUST show errors next to where the action happens
- NEVER block paste in `input` or `textarea` elements

## Animation

- NEVER add animation unless it is explicitly requested or fits defined micro-interactions
- MUST animate only compositor props (`transform`, `opacity`)
- NEVER animate layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`)
- SHOULD avoid animating paint properties (`background`, `color`) except for small, local UI (text, icons)
- SHOULD use `ease-out` on entrance
- NEVER exceed `200ms` for interaction feedback
- MUST pause looping animations when off-screen
- SHOULD respect `prefers-reduced-motion`
- NEVER introduce custom easing curves unless explicitly requested
- SHOULD avoid animating large images or full-screen surfaces

## Typography

- MUST use `text-wrap: balance` for headings and `text-wrap: pretty` for body/paragraphs where supported
- MUST use `font-variant-numeric: tabular-nums` for data, financial tables, counters, and metrics
- SHOULD use `text-overflow: ellipsis` or line-clamping for dense UI
- NEVER modify `letter-spacing` unless explicitly requested by the design system

## Layout

- MUST use a fixed `z-index` scale (no arbitrary `z-[999999]`)
- SHOULD use square sizing tokens or aspect-ratio instead of mismatched width and height

## Performance

- NEVER animate large `blur()` or `backdrop-filter` surfaces
- NEVER apply `will-change` outside an active animation
- NEVER use heavy JS loops/effects for anything that can be expressed as CSS or native layout

## Design

- NEVER use random gradients unless explicitly defined by the project's Design System
- Unless the project has a specific Design System (e.g. Brain APP Dark Dashboard with Electric Violet / Hot Pink gradients), avoid gratuitous purple/multicolor gradients or AI slop glow effects
- NEVER use raw black shadows (`rgba(0,0,0,0.5)`) — use soft, tinted, neumorphic or elevation-based shadows
- MUST give empty states one clear next action
- SHOULD limit accent color usage to one primary accent per view
- SHOULD use existing theme tokens before introducing new ones

## Pre-Delivery Quality Checklist (Adopted from UI UX Pro Max)

Before submitting or deploying any frontend changes, verify this 8-point checklist:
- [ ] No raw emojis as UI icons (use standard SVG: Lucide, Heroicons, or Feather)
- [ ] Explicit `cursor: pointer` on all clickable/interactive controls
- [ ] Minimum contrast ratio 4.5:1 for normal text (WCAG AA) in both light and dark themes
- [ ] Interaction feedback duration never exceeds `200ms`
- [ ] Clear `:focus-visible` states for keyboard navigation accessibility
- [ ] Media query `@media (prefers-reduced-motion)` respected for all decorative animations
- [ ] Text, chips, and badges reflow gracefully without clipping or overlapping
- [ ] Responsive sanity checked across breakpoints: 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop)

