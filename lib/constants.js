'use strict';

export const ASSETS = {
  PENCIL_1: 'pencil_1.png',
  PENCIL_2: 'pencil_2.png',
  PENCIL_3: 'pencil_1.png',
  BG: 'bg.png',
  ORB: 'orb.png',
  FLARE: 'flare.png',
  CUTE_FRAME: 'cute_frame.png',
  PASSION_FRAME: 'passion_frame.png',
  COOL_FRAME: 'cool_frame.png',
};

export const GRADIENT = {
  cute: [
    {offset: 0.33, color: 'rgb(255, 138, 232)'},
    {offset: 0.67, color: 'rgb(107, 233, 255)'},
  ],
  passion: [
    {offset: 0.33, color: 'rgb(255, 210, 75)'},
    {offset: 0.67, color: 'rgb(255, 138, 232)'},
  ],
  cool: [
    {offset: 0.33, color: 'rgb(125, 215, 255)'},
    {offset: 0.67, color: 'rgb(255, 229, 133)'},
  ],
};

export const PENCIL_SIZE = {
  PENCIL_1: {
    top:      [8, 8],
    bottom:   [24, 24],
  },
  PENCIL_2: {
    top:      [14, 10],
    bottom:   [24, 36],
  },
  PENCIL_3: {
    top:      [4, 4],
    bottom:   [20, 20],
  },
};
