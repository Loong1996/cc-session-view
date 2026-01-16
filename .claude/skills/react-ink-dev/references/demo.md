# Ink Demo Examples

## Basic Counter

```tsx
import React, { useState, useEffect } from 'react';
import { render, Text } from 'ink';

const Counter = () => {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter(prev => prev + 1);
    }, 100);

    return () => clearInterval(timer);
  }, []);

  return <Text color="green">{counter} tests passed</Text>;
};

render(<Counter />);
```

## Text Styling

```tsx
import { render, Text } from 'ink';

const TextStyles = () => (
  <>
    <Text color="green">I am green</Text>
    <Text color="black" backgroundColor="white">I am black on white</Text>
    <Text color="#ffffff">I am white (hex)</Text>
    <Text color="rgb(232, 131, 136)">I am red (rgb)</Text>
    <Text bold>I am bold</Text>
    <Text italic>I am italic</Text>
    <Text underline>I am underline</Text>
    <Text strikethrough>I am strikethrough</Text>
    <Text inverse>I am inversed</Text>
    <Text color="red" dimColor>I am dimmed red</Text>
  </>
);

render(<TextStyles />);
```

## Text Wrapping and Truncation

```tsx
import { render, Box, Text } from 'ink';

const TextWrap = () => (
  <Box flexDirection="column" width={20}>
    <Box borderStyle="single" marginBottom={1}>
      <Text>This text will wrap to multiple lines</Text>
    </Box>

    <Box borderStyle="single" marginBottom={1}>
      <Text wrap="truncate">This text will be truncated...</Text>
    </Box>

    <Box borderStyle="single" marginBottom={1}>
      <Text wrap="truncate-middle">This text truncates in the middle</Text>
    </Box>

    <Box borderStyle="single">
      <Text wrap="truncate-start">...This text truncates at start</Text>
    </Box>
  </Box>
);

render(<TextWrap />);
```

## Flexbox Layout

```tsx
import { render, Box, Text } from 'ink';

const FlexLayout = () => (
  <Box flexDirection="column" padding={1}>
    {/* Horizontal layout */}
    <Box marginBottom={1}>
      <Box marginRight={1}><Text>Left</Text></Box>
      <Text>Right</Text>
    </Box>

    {/* Justify content */}
    <Box justifyContent="space-between" width={40} marginBottom={1}>
      <Text>Start</Text>
      <Text>End</Text>
    </Box>

    {/* Align items */}
    <Box alignItems="center" height={3} borderStyle="single">
      <Text>Vertically centered</Text>
    </Box>
  </Box>
);

render(<FlexLayout />);
```

## Borders and Backgrounds

```tsx
import { render, Box, Text } from 'ink';

const Borders = () => (
  <Box flexDirection="column" gap={1}>
    <Box borderStyle="single" paddingX={1}>
      <Text>Single border</Text>
    </Box>

    <Box borderStyle="double" paddingX={1}>
      <Text>Double border</Text>
    </Box>

    <Box borderStyle="round" borderColor="green" paddingX={1}>
      <Text>Green rounded border</Text>
    </Box>

    <Box borderStyle="bold" borderColor="cyan" paddingX={1}>
      <Text>Cyan bold border</Text>
    </Box>

    <Box backgroundColor="blue" paddingX={1}>
      <Text>Blue background</Text>
    </Box>

    <Box backgroundColor="red" borderStyle="round" padding={1}>
      <Text>Red background with border</Text>
    </Box>
  </Box>
);

render(<Borders />);
```

## Spacer Component

```tsx
import { render, Box, Text, Spacer } from 'ink';

const SpacerDemo = () => (
  <Box flexDirection="column">
    {/* Horizontal spacer */}
    <Box width={40} borderStyle="single">
      <Text>Left</Text>
      <Spacer />
      <Text>Right</Text>
    </Box>

    {/* Vertical spacer */}
    <Box flexDirection="column" height={5} borderStyle="single">
      <Text>Top</Text>
      <Spacer />
      <Text>Bottom</Text>
    </Box>
  </Box>
);

render(<SpacerDemo />);
```

## User Input Handling

