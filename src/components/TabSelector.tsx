import React from "react";
import { Box, Text } from "ink";
import type { AgentType } from "../lib/types";

interface TabSelectorProps {
  activeTab: AgentType;
  onTabChange: (tab: AgentType) => void;
}

export function TabSelector({ activeTab }: TabSelectorProps) {
  const tabs: { key: AgentType; label: string }[] = [
    { key: "claude-code", label: "Claude Code" },
    { key: "codex", label: "Codex" },
  ];

  return (
    <Box>
      {tabs.map((tab, index) => {
        const isActive = tab.key === activeTab;
        return (
          <Box key={tab.key}>
            {index > 0 && <Text> | </Text>}
            <Text
              bold={isActive}
              color={isActive ? "cyan" : "gray"}
              inverse={isActive}
            >
              {` ${tab.label} `}
            </Text>
          </Box>
        );
      })}
      <Text dimColor>  [TAB] to switch</Text>
    </Box>
  );
}
