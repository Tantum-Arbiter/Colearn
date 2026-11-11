const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { validateLearningChallenges, loadCatalogue, challengePages } = require('./learning-challenges');

const FIXTURES = path.join(__dirname, '..', '..', 'contract-fixtures', 'stories');
const fox = () => JSON.parse(fs.readFileSync(path.join(FIXTURES, 'little-fox-meets-a-friend.json'), 'utf8'));
const catalogue = loadCatalogue();
const check = (story, options) => validateLearningChallenges(story, catalogue, options);

describe('the vendored catalogue', () => {
  test('is version 2 with ten families and sixty mechanics', () => {
    assert.equal(catalogue.version, 2);
    assert.equal(Object.keys(catalogue.families).length, 10);
    assert.equal(Object.keys(catalogue.mechanics).length, 60);
  });
});

describe('a well-formed book', () => {
  test('Little Fox passes with no errors', () => {
    const { errors } = check(fox());

    assert.deepEqual(errors, []);
  });

  test('page 4 asks what Finn should do and offers three pictured ways to help, each with its own response and three things to do, and two of them to the youngest band', () => {
    const challenge = fox().pages[3].learningChallenge;

    assert.deepEqual([challenge.mechanicId, challenge.adapter, challenge.target], ['E06', 'comfort_choice', '']);
    assert.equal(challenge.copy.title['2-4'].en, 'What should Finn do?');
    assert.deepEqual(challenge.items.map((item) => item.id), ['finn-says-sorry', 'finn-talks-softly', 'finn-stays-still']);
    assert.deepEqual(challenge.items.map((item) => item.label.en), ['Say sorry', 'Talk softly', 'Stay still']);
    assert.ok(challenge.items.every((item) => item.outcome.successLine['2-4'].en.length > 0));
    assert.ok(challenge.items.every((item) => item.outcome.tips.length === 3 && item.outcome.tips.every((tip) => tip['2-4'].en.length > 0)));
    assert.equal(challenge.stateAfter, undefined);
    assert.equal(challenge.byAge['1-2'].items.length, 2);
    assert.equal(challenge.target, '');
  });

  test('pages 8 and 11 offer three named choices, each with a heading and three things to do, and no after picture', () => {
    const story = fox();
    for (const index of [7, 10]) {
      const challenge = story.pages[index].learningChallenge;
      assert.equal(challenge.items.length, 3);
      assert.ok(challenge.items.every((item) => item.label.en.length <= 12), challenge.items.map((item) => item.label.en).join(', '));
      assert.ok(challenge.items.every((item) => /you can/.test(item.outcome.successLine['2-4'].en)));
      assert.ok(challenge.items.every((item) => item.outcome.tips.length === 3));
      assert.equal(challenge.stateAfter, undefined);
    }
  });

  test('its challenge pages are 4, 8 and 11', () => {
    assert.deepEqual(challengePages(fox()).map((page) => page.pageNumber), [4, 8, 11]);
  });

  test('a book with no challenges is left alone', () => {
    const plain = fox();
    plain.pages.forEach((page) => { delete page.learningChallenge; page.interactionType = 'none'; });

    assert.deepEqual(check(plain), { errors: [], warnings: [] });
  });

  test('missing art is a warning only when a story folder is given', () => {
    assert.equal(check(fox()).warnings.length, 0);
    const { warnings } = check(fox(), { storiesDir: path.join(__dirname, '..', 'cms-stories') });

    assert.ok(warnings.length >= 9);
    assert.match(warnings[0], /not in the story folder/);
  });

  test('a language the book has not been translated into is an error only when asked for', () => {
    assert.deepEqual(check(fox(), { languages: ['en'] }).errors, []);
    const { errors } = check(fox(), { languages: ['en', 'pl'] });

    assert.ok(errors.some((error) => /no pl text/.test(error)));
  });
});

