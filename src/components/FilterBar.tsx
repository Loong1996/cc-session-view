import React from "react";
import { Box, Text } from "ink";
import type { FilterState, DateFilter } from "../lib/types";

interface FilterBarProps {
  filter: FilterState;
}

function formatDateFilter(filter: DateFilter): string {
  switch (filter) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "this-week":
      return "This Week";
    case "last-week":
      return "Last Week";
    case "this-month":
      return "This Month";
    case "all":
    default:
      return "All Time";
  }
}

export function FilterBar({ filter }: FilterBarProps) {
  const hasSearch = Boolean(filter.searchQuery.trim());
  const dateLabel = formatDateFilter(filter.dateFilter);
  const projectLabel = filter.projectPath ?? "All Projects";

  return (
    <Box flexDirection="column">
      <Text dimColor>
        Filter: {dateLabel} | Project: {projectLabel}
      </Text>
      {hasSearch && (
        <Text dimColor>
          Query: "{filter.searchQuery}"
        </Text>
      )}
    </Box>
  );
}
