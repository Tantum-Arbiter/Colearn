export function rgba(red: number, green: number, blue: number, alpha: number): string {
  'worklet';
  const bounded = alpha > 0 ? Math.min(1, alpha) : 0;
  return `rgba(${red}, ${green}, ${blue}, ${Math.floor(bounded * 1000) / 1000})`;
}
