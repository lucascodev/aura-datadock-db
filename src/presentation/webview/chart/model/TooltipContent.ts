interface TooltipLine {
  readonly label: string;
  readonly value: string;
  readonly color?: string;
}

export interface TooltipContent {
  readonly title?: string;
  readonly lines: readonly TooltipLine[];
}
