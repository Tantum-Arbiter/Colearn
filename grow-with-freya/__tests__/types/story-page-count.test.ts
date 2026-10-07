import { storyPageCount, Story } from '@/types/story';

const base: Story = { id: 's', title: 'S', category: 'bedtime', isAvailable: true } as Story;

describe('storyPageCount', () => {
  it.each([
    ['the pages on the device', { pages: [{}, {}, {}] as never, pageCount: 12 }, 3],
    ['the page count the catalogue sent', { pageCount: 12 }, 12],
    ['an older book\'s duration, which was always a page count', { duration: 9 }, 9],
    ['nothing when there is nothing to count', {}, undefined],
    ['nothing for an empty page list and no count', { pages: [] }, undefined],
  ] as const)('counts %s', (_label, fields, expected) => {
    expect(storyPageCount({ ...base, ...fields } as Story)).toBe(expected);
  });
});
