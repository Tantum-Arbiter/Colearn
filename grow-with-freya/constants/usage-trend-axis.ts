export const AXIS_LABEL_GAP = 10;

// deliberately generous. Over-estimating costs a label -- the cadence thins
// out by one step -- while under-estimating clips the text inside its own box,
// which is the defect this replaced dressed up as a different defect.
const NARROW_RATIO = 0.7;
const WIDE_RATIO = 1.05;

function isWide(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6)
  );
}

export function estimateTextWidth(text: string, fontSize: number): number {
  let units = 0;

  for (const character of text) {
    units += isWide(character.codePointAt(0) ?? 0) ? WIDE_RATIO : NARROW_RATIO;
  }

  return units * fontSize;
}

export function axisLabelEvery(
  count: number,
  chartWidth: number,
  labelWidth: number,
  gap: number = AXIS_LABEL_GAP
): number {
  if (count <= 0 || chartWidth <= 0 || labelWidth <= 0) {
    return 1;
  }

  const fit = Math.floor(chartWidth / (labelWidth + gap));

  return Math.max(1, Math.ceil(count / Math.max(fit, 1)));
}

export function axisLabelLeft(
  centre: number,
  labelWidth: number,
  chartWidth: number
): number {
  const furthest = Math.max(chartWidth - labelWidth, 0);

  return Math.min(Math.max(centre - labelWidth / 2, 0), furthest);
}
