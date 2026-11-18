import { storyWords, wordText, type StoryWord } from '@/components/stories/sound-words';

const plain = (text: string): StoryWord => [{ text, sound: false }];
const sound = (text: string): StoryWord => [{ text, sound: true }];
const space: StoryWord = plain(' ');

describe('storyWords: a line of story text as words, with its sound words picked out', () => {
  it.each<[string, string, StoryWord[]]>([
    ['plain words stay plain', 'went the wind', [plain('went'), space, plain('the'), space, plain('wind')]],
    ['a marked word is a sound word, without its marks', '*Whoosh!* went', [sound('Whoosh!'), space, plain('went')]],
    ['punctuation outside the marks stays with the word but not the sound', 'went *pop*!', [plain('went'), space, [{ text: 'pop', sound: true }, { text: '!', sound: false }]]],
    ['a mark may hold several words', '*Tippy tap!* he went', [sound('Tippy'), space, sound('tap!'), space, plain('he'), space, plain('went')]],
    ['two marks on one line', '*wobble* and *bump!*', [sound('wobble'), space, plain('and'), space, sound('bump!')]],
    ['a lone asterisk is just an asterisk', '5 * 3', [plain('5'), space, plain('*'), space, plain('3')]],
    ['a mark must hug its words', 'a * b * c', [plain('a'), space, plain('*'), space, plain('b'), space, plain('*'), space, plain('c')]],
    ['two asterisks together mark nothing', 'stars ** here', [plain('stars'), space, plain('**'), space, plain('here')]],
    ['a mark left open is printed as written', '*Whoosh! went', [plain('*Whoosh!'), space, plain('went')]],
    ['a one-letter sound word', '*a*', [sound('a')]],
    ['runs of spaces are kept as written', 'a  b', [plain('a'), plain('  '), plain('b')]],
    ['an empty line has no words', '', []],
  ])('%s', (_, line, expected) => {
    expect(storyWords(line)).toEqual(expected);
  });

  it('reads back as the line without its marks', () => {
    expect(storyWords('But *wobble* and *bump!* went the light').map(wordText).join('')).toBe('But wobble and bump! went the light');
  });
});