```tsx
import React, { useState } from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';

const InputDemo = () => {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'q') {
      exit();
    }

    if (key.leftArrow) setX(prev => prev - 1);
    if (key.rightArrow) setX(prev => prev + 1);
    if (key.upArrow) setY(prev => prev - 1);
    if (key.downArrow) setY(prev => prev + 1);
  });

  return (
    <Box flexDirection="column">
      <Text>Use arrow keys to move. Press 'q' to quit.</Text>
      <Text>Position: ({x}, {y})</Text>
    </Box>
  );
};

render(<InputDemo />);
```

## Focus Management

```tsx
import React from 'react';
import { render, Box, Text, useFocus } from 'ink';

const FocusableItem = ({ label }: { label: string }) => {
  const { isFocused } = useFocus();

  return (
    <Box borderStyle={isFocused ? 'double' : 'single'} paddingX={1}>
      <Text color={isFocused ? 'green' : undefined}>
        {isFocused ? '>' : ' '} {label}
      </Text>
    </Box>
  );
};

const FocusDemo = () => (
  <Box flexDirection="column" gap={1}>
    <Text dimColor>Press Tab to switch focus</Text>
    <FocusableItem label="Option 1" />
    <FocusableItem label="Option 2" />
    <FocusableItem label="Option 3" />
  </Box>
);

render(<FocusDemo />);
```

## Static Component (Logs/Completed Tasks)

```tsx
import React, { useState, useEffect } from 'react';
import { render, Static, Box, Text } from 'ink';

interface Task {
  id: number;
  title: string;
}

const StaticDemo = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    let count = 0;
    const timer = setInterval(() => {
      if (count++ < 5) {
        setTasks(prev => [
          ...prev,
          { id: prev.length, title: `Task #${prev.length + 1}` }
        ]);
      }
    }, 500);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Rendered once and stays at top */}
      <Static items={tasks}>
        {task => (
          <Box key={task.id}>
            <Text color="green">✔ {task.title}</Text>
          </Box>
        )}
      </Static>

      {/* Dynamic content below */}
      <Box marginTop={1}>
        <Text dimColor>Completed: {tasks.length}/5</Text>
      </Box>
    </>
  );
};

render(<StaticDemo />);
```

## Transform Component

```tsx
import { render, Transform, Text, Box } from 'ink';

const TransformDemo = () => (
  <Box flexDirection="column" gap={1}>
    {/* Uppercase transform */}
    <Transform transform={output => output.toUpperCase()}>
      <Text>hello world</Text>
    </Transform>

    {/* Add prefix to each line */}
    <Transform transform={(line, index) => `${index + 1}. ${line}`}>
      <Text>First line{'\n'}Second line{'\n'}Third line</Text>
    </Transform>

    {/* Hanging indent */}
    <Box width={30}>
      <Transform transform={(line, index) => index === 0 ? line : '    ' + line}>
        <Text>
          This is a long paragraph that will wrap to multiple lines and have
          a hanging indent applied to it.
        </Text>
      </Transform>
    </Box>
  </Box>
);

render(<TransformDemo />);
```

## Writing to stdout/stderr

```tsx
import React, { useEffect } from 'react';
import { render, Text, useStdout, useStderr } from 'ink';

const StreamDemo = () => {
  const { write: writeStdout } = useStdout();
  const { write: writeStderr } = useStderr();

  useEffect(() => {
    writeStdout('This goes to stdout\n');
    writeStderr('This goes to stderr\n');
  }, []);

  return <Text>Main Ink output</Text>;
};

render(<StreamDemo />);
```

## Measuring Elements

```tsx
import React, { useRef, useEffect, useState } from 'react';
import { render, Box, Text, measureElement } from 'ink';

const MeasureDemo = () => {
  const ref = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (ref.current) {
      setDimensions(measureElement(ref.current));
    }
  }, []);

  return (
    <Box flexDirection="column">
      <Box ref={ref} width={50} borderStyle="single" padding={1}>
        <Text>This box is being measured</Text>
      </Box>
      <Text dimColor>
        Dimensions: {dimensions.width}x{dimensions.height}
      </Text>
    </Box>
  );
};

render(<MeasureDemo />);
```

## Complete CLI App Example

```tsx
import React, { useState } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';

