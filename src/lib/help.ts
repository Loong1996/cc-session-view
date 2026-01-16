export interface KeyBinding {
  key: string
  description: string
}

export interface HelpSection {
  title: string
  bindings: KeyBinding[]
}

export interface HelpData {
  sections: HelpSection[]
}

export const listViewHelp: HelpData = {
  sections: [
    {
      title: "Navigation",
      bindings: [
        { key: "Up / k", description: "Move up" },
        { key: "Down / j", description: "Move down" },
        { key: "Tab", description: "Switch tab" },
        { key: "PgUp", description: "Page up" },
        { key: "PgDn", description: "Page down" },
        { key: "g / Home", description: "Go to top" },
        { key: "G / End", description: "Go to bottom" },
      ],
    },
    {
      title: "Search & Filter",
      bindings: [
        { key: "/", description: "Search" },
        { key: "d", description: "Date filter" },
        { key: "p", description: "Project filter" },
        { key: "Ctrl+L", description: "Clear filters" },
      ],
    },
    {
      title: "Actions",
      bindings: [
        { key: "Enter", description: "Select/Open" },
        { key: "q / ESC", description: "Quit" },
        { key: "?", description: "Toggle help" },
        { key: "Shift+P", description: "Toggle preview" },
      ],
    },
  ],
}

export const detailViewHelp: HelpData = {
  sections: [
    {
      title: "Navigation",
      bindings: [
        { key: "Up / k", description: "Scroll up" },
        { key: "Down / j", description: "Scroll down" },
        { key: "PgUp / Ctrl+U", description: "Page up" },
        { key: "PgDn / Ctrl+D", description: "Page down" },
        { key: "g / Home", description: "Go to top" },
        { key: "G / End", description: "Go to bottom" },
      ],
    },
    {
      title: "Export",
      bindings: [
        { key: "t", description: "Export as text" },
        { key: "h", description: "Export as HTML" },
        { key: "v", description: "View in browser" },
        { key: "o", description: "Export options" },
      ],
    },
    {
      title: "Actions",
      bindings: [
        { key: "q / ESC", description: "Back to list" },
        { key: "?", description: "Toggle help" },
      ],
    },
  ],
}

export function getFooterHint(viewMode: "list" | "detail"): string {
  if (viewMode === "list") {
    return "[Up/Down] Navigate  [Enter] Select  [TAB] Switch  [/] Search  [?] Help  [q] Quit"
  }
  return "[j/k] Scroll  [q] Back  [o] Options  [t] Text  [h] HTML  [v] View  [?] Help"
}
