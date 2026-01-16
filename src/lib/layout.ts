import { useStdout } from "ink";
import { useMemo } from "react";

const MIN_PREVIEW_WIDTH = 100;
const MIN_PREVIEW_PANE = 32;

export function useLayout(previewEnabled: boolean, columnsOverride?: number) {
  const { stdout } = useStdout();
  const columns = columnsOverride ?? stdout?.columns ?? 80;

  return useMemo(() => {
    const showPreview = previewEnabled && columns >= MIN_PREVIEW_WIDTH;

    if (!showPreview) {
      return { showPreview: false, listWidth: columns, previewWidth: 0 };
    }

    const listWidth = Math.max(40, Math.floor(columns * 0.55));
    const previewWidth = Math.max(MIN_PREVIEW_PANE, columns - listWidth - 1);

    return { showPreview: true, listWidth, previewWidth };
  }, [columns, previewEnabled]);
}
