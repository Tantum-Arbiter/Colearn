export interface WordPiece {
  text: string;
  sound: boolean;
}

export type StoryWord = WordPiece[];

export const SOUND_WORD_COLOR = '#A8431A';
export const SOUND_WORD_SCALE = 1.2;

const MARK = /\*([^*\s](?:[^*\n]*[^*\s])?)\*/g;
const SPACE = /^\s+$/;

function pieces(line: string): WordPiece[] {
  const found: WordPiece[] = [];
  let at = 0;
  for (let match = MARK.exec(line); match; match = MARK.exec(line)) {
    if (match.index > at) found.push({ text: line.slice(at, match.index), sound: false });
    found.push({ text: match[1], sound: true });
    at = match.index + match[0].length;
  }
  if (at < line.length) found.push({ text: line.slice(at), sound: false });
  return found;
}

export function storyWords(line: string): StoryWord[] {
  const words: StoryWord[] = [];
  let word: StoryWord = [];
  for (const piece of pieces(line)) {
    for (const part of piece.text.split(/(\s+)/)) {
      if (part === '') continue;
      if (SPACE.test(part)) {
        if (word.length) words.push(word);
        words.push([{ text: part, sound: false }]);
        word = [];
      } else {
        word.push({ text: part, sound: piece.sound });
      }
    }
  }
  if (word.length) words.push(word);
  return words;
}

export function wordText(word: StoryWord): string {
  return word.map((piece) => piece.text).join('');
}

export function isSpace(word: StoryWord): boolean {
  return SPACE.test(wordText(word));
}
