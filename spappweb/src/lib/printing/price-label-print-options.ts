import {
  LABEL_GAP_MM,
  LABEL_HEIGHT_MM,
  LABEL_WIDTH_MM,
  ROW_HEIGHT_MM,
  ROW_WIDTH_MM,
} from "@/lib/printing/price-label";

export type PaperPreset = "row" | "single" | "custom";

export interface PriceLabelPrintOptions {
  preset: PaperPreset;
  pageWidthMm: number;
  pageHeightMm: number;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  slot: 0 | 1 | 2;
  offsetXmm: number;
  offsetYmm: number;
  contentScale: number;
  copies: number;
}

export const DEFAULT_PRINT_OPTIONS: PriceLabelPrintOptions = {
  preset: "row",
  pageWidthMm: ROW_WIDTH_MM,
  pageHeightMm: ROW_HEIGHT_MM,
  marginTopMm: 0,
  marginRightMm: 0,
  marginBottomMm: 0,
  marginLeftMm: 0,
  slot: 0,
  offsetXmm: 0,
  offsetYmm: 0,
  contentScale: 1,
  copies: 1,
};

export function applyPaperPreset(
  preset: PaperPreset,
  current: PriceLabelPrintOptions,
): PriceLabelPrintOptions {
  if (preset === "row") {
    return {
      ...current,
      preset,
      pageWidthMm: ROW_WIDTH_MM,
      pageHeightMm: ROW_HEIGHT_MM,
    };
  }
  if (preset === "single") {
    return {
      ...current,
      preset,
      pageWidthMm: LABEL_WIDTH_MM + LABEL_GAP_MM * 2,
      pageHeightMm: LABEL_HEIGHT_MM + LABEL_GAP_MM * 2,
      slot: 0,
    };
  }
  return { ...current, preset };
}

export function labelLeftMm(options: PriceLabelPrintOptions): number {
  if (options.preset === "single") {
    return options.marginLeftMm + options.offsetXmm + LABEL_GAP_MM;
  }
  const slotLeft =
    LABEL_GAP_MM + options.slot * (LABEL_WIDTH_MM + LABEL_GAP_MM);
  return options.marginLeftMm + options.offsetXmm + slotLeft;
}

export function labelTopMm(options: PriceLabelPrintOptions): number {
  return options.marginTopMm + options.offsetYmm + LABEL_GAP_MM;
}
