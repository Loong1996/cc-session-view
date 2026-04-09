import { useEffect, useState } from "react"

interface ExportAllResult {
  directory: string
  totalCount: number
  exportedCount: number
  errors: Array<{ sessionId: string; error: string }>
}

interface ExportAllBarProps {
  onExportAll: (format: "html" | "text" | "markdown") => void
  status: "idle" | "loading" | "success" | "error"
  result: ExportAllResult | null
}

export function ExportAllBar({ onExportAll, status, result }: ExportAllBarProps) {
  const [format, setFormat] = useState<"html" | "text" | "markdown">("markdown")
  const [showResult, setShowResult] = useState(false)

  // Show result when status changes to success/error, auto-dismiss after 15s
  useEffect(() => {
    if (status === "success" || status === "error") {
      setShowResult(true)
      const timer = setTimeout(() => setShowResult(false), 15000)
      return () => clearTimeout(timer)
    }
  }, [status])

  return (
    <div className="export-all-bar">
      <div className="export-all-row">
        <select
          className="filter-select"
          value={format}
          onChange={(e) => setFormat(e.target.value as "html" | "text" | "markdown")}
          disabled={status === "loading"}
        >
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="text">Text</option>
        </select>
        <button
          type="button"
          className="action-btn"
          onClick={() => onExportAll(format)}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Exporting..." : "Export All"}
        </button>
      </div>

      {showResult && status === "success" && result && (
        <div className="export-all-result success">
          <div>
            Exported {result.exportedCount}/{result.totalCount} sessions
          </div>
          <code className="export-all-path">{result.directory}</code>
          {result.errors.length > 0 && (
            <div className="export-all-warning">{result.errors.length} failed</div>
          )}
        </div>
      )}

      {showResult && status === "error" && (
        <div className="export-all-result error">Export failed. Please try again.</div>
      )}
    </div>
  )
}
