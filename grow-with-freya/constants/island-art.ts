// Written by scripts/prepare-island-art.py. Change the script, not this file.
import type { ImageSourcePropType } from 'react-native';

export interface ArtFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface IslandCloudArt {
  readonly id: string;
  readonly source: ImageSourcePropType;
  readonly frame: ArtFrame;
  readonly reach: number;
  readonly beats: number;
  readonly lag: number;
}

export interface IslandBillowArt {
  readonly id: string;
  readonly source: ImageSourcePropType;
  readonly frame: ArtFrame;
  readonly anchorX: 0 | 1;
  readonly anchorY: 0 | 1;
}

export interface IslandTreeArt {
  readonly id: string;
  readonly source: ImageSourcePropType;
  readonly frame: ArtFrame;
  readonly pivotX: number;
  readonly pivotY: number;
  readonly sway: number;
}

export interface IslandFallArt {
  readonly id: string;
  readonly streaks: ImageSourcePropType;
  readonly cover: ImageSourcePropType;
  readonly frame: ArtFrame;
  readonly tile: number;
  readonly sprayX: number;
  readonly sprayY: number;
  readonly spraySize: number;
}

export interface IslandPoolArt {
  readonly id: string;
  readonly cover: ImageSourcePropType;
  readonly frame: ArtFrame;
  readonly ringX: number;
  readonly ringY: number;
  readonly ringWidth: number;
}

export interface IslandSheetArt {
  readonly id: string;
  readonly source: ImageSourcePropType;
  readonly frame: ArtFrame;
}

export interface IslandLampArt {
  readonly x: number;
  readonly y: number;
  readonly glow: ImageSourcePropType;
  readonly glowSize: number;
  readonly beam: ImageSourcePropType;
  readonly beamLength: number;
  readonly beamHeight: number;
  readonly pulse: ImageSourcePropType;
  readonly pulseSize: number;
}

export interface IslandArt {
  readonly picture: ImageSourcePropType;
  readonly horizon: ImageSourcePropType;
  readonly width: number;
  readonly height: number;
  readonly bandTop: number;
  readonly bandBottom: number;
  readonly seaLine: number;
  readonly sunX: number;
  readonly faceFloor: number;
  readonly farClouds: readonly IslandCloudArt[];
  readonly nearClouds: readonly IslandCloudArt[];
  readonly billows: readonly IslandBillowArt[];
  readonly lowTrees: readonly IslandTreeArt[];
  readonly horizonTrees: readonly IslandTreeArt[];
  readonly water: readonly ImageSourcePropType[];
  readonly falls: readonly IslandFallArt[];
  readonly spray: ImageSourcePropType;
  readonly pools: readonly IslandPoolArt[];
  readonly ring: ImageSourcePropType;
  readonly ringAspect: number;
  readonly litWindows: IslandSheetArt;
  readonly villageLamps: readonly IslandSheetArt[];
  readonly lighthouse: IslandLampArt;
}

