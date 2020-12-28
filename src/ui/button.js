'use strict'

import Phaser from 'phaser'


export default class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, options)
  {
    super(scene, x, y)

    this.label = new Phaser.GameObjects.Text(scene, 0, 0, label)
    this.label.setOrigin(0.5, 0.5)
    this.add(this.label)

    if (typeof options === 'function')
    {
      options = {
        onClick: options
      }
    }

    const width = options.width || this.label.width + 8
    const height = options.height || this.label.height + 4
    const enabled = (options.disabled === undefined || options.disabled === false)

    this.border = new Phaser.GameObjects.Rectangle(scene, 0, 0, width, height)
    this.border.setStrokeStyle(1, 0x444444, 1)
    this.add(this.border)

    this.setSize(width, height)
    this.setInteractive()

    if (enabled === false)
    {
      this.disable()
    }

    this.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation()
      options.onClick(pointer, localX, localY, event)
    })

    this.on('pointerover', () => {
      this.border.setStrokeStyle(1, 0x4444FF, 1)
    })

    this.on('pointerout', () => {
      this.border.setStrokeStyle(1, 0x444444, 1)
    })
  }

  enable()
  {
    this.label.setColor('#FFFFFF')
    this.setInteractive()
  }

  disable()
  {
    this.label.setColor('#555555')
    this.disableInteractive()
  }
}