interface MenuItem {
  label: string;
  value: string;
}

const Menu = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();

  const items: MenuItem[] = [
    { label: 'Create new project', value: 'create' },
    { label: 'Open existing project', value: 'open' },
    { label: 'Settings', value: 'settings' },
    { label: 'Exit', value: 'exit' },
  ];

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(i => (i > 0 ? i - 1 : items.length - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(i => (i < items.length - 1 ? i + 1 : 0));
    }
    if (key.return) {
      if (items[selectedIndex].value === 'exit') {
        exit();
      }
    }
    if (input === 'q') {
      exit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">My CLI App</Text>
      </Box>

      {items.map((item, index) => (
        <Box key={item.value}>
          <Text color={index === selectedIndex ? 'green' : undefined}>
            {index === selectedIndex ? '❯ ' : '  '}
            {item.label}
          </Text>
        </Box>
      ))}

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>↑↓ Navigate • Enter Select • q Quit</Text>
      </Box>
    </Box>
  );
};

render(<Menu />);
```

## Progress Bar Example

```tsx
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';

const ProgressBar = ({ progress, width = 40 }: { progress: number; width?: number }) => {
  const filled = Math.round(width * progress);
  const empty = width - filled;

  return (
    <Box>
      <Text color="green">{'█'.repeat(filled)}</Text>
      <Text color="gray">{'░'.repeat(empty)}</Text>
      <Text> {Math.round(progress * 100)}%</Text>
    </Box>
  );
};

const ProgressDemo = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 1) {
          clearInterval(timer);
          return 1;
        }
        return p + 0.02;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Downloading...</Text>
      <ProgressBar progress={progress} />
      {progress >= 1 && <Text color="green">✔ Complete!</Text>}
    </Box>
  );
};

render(<ProgressDemo />);
```

## Screen Reader Accessible Component

```tsx
import React, { useState } from 'react';
import { render, Box, Text, useInput } from 'ink';

const AccessibleCheckbox = ({ label, checked, onToggle }: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) => {
  return (
    <Box
      aria-role="checkbox"
      aria-state={{ checked }}
      aria-label={`${label}: ${checked ? 'checked' : 'unchecked'}`}
    >
      <Text color={checked ? 'green' : 'gray'}>
        {checked ? '☑' : '☐'} {label}
      </Text>
    </Box>
  );
};

const AccessibleForm = () => {
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(false);

  useInput((input) => {
    if (input === '1') setAcceptTerms(v => !v);
    if (input === '2') setNewsletter(v => !v);
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Preferences</Text>
      <AccessibleCheckbox
        label="1. Accept terms and conditions"
        checked={acceptTerms}
        onToggle={() => setAcceptTerms(v => !v)}
      />
      <AccessibleCheckbox
        label="2. Subscribe to newsletter"
        checked={newsletter}
        onToggle={() => setNewsletter(v => !v)}
      />
      <Text dimColor>Press 1 or 2 to toggle</Text>
    </Box>
  );
};

render(<AccessibleForm />);
```

## Table Layout

```tsx
import { render, Box, Text } from 'ink';

interface Row {
  name: string;
  status: string;
  size: string;
}

const Table = ({ data }: { data: Row[] }) => {
  const columns = [
    { key: 'name', width: 20 },
    { key: 'status', width: 10 },
    { key: 'size', width: 10 },
  ] as const;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box borderStyle="single" borderBottom={false}>
        {columns.map(col => (
          <Box key={col.key} width={col.width} paddingX={1}>
            <Text bold>{col.key.toUpperCase()}</Text>
          </Box>
        ))}
      </Box>

      {/* Rows */}
      {data.map((row, i) => (
        <Box key={i} borderStyle="single" borderTop={false}>
          {columns.map(col => (
            <Box key={col.key} width={col.width} paddingX={1}>
              <Text>{row[col.key]}</Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
};

const TableDemo = () => (
  <Table
    data={[
      { name: 'package.json', status: 'modified', size: '1.2 KB' },
      { name: 'index.ts', status: 'new', size: '4.5 KB' },
      { name: 'README.md', status: 'unchanged', size: '2.1 KB' },
    ]}
  />
);

render(<TableDemo />);
```
