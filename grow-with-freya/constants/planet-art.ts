// Written by scripts/prepare-planet-art.py. Do not edit by hand: change the script and run it again.

export const PLANET_ART = {
  source: require('@/assets/images/home-planet/planet-horizon.webp'),
  width: 941,
  height: 662,
  planetTop: 116,
  planetRadius: 522,
  planetCentreX: 466,
  limbWidth: 919,
  cloudLine: 508,
} as const;

export const CLOUD_RING_ART = {
  source: require('@/assets/images/home-planet/planet-cloud-ring.webp'),
  width: 1232,
  height: 263,
  radius: 522,
  centreY: 130.28,
} as const;