const breakages = {
  'a fourth challenge in a 2-4 book': [(s) => { s.pages[13].interactionType = 'learning_challenge'; s.pages[13].learningChallenge = { ...s.pages[3].learningChallenge, mechanicId: 'E03', adapter: catalogue.mechanics.E03.adapter }; }, /carries 3 challenges, not 4/],
  'a challenge on the last page': [(s) => { s.pages[14].interactionType = 'learning_challenge'; s.pages[14].learningChallenge = s.pages[10].learningChallenge; s.pages[10].interactionType = 'none'; delete s.pages[10].learningChallenge; }, /first or last page/],
  'two challenges side by side': [(s) => { s.pages[4].interactionType = 'learning_challenge'; s.pages[4].learningChallenge = s.pages[7].learningChallenge; s.pages[7].interactionType = 'none'; delete s.pages[7].learningChallenge; }, /adjacent/],
  'two in one window': [(s) => { s.pages[9].interactionType = 'learning_challenge'; s.pages[9].learningChallenge = s.pages[3].learningChallenge; s.pages[3].interactionType = 'none'; delete s.pages[3].learningChallenge; }, /same 3-page window/],
  'the same mechanic twice': [(s) => { s.pages[7].learningChallenge.mechanicId = 'E06'; s.pages[7].learningChallenge.adapter = 'comfort_choice'; }, /already used on page 4/],
  'a mechanic the catalogue does not know': [(s) => { s.pages[3].learningChallenge.mechanicId = 'Z99'; }, /not in catalogue version 2/],
  'a family that disagrees with the catalogue': [(s) => { s.pages[3].learningChallenge.family = 'tap_scene'; }, /is a choose mechanic, not tap_scene/],
  'a wrong adapter': [(s) => { s.pages[3].learningChallenge.adapter = 'assign'; }, /adapter/],
  'a wrong assessment mode': [(s) => { s.pages[3].learningChallenge.assessmentMode = 'guided_observable'; }, /is exploratory_multiple_valid, not guided_observable/],
  'a wrong domain': [(s) => { s.pages[3].learningChallenge.domain = 'maths'; }, /belongs to social, not maths/],
  'too many items': [(s) => { const c = s.pages[3].learningChallenge; c.items = [...c.items, { id: 'x1', image: 'a', label: { en: 'x' } }, { id: 'x2', image: 'b', label: { en: 'y' } }]; }, /takes 2–3 items, not 5/],
  'a band with no items': [(s) => { s.pages[3].learningChallenge.byAge['1-2'].items = []; }, /no items for 1-2/],
  'a band naming an item that does not exist': [(s) => { s.pages[3].learningChallenge.byAge['4+'].items = ['nobody']; }, /unknown item "nobody"/],
  'a target on an open mechanic': [(s) => { s.pages[3].learningChallenge.target = 'finns-uncertain-face'; }, /open mechanic has no target/],
  'a guided mechanic without a target': [(s) => { const c = s.pages[3].learningChallenge; c.assessmentMode = 'guided_observable'; c.mechanicId = 'S05'; c.adapter = catalogue.mechanics.S05.adapter; c.domain = 'science'; }, /needs a target/],
  'skipping switched off': [(s) => { s.pages[3].learningChallenge.allowSkip = false; }, /allowSkip must be true/],
  'a skip line with no English': [(s) => { s.pages[3].learningChallenge.copy.onSkip = { '2-4': { pl: 'x' } }; }, /copy.onSkip has no en text for 2-4/],
  'no hints': [(s) => { s.pages[3].learningChallenge.copy.hints = []; }, /copy.hints is missing/],
  'an item without a label': [(s) => { delete s.pages[3].learningChallenge.items[0].label; }, /has no en label/],
  'a choice`s own line without English': [(s) => { s.pages[3].learningChallenge.items[0].outcome = { successLine: { '2-4': { pl: 'x' } } }; }, /outcome.successLine has no en text/],
  'a challenge page typed as plain': [(s) => { s.pages[3].interactionType = 'none'; }, /interactionType is "none"/],
  'a page typed as a challenge with nothing on it': [(s) => { delete s.pages[3].learningChallenge; }, /there is no learningChallenge/],
};

describe('a broken book is refused', () => {
  for (const [name, [breakIt, expected]] of Object.entries(breakages)) {
    test(name, () => {
      const story = fox();
      breakIt(story);

      const { errors } = check(story);

      assert.ok(errors.some((error) => expected.test(error)), `expected ${expected} in:\n${errors.join('\n')}`);
    });
  }
});

describe('a choice`s tips', () => {
  const withTips = (tips) => {
    const story = fox();
    story.pages[3].learningChallenge.items[0].outcome.tips = tips;
    return story;
  };
  const tip = (en) => ({ '2-4': { en } });

  test('one to three tips are fine', () => {
    assert.deepEqual(check(withTips([tip('Stay calm.')])).errors, []);
    assert.deepEqual(check(withTips([tip('a'), tip('b'), tip('c')])).errors, []);
  });

  test('more than three do not fit beside the picture', () => {
    const { errors } = check(withTips([tip('a'), tip('b'), tip('c'), tip('d')]));

    assert.ok(errors.some((error) => /item "finn-says-sorry" has 4 tips/.test(error)), errors.join('\n'));
  });

  test('an empty list is an error', () => {
    const { errors } = check(withTips([]));

    assert.ok(errors.some((error) => /item "finn-says-sorry" has 0 tips/.test(error)), errors.join('\n'));
  });

  test('each tip needs the book`s languages', () => {
    const { errors } = check(withTips([tip('Stay calm.'), { '2-4': { pl: 'Spokojnie.' } }]), { languages: ['en'] });

    assert.ok(errors.some((error) => /outcome\.tips\[1\]/.test(error) && /no en text/.test(error)), errors.join('\n'));
  });
});

