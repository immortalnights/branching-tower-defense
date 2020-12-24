'use strict'

import Phaser from 'phaser'
import Game from './gamescene'
import HUD from './ui/hud'


const config = {
  title: "Branching Tower Defense",
  type: Phaser.WEBGL,
  width: 1024,
  height: 768,
  scene: [ Game, HUD ],
  seed: 1,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  loader: {
    baseUrl: '.',
    path: process.env.NODE_ENV === 'production' ? './assets' : './src/assets'
  },
  disableContextMenu: true,
  banner: {
    background: [ '#000000' ],
  }
}

new Phaser.Game(config);
