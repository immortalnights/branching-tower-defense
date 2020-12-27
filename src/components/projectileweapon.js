'use strict'

import Phaser from 'phaser'
import Projectile from '../projectile'


const ProjectileWeaponComponent = {
  _projectileWeaponComponent: true,
  projectileClass: Projectile,
  projectiles: null,
  _projectileOrigin: undefined,

  _verify: function()
  {
    console.assert(this.projectileClass != null, "Missing 'projectileClass'")
    console.assert(this.getData('damage') != null, "Parent missing 'damage'")
    console.assert(this.getData('damageMultiplier') != null, "Parent missing 'damageMultiplier'")
    console.assert(this.getData('projectileSpeed') != null, "Parent missing 'projectileSpeed'")
    console.assert(this.getData('projectileSpeedMultiplier') != null, "Parent missing 'projectileSpeedMultiplier'")
  },

  setProjectileOrigin: function(x, y)
  {
    this._projectileOrigin = { x, y }
  },

  setProjectileDamage: function(damage, multiplier)
  {
    this.setData({
      damage: damage,
      damageMultiplier: multiplier == null ? 1 : multiplier
    })
  },

  setProjectileSpeed: function(speed, multiplier)
  {
    this.setData({
      projectileSpeed: speed,
      projectileSpeedMultiplier: multiplier == null ? 1 : multiplier
    })
  },

  getBaseDamage: function()
  {
    return this.getData('damage') * this.getData('damageMultiplier')
  },

  getBaseProjectileSpeed: function()
  {
    return this.getData('projectileSpeed') * this.getData('projectileSpeedMultiplier')
  },

  fire: function(target, delta)
  {
    if (this.projectiles == null)
    {
      this.projectiles = new Phaser.GameObjects.Group()
    }

    const origin = this.parentContainer != null ? this.parentContainer : this

    const baseSpeed = this.getBaseProjectileSpeed()
    const baseDamage = this.getBaseDamage()
    const p = new Projectile(this.scene, origin.x, origin.y, {
      baseSpeed,
      baseDamage,
      damageType: undefined,
      damage: baseDamage
    })
    this.scene.projectiles.add(p, true)
    this.projectiles.add(p)

    this.scene.physics.velocityFromRotation(this.rotation, p.getData('speed'), p.body.velocity)
  }
}

export default ProjectileWeaponComponent