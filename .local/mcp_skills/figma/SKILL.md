---
name: mcp-figma
description: Call tools from the figma MCP server through code_execution callbacks.
---

# MCP Skill: figma

Use this skill when you need data or actions from this MCP server.

## Server Status

- Status: `error`
- Reason: Failed to fetch tools

This server is not currently active; callbacks may be unavailable.

## Available Functions

No callable functions are currently available for this MCP server.

## Blocked Tools

- None

## Figma-Specific Guidelines

- You may receive a rate-limit error from the Figma MCP. If this happens, explain to the user their options to fix the rate limit. If a URL is provided, fetch it and use the content to inform the user.
- IMPORTANT: ALWAYS call `get_design_context` to get context. Use the entire output from `get_design_context` as the code to implement things. `get_image` is for reference only.
- When encountering Tailwind CSS v4/v4.1 utilities that don't exist in v3.x, convert them to inline styles using React's style prop:
  V4-ONLY UTILITIES to INLINE STYLES:
  - mask-alpha, mask-luminance, mask-match → style={{maskMode: "alpha"|"luminance"|"match-source"}}
  - mask-intersect, mask-add, mask-subtract, mask-exclude → style={{maskComposite: "intersect"|"add"|"subtract"|"exclude"}}
  - mask-[url(...)] → style={{maskImage: "url(...)"}}
  - mask-size-* → style={{maskSize: "..."}}
  - mask-position-* → style={{maskPosition: "..."}}
  - text-shadow-* → style={{textShadow: "..."}}
  - text-shadow-[color] → style={{textShadow: "... [color]"}}
  - wrap-balance, wrap-pretty → style={{textWrap: "balance"|"pretty"}}
  - wrap-break-word → style={{overflowWrap: "break-word"}}
  - drop-shadow-[color] → style={{filter: "drop-shadow(... [color])"}}
  - 3D transforms (rotate-x-*, rotate-y-*, scale-z-*, translate-z-*) → style={{transform: "rotateX(...)|rotateY(...)|scaleZ(...)|translateZ(...)"}}
  - Advanced gradients (bg-linear-[angle], bg-radial-[...]) → style={{background: "linear-gradient(...)|radial-gradient(...)"}}
  - REMOVE @container queries (@sm:, @lg:) - replace with regular responsive breakpoints (sm:, md:, lg:, xl:) or component-level logic

## Notes

- Call these functions directly in `code_execution` JavaScript.
- These are pre-registered callbacks available in the sandbox; no imports needed.
