type DateFilter = "today" | "yesterday" | "this-week" | "last-week" | "this-month" | "all"

interface Project {
  path: string
  count: number
}

interface SearchFilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  dateFilter: DateFilter
  onDateFilterChange: (filter: DateFilter) => void
  projects: Project[]
  projectFilter: string | null
  onProjectFilterChange: (project: string | null) => void
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  projects,
  projectFilter,
  onProjectFilterChange,
}: SearchFilterBarProps) {
  return (
    <div className="filters">
      <input
        type="text"
        className="search-input"
        placeholder="セッションを検索..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="filter-row">
        <select
          className="filter-select"
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value as DateFilter)}
        >
          <option value="all">すべての期間</option>
          <option value="today">今日</option>
          <option value="yesterday">昨日</option>
          <option value="this-week">今週</option>
          <option value="last-week">先週</option>
          <option value="this-month">今月</option>
        </select>
        <select
          className="filter-select"
          value={projectFilter || ""}
          onChange={(e) => onProjectFilterChange(e.target.value || null)}
        >
          <option value="">すべてのプロジェクト</option>
          {projects.map((project) => (
            <option key={project.path} value={project.path}>
              {shortenPath(project.path)} ({project.count})
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function shortenPath(path: string): string {
  const parts = path.split("/")
  if (parts.length <= 3) return path
  return `.../${parts.slice(-2).join("/")}`
}