describe('a choice`s own story text', () => {
  const withStory = (storyText) => {
    const story = fox();
    story.pages[3].learningChallenge.items[0].outcome.storyText = storyText;
    return story;
  };

  test('story text in the book`s languages is fine', () => {
    assert.deepEqual(check(withStory({ '2-4': { en: 'Finn said sorry.' } }), { languages: ['en'] }).errors, []);
  });

  test('story text missing a language is an error', () => {
    const { errors } = check(withStory({ '2-4': { pl: 'Finn przeprosił.' } }), { languages: ['en'] });

    assert.ok(errors.some((error) => /item "finn-says-sorry" outcome\.storyText/.test(error) && /no en text/.test(error)), errors.join('\n'));
  });

  test('empty story text is an error', () => {
    const { errors } = check(withStory({}), { languages: ['en'] });

    assert.ok(errors.some((error) => /outcome\.storyText is missing/.test(error)), errors.join('\n'));
  });
});

describe('pictures and hotspots by family', () => {
  const asCounting = () => {
    const story = fox();
    const challenge = story.pages[3].learningChallenge;
    Object.assign(challenge, { mechanicId: 'M01', family: 'tap_scene', adapter: 'multi_tap_count', assessmentMode: 'guided_observable', domain: 'maths', target: '' });
    challenge.items = challenge.items.map(({ image: _image, outcome: _outcome, ...item }, index) => ({ ...item, hotspot: { position: { x: 0.3 + index * 0.15, y: 0.3 }, size: { width: 0.1, height: 0.12 } } }));
    return story;
  };

  test('a counting scene with a hotspot on every item is fine', () => {
    assert.deepEqual(check(asCounting()).errors, []);
  });

  test('a choice needs its picture', () => {
    const story = fox();
    delete story.pages[3].learningChallenge.items[1].image;

    const { errors } = check(story);

    assert.ok(errors.some((error) => /page 4: item "finn-talks-softly" needs a picture/.test(error)), errors.join('\n'));
  });

  test('a spot in the scene needs a hotspot', () => {
    const story = asCounting();
    delete story.pages[3].learningChallenge.items[2].hotspot;

    const { errors } = check(story);

    assert.ok(errors.some((error) => /page 4: item "finn-stays-still" needs a hotspot/.test(error)), errors.join('\n'));
  });

  test('counting asks for every item, so it names no single target', () => {
    const story = asCounting();
    story.pages[3].learningChallenge.target = story.pages[3].learningChallenge.items[0].id;

    const { errors } = check(story);

    assert.ok(errors.some((error) => /page 4: M01 asks for every item, so it has no target/.test(error)), errors.join('\n'));
  });

  test('finding the one still needs its target', () => {
    const story = asCounting();
    Object.assign(story.pages[3].learningChallenge, { mechanicId: 'M08', adapter: 'small_set_choice' });
    story.pages[3].learningChallenge.items = story.pages[3].learningChallenge.items.slice(0, 2);
    for (const band of ['1-2', '2-4', '4+']) story.pages[3].learningChallenge.byAge[band].items = story.pages[3].learningChallenge.items.map((item) => item.id);

    const { errors } = check(story);

    assert.ok(errors.some((error) => /a guided mechanic needs a target among its items/.test(error)), errors.join('\n'));
  });

  test('a hotspot has to lie on the picture', () => {
    for (const hotspot of [
      { position: { x: -0.1, y: 0.3 }, size: { width: 0.1, height: 0.1 } },
      { position: { x: 0.95, y: 0.3 }, size: { width: 0.1, height: 0.1 } },
      { position: { x: 0.3, y: 0.95 }, size: { width: 0.1, height: 0.1 } },
      { position: { x: 0.3, y: 0.3 }, size: { width: 0, height: 0.1 } },
      { position: { x: 0.3, y: 0.3 } },
    ]) {
      const story = asCounting();
      story.pages[3].learningChallenge.items[0].hotspot = hotspot;

      const { errors } = check(story);

      assert.ok(errors.some((error) => /page 4: item "finn-says-sorry" hotspot is not on the picture/.test(error)), `${JSON.stringify(hotspot)}\n${errors.join('\n')}`);
    }
  });
});