export const ISLAND_ART: IslandArt = {
  picture: require('@/assets/images/island/island-base.webp'),
  horizon: require('@/assets/images/island/island-land.webp'),
  width: 1122,
  height: 1402,
  bandTop: 226,
  bandBottom: 492,
  seaLine: 398,
  sunX: 620,
  faceFloor: 357,
  farClouds: [
    { id: 'island-cloud-left', source: require('@/assets/images/island/island-cloud-left.webp'), frame: { x: 0, y: 15, width: 234, height: 404 }, reach: -12, beats: 3, lag: 0.15 },
    { id: 'island-cloud-right', source: require('@/assets/images/island/island-cloud-right.webp'), frame: { x: 904, y: 40, width: 218, height: 261 }, reach: 12, beats: 2, lag: 0.55 },
  ],
  nearClouds: [
    { id: 'island-cloud-horizon', source: require('@/assets/images/island/island-cloud-horizon.webp'), frame: { x: 505, y: 299, width: 617, height: 146 }, reach: 7, beats: 2, lag: 0.0 },
  ],
  billows: [
    { id: 'island-billow-low-left', source: require('@/assets/images/island/island-billow-low-left.webp'), frame: { x: 0, y: 1237, width: 312, height: 165 }, anchorX: 0, anchorY: 1 },
    { id: 'island-billow-low-right', source: require('@/assets/images/island/island-billow-low-right.webp'), frame: { x: 958, y: 1256, width: 164, height: 146 }, anchorX: 1, anchorY: 1 },
  ],
  lowTrees: [
    { id: 'island-tree-11', source: require('@/assets/images/island/island-tree-11.webp'), frame: { x: 780, y: 695, width: 40, height: 71 }, pivotX: 800, pivotY: 768, sway: 3.2 },
    { id: 'island-tree-12', source: require('@/assets/images/island/island-tree-12.webp'), frame: { x: 850, y: 725, width: 48, height: 75 }, pivotX: 874, pivotY: 802, sway: 3.2 },
    { id: 'island-tree-13', source: require('@/assets/images/island/island-tree-13.webp'), frame: { x: 274, y: 874, width: 74, height: 65 }, pivotX: 305, pivotY: 925, sway: 5.5 },
    { id: 'island-tree-14', source: require('@/assets/images/island/island-tree-14.webp'), frame: { x: 908, y: 770, width: 54, height: 46 }, pivotX: 935, pivotY: 808, sway: 5.5 },
    { id: 'island-tree-15', source: require('@/assets/images/island/island-tree-15.webp'), frame: { x: 36, y: 960, width: 112, height: 102 }, pivotX: 95, pivotY: 1035, sway: 5.5 },
    { id: 'island-tree-16', source: require('@/assets/images/island/island-tree-16.webp'), frame: { x: 122, y: 1049, width: 81, height: 79 }, pivotX: 160, pivotY: 1100, sway: 5.5 },
    { id: 'island-tree-17', source: require('@/assets/images/island/island-tree-17.webp'), frame: { x: 188, y: 1121, width: 74, height: 69 }, pivotX: 225, pivotY: 1165, sway: 5.5 },
    { id: 'island-tree-18', source: require('@/assets/images/island/island-tree-18.webp'), frame: { x: 253, y: 1190, width: 73, height: 70 }, pivotX: 285, pivotY: 1235, sway: 5.5 },
    { id: 'island-tree-19', source: require('@/assets/images/island/island-tree-19.webp'), frame: { x: 311, y: 1240, width: 81, height: 65 }, pivotX: 345, pivotY: 1280, sway: 5.5 },
    { id: 'island-tree-20', source: require('@/assets/images/island/island-tree-20.webp'), frame: { x: 420, y: 1104, width: 82, height: 61 }, pivotX: 460, pivotY: 1145, sway: 5.5 },
    { id: 'island-tree-21', source: require('@/assets/images/island/island-tree-21.webp'), frame: { x: 690, y: 1058, width: 72, height: 54 }, pivotX: 725, pivotY: 1100, sway: 5.5 },
    { id: 'island-tree-22', source: require('@/assets/images/island/island-tree-22.webp'), frame: { x: 755, y: 1052, width: 50, height: 43 }, pivotX: 782, pivotY: 1085, sway: 5.5 },
    { id: 'island-tree-23', source: require('@/assets/images/island/island-tree-23.webp'), frame: { x: 812, y: 1070, width: 40, height: 30 }, pivotX: 832, pivotY: 1094, sway: 5.5 },
    { id: 'island-tree-24', source: require('@/assets/images/island/island-tree-24.webp'), frame: { x: 640, y: 1110, width: 54, height: 40 }, pivotX: 668, pivotY: 1142, sway: 5.5 },
    { id: 'island-tree-25', source: require('@/assets/images/island/island-tree-25.webp'), frame: { x: 912, y: 1125, width: 48, height: 35 }, pivotX: 935, pivotY: 1150, sway: 5.5 },
    { id: 'island-tree-26', source: require('@/assets/images/island/island-tree-26.webp'), frame: { x: 985, y: 951, width: 45, height: 39 }, pivotX: 1008, pivotY: 982, sway: 5.5 },
    { id: 'island-tree-27', source: require('@/assets/images/island/island-tree-27.webp'), frame: { x: 1035, y: 958, width: 65, height: 57 }, pivotX: 1070, pivotY: 1004, sway: 5.5 },
  ],
  horizonTrees: [
    { id: 'island-tree-01', source: require('@/assets/images/island/island-tree-01.webp'), frame: { x: 562, y: 355, width: 52, height: 75 }, pivotX: 588, pivotY: 432, sway: 3.2 },
    { id: 'island-tree-02', source: require('@/assets/images/island/island-tree-02.webp'), frame: { x: 604, y: 371, width: 42, height: 63 }, pivotX: 625, pivotY: 436, sway: 3.2 },
    { id: 'island-tree-03', source: require('@/assets/images/island/island-tree-03.webp'), frame: { x: 506, y: 380, width: 27, height: 55 }, pivotX: 515, pivotY: 436, sway: 3.2 },
    { id: 'island-tree-04', source: require('@/assets/images/island/island-tree-04.webp'), frame: { x: 536, y: 397, width: 30, height: 38 }, pivotX: 551, pivotY: 436, sway: 3.2 },
    { id: 'island-tree-05', source: require('@/assets/images/island/island-tree-05.webp'), frame: { x: 656, y: 395, width: 24, height: 50 }, pivotX: 661, pivotY: 446, sway: 3.2 },
    { id: 'island-tree-06', source: require('@/assets/images/island/island-tree-06.webp'), frame: { x: 754, y: 427, width: 28, height: 52 }, pivotX: 763, pivotY: 480, sway: 3.2 },
    { id: 'island-tree-07', source: require('@/assets/images/island/island-tree-07.webp'), frame: { x: 113, y: 300, width: 49, height: 97 }, pivotX: 131, pivotY: 400, sway: 3.2 },
    { id: 'island-tree-08', source: require('@/assets/images/island/island-tree-08.webp'), frame: { x: 61, y: 329, width: 31, height: 61 }, pivotX: 71, pivotY: 400, sway: 3.2 },
    { id: 'island-tree-09', source: require('@/assets/images/island/island-tree-09.webp'), frame: { x: 172, y: 363, width: 25, height: 36 }, pivotX: 178, pivotY: 402, sway: 3.2 },
    { id: 'island-tree-10', source: require('@/assets/images/island/island-tree-10.webp'), frame: { x: 912, y: 372, width: 25, height: 37 }, pivotX: 921, pivotY: 410, sway: 3.2 },
  ],
  water: [
    require('@/assets/images/island/island-water-1.webp'),
    require('@/assets/images/island/island-water-2.webp'),
    require('@/assets/images/island/island-water-3.webp'),
  ],
  falls: [
    { id: 'island-fall-1', streaks: require('@/assets/images/island/island-fall-1-streaks.webp'), cover: require('@/assets/images/island/island-fall-1-cover.webp'), frame: { x: 96, y: 798, width: 66, height: 88 }, tile: 48, sprayX: 160, sprayY: 886, spraySize: 56 },
    { id: 'island-fall-2', streaks: require('@/assets/images/island/island-fall-2-streaks.webp'), cover: require('@/assets/images/island/island-fall-2-cover.webp'), frame: { x: 258, y: 1076, width: 58, height: 88 }, tile: 48, sprayX: 288, sprayY: 1168, spraySize: 66 },
    { id: 'island-fall-3', streaks: require('@/assets/images/island/island-fall-3-streaks.webp'), cover: require('@/assets/images/island/island-fall-3-cover.webp'), frame: { x: 232, y: 998, width: 62, height: 42 }, tile: 48, sprayX: 262, sprayY: 1042, spraySize: 50 },
  ],
  spray: require('@/assets/images/island/island-spray.webp'),
  pools: [
    { id: 'island-pool-1', cover: require('@/assets/images/island/island-pool-1-cover.webp'), frame: { x: 148, y: 876, width: 156, height: 92 }, ringX: 188, ringY: 906, ringWidth: 104 },
    { id: 'island-pool-2', cover: require('@/assets/images/island/island-pool-2-cover.webp'), frame: { x: 234, y: 1032, width: 68, height: 52 }, ringX: 266, ringY: 1052, ringWidth: 58 },
    { id: 'island-pool-3', cover: require('@/assets/images/island/island-pool-3-cover.webp'), frame: { x: 258, y: 1148, width: 178, height: 104 }, ringX: 350, ringY: 1208, ringWidth: 132 },
  ],
  ring: require('@/assets/images/island/island-ring.webp'),
  ringAspect: 2.2069,
  litWindows: { id: 'island-lit-windows', source: require('@/assets/images/island/island-lit-windows.webp'), frame: { x: 556, y: 556, width: 496, height: 626 } },
  villageLamps: [
    { id: 'island-lit-village-1', source: require('@/assets/images/island/island-lit-village-1.webp'), frame: { x: 193, y: 592, width: 867, height: 603 } },
    { id: 'island-lit-village-2', source: require('@/assets/images/island/island-lit-village-2.webp'), frame: { x: 210, y: 591, width: 524, height: 602 } },
  ],
  lighthouse: {
    x: 996,
    y: 568,
    glow: require('@/assets/images/island/island-lamp-glow.webp'),
    glowSize: 76,
    beam: require('@/assets/images/island/island-lamp-beam.webp'),
    beamLength: 380,
    beamHeight: 44,
    pulse: require('@/assets/images/island/island-lamp-pulse.webp'),
    pulseSize: 150,
  },
};
