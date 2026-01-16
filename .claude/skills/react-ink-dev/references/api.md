# Ink API Reference

## Components

### `<Text>`

Display and style text. Only allows text nodes and nested `<Text>` components.

```tsx
import { Text } from 'ink';

<Text color="green">I am green</Text>
<Text bold>I am bold</Text>
<Text italic>I am italic</Text>
<Text underline>I am underlined</Text>
<Text strikethrough>I am strikethrough</Text>
<Text inverse>I am inversed</Text>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `string` | - | Text color (supports chalk colors, hex, rgb) |
| `backgroundColor` | `string` | - | Background color |
| `dimColor` | `boolean` | `false` | Dim the color |
| `bold` | `boolean` | `false` | Bold text |
| `italic` | `boolean` | `false` | Italic text |
| `underline` | `boolean` | `false` | Underlined text |
| `strikethrough` | `boolean` | `false` | Strikethrough text |
| `inverse` | `boolean` | `false` | Invert background/foreground |
| `wrap` | `string` | `wrap` | `wrap`, `truncate`, `truncate-start`, `truncate-middle`, `truncate-end` |

### `<Box>`

Flexbox container for layout. Like `<div style="display: flex">`.

```tsx
import { Box, Text } from 'ink';

<Box flexDirection="column" padding={1}>
  <Text>First line</Text>
  <Text>Second line</Text>
</Box>
```

#### Dimension Props

| Prop | Type | Description |
|------|------|-------------|
| `width` | `number \| string` | Width in spaces or percentage |
| `height` | `number \| string` | Height in lines or percentage |
| `minWidth` | `number` | Minimum width |
| `minHeight` | `number` | Minimum height |

#### Padding Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `padding` | `number` | `0` | All sides |
| `paddingX` | `number` | `0` | Left and right |
| `paddingY` | `number` | `0` | Top and bottom |
| `paddingTop` | `number` | `0` | Top only |
| `paddingBottom` | `number` | `0` | Bottom only |
| `paddingLeft` | `number` | `0` | Left only |
| `paddingRight` | `number` | `0` | Right only |

#### Margin Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `margin` | `number` | `0` | All sides |
| `marginX` | `number` | `0` | Left and right |
| `marginY` | `number` | `0` | Top and bottom |
| `marginTop` | `number` | `0` | Top only |
| `marginBottom` | `number` | `0` | Bottom only |
| `marginLeft` | `number` | `0` | Left only |
| `marginRight` | `number` | `0` | Right only |

#### Gap Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gap` | `number` | `0` | Gap between rows and columns |
| `columnGap` | `number` | `0` | Gap between columns |
| `rowGap` | `number` | `0` | Gap between rows |

#### Flexbox Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `flexDirection` | `string` | `row` | `row`, `row-reverse`, `column`, `column-reverse` |
| `flexGrow` | `number` | `0` | Flex grow factor |
| `flexShrink` | `number` | `1` | Flex shrink factor |
| `flexBasis` | `number \| string` | - | Initial main size |
| `flexWrap` | `string` | `nowrap` | `nowrap`, `wrap`, `wrap-reverse` |
| `alignItems` | `string` | - | `flex-start`, `center`, `flex-end` |
| `alignSelf` | `string` | `auto` | `auto`, `flex-start`, `center`, `flex-end` |
| `justifyContent` | `string` | - | `flex-start`, `center`, `flex-end`, `space-between`, `space-around`, `space-evenly` |

#### Visibility Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `display` | `string` | `flex` | `flex`, `none` |
| `overflow` | `string` | `visible` | `visible`, `hidden` |
| `overflowX` | `string` | `visible` | Horizontal overflow |
| `overflowY` | `string` | `visible` | Vertical overflow |

#### Border Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `borderStyle` | `string \| object` | - | `single`, `double`, `round`, `bold`, `singleDouble`, `doubleSingle`, `classic` |
| `borderColor` | `string` | - | Border color (all sides) |
| `borderTopColor` | `string` | - | Top border color |
| `borderRightColor` | `string` | - | Right border color |
| `borderBottomColor` | `string` | - | Bottom border color |
| `borderLeftColor` | `string` | - | Left border color |
| `borderDimColor` | `boolean` | `false` | Dim border (all sides) |
| `borderTop` | `boolean` | `true` | Show top border |
| `borderRight` | `boolean` | `true` | Show right border |
| `borderBottom` | `boolean` | `true` | Show bottom border |
| `borderLeft` | `boolean` | `true` | Show left border |

#### Background Props

| Prop | Type | Description |
|------|------|-------------|
| `backgroundColor` | `string` | Background color for the entire box |

### `<Newline>`

Add newlines within `<Text>` components.

```tsx
<Text>
  First line
  <Newline />
  Second line
</Text>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `count` | `number` | `1` | Number of newlines |

### `<Spacer>`

Flexible space that expands along the major axis.

```tsx
<Box>
  <Text>Left</Text>
  <Spacer />
  <Text>Right</Text>
</Box>
```

### `<Static>`

Render permanent output above dynamic content. Items are rendered once and not re-rendered.

```tsx
<Static items={completedTasks}>
  {task => (
    <Box key={task.id}>
      <Text color="green">✔ {task.title}</Text>
    </Box>
  )}
</Static>
```

| Prop | Type | Description |
|------|------|-------------|
| `items` | `Array` | Items to render |
| `style` | `object` | Container styles (Box props) |
| `children` | `(item, index) => ReactNode` | Render function |

### `<Transform>`

Transform string output before rendering.

```tsx
<Transform transform={output => output.toUpperCase()}>
  <Text>Hello World</Text>
