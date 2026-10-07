export interface ReadingPlace {
  pageIndex: number;
  totalPages: number;
}

function readablePages(totalPages: number): number {
  return Math.max(totalPages - 1, 0);
}

export function readingFraction(place: ReadingPlace): number {
  const readable = readablePages(place.totalPages);
  if (readable === 0) return 0;
  return Math.min(Math.max(place.pageIndex / readable, 0), 1);
}

export interface ResumeOptions {
  skipCoverPage: boolean;
  savedPlace?: ReadingPlace;
  totalPages: number;
  startPage?: number;
}

export function resumePageIndex({ skipCoverPage, savedPlace, totalPages, startPage }: ResumeOptions): number {
  const lastIndex = readablePages(totalPages);
  if (lastIndex === 0 || !skipCoverPage) return 0;
  const from = startPage ?? savedPlace?.pageIndex ?? 0;
  return Math.min(from > 0 ? from : 1, lastIndex);
}
