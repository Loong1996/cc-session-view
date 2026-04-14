// Read styles.css and produce a version suitable for embedding in standalone HTML exports.
// The web app CSS is the single source of truth for all message styling.

import webStyles from "../web/styles.css" with { type: "text" }

// Export-specific overrides: undo the SPA body constraints.
const EXPORT_OVERRIDES = `
/* === Export overrides === */
body {
  height: auto;
  min-height: 100vh;
  overflow: auto;
}
`

export const exportStyles: string = webStyles + EXPORT_OVERRIDES
