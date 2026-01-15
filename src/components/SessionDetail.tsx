import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { SessionDetail as SessionDetailType, ExportOptions } from "../lib/types";

interface SessionDetailProps {
  session: SessionDetailType;
  exportOptions: ExportOptions;
  onChangeOptions: (options: ExportOptions) => void;
  onBack: () => void;
  onExport: (format: "text" | "html") => void;
  onViewInBrowser: () => void;
}

type OptionKey = "includeUser" | "includeAssistant" | "includeToolUse" | "includeThinking";

const optionLabels: Record<OptionKey, string> = {
  includeUser: "User messages",
  includeAssistant: "Assistant messages",
  includeToolUse: "Tool use/result",
  includeThinking: "Thinking blocks",
};

const optionKeys: OptionKey[] = ["includeUser", "includeAssistant", "includeToolUse", "includeThinking"];

export function SessionDetail({ session, exportOptions, onChangeOptions, onBack, onExport, onViewInBrowser }: SessionDetailProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [optionIndex, setOptionIndex] = useState(0);

  useInput((input, key) => {
    if (showOptions) {
      // オプション設定モード
      if (key.escape || input === "o") {
        setShowOptions(false);
        return;
      }
      if (key.upArrow) {
        setOptionIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setOptionIndex((prev) => Math.min(optionKeys.length - 1, prev + 1));
        return;
      }
      if (key.return || input === " ") {
        const optKey = optionKeys[optionIndex];
        if (optKey) {
          onChangeOptions({
            ...exportOptions,
            [optKey]: !exportOptions[optKey],
          });
        }
        return;
      }
      return;
    }

    // 通常モード
    if (key.escape || input === "q") {
      onBack();
    }
    if (input === "t") {
      onExport("text");
    }
    if (input === "h") {
      onExport("html");
    }
    if (input === "v") {
      onViewInBrowser();
    }
    if (input === "o") {
      setShowOptions(true);
    }
  });

  const filteredMessages = session.messages.filter((msg) => {
    if (msg.type === "user" && !exportOptions.includeUser) return false;
    if (msg.type === "assistant" && !exportOptions.includeAssistant) return false;
    if ((msg.type === "tool_use" || msg.type === "tool_result") && !exportOptions.includeToolUse) return false;
    if (msg.type === "thinking" && !exportOptions.includeThinking) return false;
    return true;
  });

  return (
    <Box flexDirection="column">
      {/* メタ情報 */}
      <Box borderStyle="single" borderColor="gray" flexDirection="column" paddingX={1}>
        <Text bold color="cyan">Session Info</Text>
        <Text>
          <Text dimColor>ID: </Text>
          <Text>{session.id}</Text>
        </Text>
        <Text>
          <Text dimColor>Type: </Text>
          <Text>{session.agentType}</Text>
        </Text>
        <Text>
          <Text dimColor>Date: </Text>
          <Text>{session.timestamp.toLocaleString("ja-JP")}</Text>
        </Text>
        {session.cwd && (
          <Text>
            <Text dimColor>CWD: </Text>
            <Text>{session.cwd}</Text>
          </Text>
        )}
        {session.gitBranch && (
          <Text>
            <Text dimColor>Branch: </Text>
            <Text>{session.gitBranch}</Text>
          </Text>
        )}
        {session.version && (
          <Text>
            <Text dimColor>Version: </Text>
            <Text>{session.version}</Text>
          </Text>
        )}
        {session.model && (
          <Text>
            <Text dimColor>Model: </Text>
            <Text>{session.model}</Text>
          </Text>
        )}
      </Box>

      {/* オプション設定パネル */}
      {showOptions && (
        <Box borderStyle="round" borderColor="yellow" flexDirection="column" paddingX={1} marginY={1}>
          <Text bold color="yellow">Export Options</Text>
          <Text dimColor>[↑↓] Navigate  [Enter/Space] Toggle  [o/ESC] Close</Text>
          <Box flexDirection="column" marginTop={1}>
            {optionKeys.map((key, i) => (
              <Box key={key}>
                <Text color={i === optionIndex ? "cyan" : undefined}>
                  {i === optionIndex ? ">" : " "} [{exportOptions[key] ? "x" : " "}] {optionLabels[key]}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* 操作説明 */}
      <Box marginY={1}>
        <Text dimColor>[q/ESC] Back  [o] Options  [t] Text  [h] HTML  [v] View</Text>
      </Box>

      {/* 会話履歴 */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="cyan">Messages ({filteredMessages.length}/{session.messages.length})</Text>
        {filteredMessages.slice(0, 20).map((msg, i) => (
          <MessageItem key={i} message={msg} />
        ))}
        {filteredMessages.length > 20 && (
          <Text dimColor>... and {filteredMessages.length - 20} more messages</Text>
        )}
      </Box>
    </Box>
  );
}

interface MessageItemProps {
  message: {
    type: string;
    content: string;
    toolName?: string;
  };
}

function MessageItem({ message }: MessageItemProps) {
  const roleColors: Record<string, string> = {
    user: "green",
    assistant: "blue",
    tool_use: "yellow",
    tool_result: "magenta",
    thinking: "gray",
  };

  const roleLabels: Record<string, string> = {
    user: "USER",
    assistant: "ASST",
    tool_use: "TOOL",
    tool_result: "RESULT",
    thinking: "THINK",
  };

  const color = roleColors[message.type] || "white";
  const label = roleLabels[message.type] || message.type.toUpperCase();

  // コンテンツを短縮表示
  const shortContent = message.content
    .replace(/\n/g, " ")
    .slice(0, 80);

  return (
    <Box>
      <Box width={8}>
        <Text color={color} bold>[{label}]</Text>
      </Box>
      <Box flexShrink={1}>
        <Text wrap="truncate">
          {message.toolName && <Text dimColor>{message.toolName}: </Text>}
          {shortContent}
          {message.content.length > 80 && <Text dimColor>...</Text>}
        </Text>
      </Box>
    </Box>
  );
}
