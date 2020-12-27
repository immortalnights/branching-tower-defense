'use strict'


const RateLimitedWeaponComponent = {
  _rateLimitedWeaponComponent: true,
  _nextFireTime: 0,

  _verify: function()
  {
    console.assert(this.getData('rateOfFire') != null, "Parent missing 'rateOfFire'")
    console.assert(this.getData('rateOfFireMultiplier') != null, "Parent missing 'rateOfFireMultiplier'")
  },

  setRateOfFire: function(rate, multiplier)
  {
    this.setData({
      rateOfFire: rate,
      rateOfFireMultiplier: multiplier == null ? 1 : multiplier
    })
  },

  // Attempt to fire the weapon, if it's reloaded
  tryFire: function(target, time, delta)
  {
    if (time > this._nextFireTime)
    {
      this.fire(target, delta)

      const timeDifference = 1000 / (this.getData('rateOfFire') * this.getData('rateOfFireMultiplier'))
      // console.log("ROF", this.getData('rateOfFire'), this.getData('rateOfFireMultiplier'), timeDifference)
      const speedAdjustedTime = (timeDifference / this.scene.data.get('speed'))
      this._nextFireTime = time + speedAdjustedTime
      // console.log("Next fire time", time, speedAdjustedTime, this._nextFireTime)
    }
  },

  // get / set `rateOfFire` data value
  // get rateOfFire() {
  //   return this.getData('rateOfFire')
  // },
  // set rateOfFire(val) {
  //   this.setData('rateOfFire', val)
  // },

  // get / set `rateOfFireMultiplier` data value
  // get rateOfFireMultiplier() {
  //   return this.getData('rateOfFireMultiplier')
  // },
  // set rateOfFireMultiplier(val) {
  //   this.setData('rateOfFireMultiplier', val)
  // }
}

export default RateLimitedWeaponComponent