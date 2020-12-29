'use strict'

import Phaser from 'phaser'
import { GameEvents } from '../defines'


export default class CountdownTimer extends Phaser.GameObjects.Container {
  constructor(scene, x, y, options)
  {
    super(scene, x, y)

    const width = 64
    const height = 64

    this.setSize(width, height)
    this.setInteractive()

    this.on('pointerdown', () => {
      if (this.timer)
      {
        this.timer.remove(true)
      }
    })

    const border = new Phaser.GameObjects.Rectangle(scene, 0, 0, width, height)
    border.setFillStyle(0x000000, 0.75)
    border.setStrokeStyle(1, 0x444444, 1)
    this.add(border)

    this.text = new Phaser.GameObjects.Text(scene, 0, 0, "00", { fontSize: '42px' })
    this.text.setOrigin(0.5, 0.5)
    this.add(this.text)

    const skipText = new Phaser.GameObjects.Text(scene, 0, 22, "skip", { fontSize: '14px' })
    skipText.setOrigin(0.5, 0.5)
    this.add(skipText)

    this.setVisible(false)

    this.timer = undefined
    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, () => {
      const gameScene = this.scene.scene.get('game')

      gameScene.events.on(GameEvents.START_COUNTDOWN, timer => {
        this.setVisible(true)

        this.timer = timer
      })

      gameScene.events.on(GameEvents.END_COUNTDOWN, timer => {
        this.setVisible(false)

        this.timer = null
        this.text.setText('00')
      })
    })
  }

  preUpdate()
  {
    if (this.timer)
    {
      const seconds = Math.ceil(this.timer.getRemainingSeconds())
      this.text.setText(seconds.toFixed(0).padStart(2, '0'))
    }
  }
}