import * as fs from 'fs';
import * as path from 'path';

import {
  SCENE_BACKGROUNDS,
  SCENE_BACKGROUND_ASPECT_RATIO,
  nextSceneBackgroundIndex,
  pickSceneBackgroundIndex,
} from '@/constants/scene-backgrounds';

describe('sceneBackgrounds', () => {
  describe('SCENE_BACKGROUNDS', () => {
    it('should expose five scenes', () => {
      expect(SCENE_BACKGROUNDS).toHaveLength(5);
    });

    it('should have an asset file behind every entry', () => {
      const sceneDir = path.resolve(__dirname, '../../assets/images/scene-backgrounds');

      SCENE_BACKGROUNDS.forEach((_, index) => {
        expect(fs.existsSync(path.join(sceneDir, `scene-${index + 1}.webp`))).toBe(true);
      });
    });

    it('should describe the source artwork as 3:4 portrait', () => {
      expect(SCENE_BACKGROUND_ASPECT_RATIO).toBeCloseTo(1086 / 1448, 5);
    });
  });

  describe('pickSceneBackgroundIndex', () => {
    it('should return an index inside the scene range', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);

      expect(pickSceneBackgroundIndex()).toBe(0);
    });

    it('should stay in range when random returns its upper bound', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.999999);

      expect(pickSceneBackgroundIndex()).toBe(SCENE_BACKGROUNDS.length - 1);
    });

    it.each([0, 1, 2, 3, 4])(
      'should never return %i again when it was the previous scene',
      (previousIndex) => {
        const drawn = [0, 0.25, 0.5, 0.75, 0.999999].map((value) => {
          jest.spyOn(Math, 'random').mockReturnValue(value);
          return pickSceneBackgroundIndex(previousIndex);
        });

        expect(drawn).not.toContain(previousIndex);
      },
    );

    it('should be able to reach every other scene', () => {
      const drawn = new Set(
        [0, 0.25, 0.5, 0.75, 0.999999].map((value) => {
          jest.spyOn(Math, 'random').mockReturnValue(value);
          return pickSceneBackgroundIndex(2);
        }),
      );

      expect(drawn).toEqual(new Set([0, 1, 3, 4]));
    });
  });

  describe('nextSceneBackgroundIndex', () => {
    it('should not repeat the scene it handed out last', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const first = nextSceneBackgroundIndex();

      jest.spyOn(Math, 'random').mockReturnValue(0);
      const second = nextSceneBackgroundIndex();

      expect(second).not.toBe(first);
    });
  });
});