</Transform>
// Output: HELLO WORLD
```

| Prop | Type | Description |
|------|------|-------------|
| `transform` | `(line: string, index: number) => string` | Transform function |

---

## Hooks

### `useInput(handler, options?)`

Handle keyboard input.

```tsx
import { useInput } from 'ink';

useInput((input, key) => {
  if (input === 'q') {
    // Exit
  }
  if (key.leftArrow) {
    // Left arrow pressed
  }
});
```

#### Handler Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `string` | The input character(s) |
| `key` | `object` | Key information object |

#### Key Object Properties

| Property | Type | Description |
|----------|------|-------------|
| `leftArrow` | `boolean` | Left arrow pressed |
| `rightArrow` | `boolean` | Right arrow pressed |
| `upArrow` | `boolean` | Up arrow pressed |
| `downArrow` | `boolean` | Down arrow pressed |
| `return` | `boolean` | Enter/Return pressed |
| `escape` | `boolean` | Escape pressed |
| `ctrl` | `boolean` | Ctrl held |
| `shift` | `boolean` | Shift held |
| `tab` | `boolean` | Tab pressed |
| `backspace` | `boolean` | Backspace pressed |
| `delete` | `boolean` | Delete pressed |
| `pageUp` | `boolean` | Page Up pressed |
| `pageDown` | `boolean` | Page Down pressed |
| `meta` | `boolean` | Meta key held |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `isActive` | `boolean` | `true` | Enable/disable input capture |

### `useApp()`

Access app-level methods.

```tsx
import { useApp } from 'ink';

const { exit } = useApp();

// Exit the app
exit();

// Exit with error
exit(new Error('Something went wrong'));
```

### `useStdin()`

Access stdin stream.

```tsx
import { useStdin } from 'ink';

const { stdin, isRawModeSupported, setRawMode } = useStdin();
```

| Property | Type | Description |
|----------|------|-------------|
| `stdin` | `stream.Readable` | Stdin stream |
| `isRawModeSupported` | `boolean` | Raw mode support |
| `setRawMode` | `(enabled: boolean) => void` | Set raw mode |

### `useStdout()`

Access stdout stream.

```tsx
import { useStdout } from 'ink';

const { stdout, write } = useStdout();

// Write to stdout (bypassing Ink)
write('Hello from stdout\n');
```

### `useStderr()`

Access stderr stream.

```tsx
import { useStderr } from 'ink';

const { stderr, write } = useStderr();

// Write to stderr
write('Error message\n');
```

### `useFocus(options?)`

Make a component focusable.

```tsx
import { useFocus, Text } from 'ink';

const { isFocused } = useFocus();

return <Text>{isFocused ? 'Focused' : 'Not focused'}</Text>;
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoFocus` | `boolean` | `false` | Auto-focus if no active component |
| `isActive` | `boolean` | `true` | Enable/disable focus |
| `id` | `string` | - | Focus ID for programmatic focus |

### `useFocusManager()`

Control focus management.

```tsx
import { useFocusManager } from 'ink';

const { enableFocus, disableFocus, focusNext, focusPrevious, focus } = useFocusManager();

// Switch to next focusable component
focusNext();

// Switch to previous
focusPrevious();

// Focus specific component by ID
focus('myComponentId');
```

### `useIsScreenReaderEnabled()`

Check if screen reader is enabled.

```tsx
import { useIsScreenReaderEnabled } from 'ink';

const isScreenReaderEnabled = useIsScreenReaderEnabled();
```

---

## render() API

```tsx
import { render } from 'ink';

const { rerender, unmount, waitUntilExit, clear } = render(<App />);
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stdout` | `stream.Writable` | `process.stdout` | Output stream |
| `stdin` | `stream.Readable` | `process.stdin` | Input stream |
| `stderr` | `stream.Writable` | `process.stderr` | Error stream |
| `exitOnCtrlC` | `boolean` | `true` | Exit on Ctrl+C |
| `patchConsole` | `boolean` | `true` | Patch console methods |
| `debug` | `boolean` | `false` | Debug mode (no output replacement) |
| `maxFps` | `number` | `30` | Maximum render FPS |
| `incrementalRendering` | `boolean` | `false` | Only update changed lines |

### Instance Methods

| Method | Description |
|--------|-------------|
| `rerender(tree)` | Update the rendered tree |
| `unmount()` | Unmount the app |
| `waitUntilExit()` | Promise that resolves on unmount |
| `clear()` | Clear output |

---

## measureElement(ref)

Measure a `<Box>` element's dimensions.

```tsx
import { measureElement, Box, Text } from 'ink';
import { useRef, useEffect } from 'react';

const Example = () => {
  const ref = useRef();

  useEffect(() => {
    const { width, height } = measureElement(ref.current);
    console.log(`Width: ${width}, Height: ${height}`);
  }, []);

  return (
    <Box ref={ref} width={100}>
      <Text>Content</Text>
    </Box>
  );
};
```

---

## Screen Reader Support (ARIA)

### ARIA Props

| Prop | Type | Description |
|------|------|-------------|
| `aria-label` | `string` | Label for screen readers |
| `aria-hidden` | `boolean` | Hide from screen readers |
| `aria-role` | `string` | Element role |
| `aria-state` | `object` | Element state |

### Supported Roles

`button`, `checkbox`, `radio`, `radiogroup`, `list`, `listitem`, `menu`, `menuitem`, `progressbar`, `tab`, `tablist`, `timer`, `toolbar`, `table`

### Supported States

- `checked` (boolean)
- `disabled` (boolean)
- `expanded` (boolean)
- `selected` (boolean)

```tsx
<Box aria-role="checkbox" aria-state={{ checked: true }}>
  <Text>Accept terms</Text>
</Box>
// Screen reader output: (checked) checkbox: Accept terms
```
