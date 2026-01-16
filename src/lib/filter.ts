import type { SessionSummary, FilterState, DateFilter } from "./types";

function getDateRange(filter: DateFilter): { start: Date; end: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "today":
      return { start: today, end: now };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    }
    case "this-week": {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { start: weekStart, end: now };
    }
    case "last-week": {
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay());
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      return { start: lastWeekStart, end: lastWeekEnd };
    }
    case "this-month": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart, end: now };
    }
    case "all":
    default:
      return null;
  }
}

export function filterSessions(sessions: SessionSummary[], filter: FilterState): SessionSummary[] {
  let result = sessions;

  if (filter.searchQuery.trim()) {
    const query = filter.searchQuery.toLowerCase();
    result = result.filter((session) => {
      const title = session.title.toLowerCase();
      const cwd = session.cwd?.toLowerCase() ?? "";
      const branch = session.gitBranch?.toLowerCase() ?? "";
      return title.includes(query) || cwd.includes(query) || branch.includes(query);
    });
  }

  const dateRange = getDateRange(filter.dateFilter);
  if (dateRange) {
    result = result.filter(
      (session) => session.timestamp >= dateRange.start && session.timestamp <= dateRange.end
    );
  }

  if (filter.projectPath) {
    result = result.filter((session) => session.cwd === filter.projectPath);
  }

  return result;
}

export function extractProjects(sessions: SessionSummary[]): { path: string; count: number }[] {
  const projectMap = new Map<string, number>();

  for (const session of sessions) {
    if (!session.cwd) continue;
    projectMap.set(session.cwd, (projectMap.get(session.cwd) || 0) + 1);
  }

  return Array.from(projectMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count);
}
