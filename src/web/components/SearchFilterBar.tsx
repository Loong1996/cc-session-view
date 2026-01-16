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
        placeholder="Search sessions..."
        value={searchQuery}
        onChange={(e) => onSearchChange((e.target as HTMLInputElement).value)}
      />
      <div className="filter-row">
        <select
          className="filter-select"
          value={dateFilter}
          onChange={(e) => onDateFilterChange((e.target as HTMLSelectElement).value as DateFilter)}
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="this-week">This week</option>
          <option value="last-week">Last week</option>
          <option value="this-month">This month</option>
        </select>
        <select
          className="filter-select"
          value={projectFilter || ""}
          onChange={(e) => onProjectFilterChange((e.target as HTMLSelectElement).value || null)}
        >
          <option value="">All projects</option>
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
