import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { SessionSummary } from "../lib/types";

interface SessionListProps {
  sessions: SessionSummary[];
  onSelect: (session: SessionSummary) => void;
  isActive: boolean;
}

export function SessionList({ sessions, onSelect, isActive }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <Box>
        <Text dimColor>No sessions found</Text>
      </Box>
    );
  }

  const items = sessions.map((session) => ({
    label: formatSessionLabel(session),
    value: session,
  }));

  return (
    <Box flexDirection="column">
      <SelectInput
        items={items}
        onSelect={(item) => onSelect(item.value)}
        isFocused={isActive}
        limit={15}
      />
    </Box>
  );
}

function formatSessionLabel(session: SessionSummary): string {
  const date = session.timestamp.toLocaleDateString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${session.title}`;
}
