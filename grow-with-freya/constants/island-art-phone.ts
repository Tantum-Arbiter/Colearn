// Written by scripts/prepare-island-art.py. Change the script, not this file.
import type { IslandArt } from '@/constants/island-art';

export const ISLAND_ART_PHONE: IslandArt = {
  picture: require('@/assets/images/island-phone/island-base.webp'),
  horizon: require('@/assets/images/island-phone/island-land.webp'),
  width: 941,
  height: 1672,
  bandTop: 518,
  bandBottom: 720,
  seaLine: 628,
  sunX: 520,
  faceFloor: 590,
  farClouds: [
    { id: 'island-cloud-left', source: require('@/assets/images/island-phone/island-cloud-left.webp'), frame: { x: 0, y: 216, width: 332, height: 440 }, reach: -12, beats: 3, lag: 0.15 },
  ],
  nearClouds: [
    { id: 'island-cloud-horizon', source: require('@/assets/images/island-phone/island-cloud-horizon.webp'), frame: { x: 290, y: 257, width: 651, height: 416 }, reach: 7, beats: 2, lag: 0.0 },
  ],
  billows: [
  ],
  lowTrees: [
    { id: 'island-tree-11', source: require('@/assets/images/island-phone/island-tree-11.webp'), frame: { x: 648, y: 920, width: 30, height: 49 }, pivotX: 663, pivotY: 970, sway: 3.2 },
    { id: 'island-tree-12', source: require('@/assets/images/island-phone/island-tree-12.webp'), frame: { x: 714, y: 950, width: 36, height: 52 }, pivotX: 732, pivotY: 1003, sway: 3.2 },
    { id: 'island-tree-13', source: require('@/assets/images/island-phone/island-tree-13.webp'), frame: { x: 225, y: 1093, width: 67, height: 49 }, pivotX: 252, pivotY: 1118, sway: 5.5 },
    { id: 'island-tree-14', source: require('@/assets/images/island-phone/island-tree-14.webp'), frame: { x: 825, y: 1169, width: 44, height: 35 }, pivotX: 846, pivotY: 1190, sway: 5.5 },
    { id: 'island-tree-15', source: require('@/assets/images/island-phone/island-tree-15.webp'), frame: { x: 867, y: 1175, width: 54, height: 43 }, pivotX: 894, pivotY: 1200, sway: 5.5 },
    { id: 'island-tree-16', source: require('@/assets/images/island-phone/island-tree-16.webp'), frame: { x: 813, y: 1208, width: 35, height: 22 }, pivotX: 828, pivotY: 1218, sway: 5.5 },
  ],
  horizonTrees: [
    { id: 'island-tree-01', source: require('@/assets/images/island-phone/island-tree-01.webp'), frame: { x: 477, y: 609, width: 29, height: 52 }, pivotX: 486, pivotY: 662, sway: 3.2 },
    { id: 'island-tree-02', source: require('@/assets/images/island-phone/island-tree-02.webp'), frame: { x: 513, y: 625, width: 19, height: 36 }, pivotX: 517.5, pivotY: 662, sway: 3.2 },
    { id: 'island-tree-03', source: require('@/assets/images/island-phone/island-tree-03.webp'), frame: { x: 545, y: 646, width: 20, height: 29 }, pivotX: 551.5, pivotY: 676, sway: 3.2 },
    { id: 'island-tree-04', source: require('@/assets/images/island-phone/island-tree-04.webp'), frame: { x: 412, y: 629, width: 24, height: 46 }, pivotX: 420.5, pivotY: 676, sway: 3.2 },
    { id: 'island-tree-05', source: require('@/assets/images/island-phone/island-tree-05.webp'), frame: { x: 626, y: 674, width: 24, height: 40 }, pivotX: 635, pivotY: 715, sway: 3.2 },
    { id: 'island-tree-06', source: require('@/assets/images/island-phone/island-tree-06.webp'), frame: { x: 66, y: 562, width: 46, height: 95 }, pivotX: 83.5, pivotY: 660, sway: 3.2 },
    { id: 'island-tree-07', source: require('@/assets/images/island-phone/island-tree-07.webp'), frame: { x: 26, y: 586, width: 26, height: 49 }, pivotX: 30, pivotY: 648, sway: 3.2 },
    { id: 'island-tree-08', source: require('@/assets/images/island-phone/island-tree-08.webp'), frame: { x: 122, y: 620, width: 23, height: 43 }, pivotX: 130, pivotY: 668, sway: 3.2 },
    { id: 'island-tree-09', source: require('@/assets/images/island-phone/island-tree-09.webp'), frame: { x: 155, y: 626, width: 20, height: 43 }, pivotX: 158.5, pivotY: 670, sway: 3.2 },
    { id: 'island-tree-10', source: require('@/assets/images/island-phone/island-tree-10.webp'), frame: { x: 184, y: 649, width: 32, height: 48 }, pivotX: 200, pivotY: 698, sway: 3.2 },
  ],
  water: [
    require('@/assets/images/island-phone/island-water-1.webp'),
    require('@/assets/images/island-phone/island-water-2.webp'),
    require('@/assets/images/island-phone/island-water-3.webp'),
  ],
  falls: [
    { id: 'island-fall-1', streaks: require('@/assets/images/island-phone/island-fall-1-streaks.webp'), cover: require('@/assets/images/island-phone/island-fall-1-cover.webp'), frame: { x: 55, y: 995, width: 75, height: 107 }, tile: 48, sprayX: 105, sprayY: 1105, spraySize: 60 },
  ],
  spray: require('@/assets/images/island-phone/island-spray.webp'),
  pools: [
    { id: 'island-pool-1', cover: require('@/assets/images/island-phone/island-pool-1-cover.webp'), frame: { x: 110, y: 1100, width: 130, height: 70 }, ringX: 175, ringY: 1140, ringWidth: 90 },
  ],
  ring: require('@/assets/images/island-phone/island-ring.webp'),
  ringAspect: 2.2069,
  litWindows: { id: 'island-lit-windows', source: require('@/assets/images/island-phone/island-lit-windows.webp'), frame: { x: 453, y: 798, width: 438, height: 236 } },
  villageLamps: [
    { id: 'island-lit-village-1', source: require('@/assets/images/island-phone/island-lit-village-1.webp'), frame: { x: 161, y: 834, width: 744, height: 367 } },
    { id: 'island-lit-village-2', source: require('@/assets/images/island-phone/island-lit-village-2.webp'), frame: { x: 147, y: 832, width: 399, height: 351 } },
  ],
  lighthouse: {
    x: 840,
    y: 810,
    glow: require('@/assets/images/island-phone/island-lamp-glow.webp'),
    glowSize: 76,
    beam: require('@/assets/images/island-phone/island-lamp-beam.webp'),
    beamLength: 380,
    beamHeight: 44,
    pulse: require('@/assets/images/island-phone/island-lamp-pulse.webp'),
    pulseSize: 150,
  },
};
