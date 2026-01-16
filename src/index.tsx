#!/usr/bin/env bun
import { render } from "ink"
import { App } from "./App"

const subcommand = process.argv[2]

if (subcommand === "web") {
  // Web server mode
  const { startServer } = await import("./server")
  startServer()
} else {
  // TUI mode (default)
  render(<App />)
}
