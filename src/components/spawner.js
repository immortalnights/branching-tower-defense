
export const SPAWNER_EVENTS = {
  SPAWNED: 'spawner:spawned',
  WAVE_COMPLETE: 'spawner:wavecomplete',
  ALL_WAVES_COMPLETE: 'spawner:allwavescomplete',
}


const getThreatLevelName = threatLevel => {
  return "Unknown"
}


// Maybe this could be a Phaser.GameObjects.Group?
const Spawner = {
  _spawnerComponent: true,
  _monsters: null,

  initializeSpawner: function(classType, threatLevel)
  {
    // define getters / setters
    Object.defineProperties(this, {
      threatLevel: {
        get()
        {
          return this.getData('threatLevel')
        }
      },
      monsters: {
        get()
        {
          return this._monsters
        },
      }
    })

    // spawned "monsters" are added to this group
    const createCallback = this.onSpawned.bind(this)
    this._monsters = new Phaser.GameObjects.Group(this.scene, [], {
      classType,
      createCallback
    })

    const totalWaves = 1 + threatLevel

    this.setData({
      threatLevel: threatLevel,
      threat: getThreatLevelName(threatLevel),
      // total waves
      totalWaves,
      // total monsters
      totalMonsters: undefined,
      // wave count
      wave: 0,
      // next wave or spwan time
      nextEventAt: 0,
      // monsters spawned this wave
      spawnedForWave: 0,
      // total monsters spawned
      spawned: 0,
    })
  },

  initializeWaves: function(groupTypes)
  {
    const weightedValue = (base, threat) => {
      return Math.ceil(base * (1 + ~~(Math.pow(Phaser.Math.RND.frac(), 2) * (threat) + 0.5)))
    }

    this._waveSettings = []
    let totalMonsters = 0
    for (let w = 0; w < this.getData('totalWaves'); w++)
    {
      const groupType = Phaser.Math.RND.weightedPick(groupTypes)

      // time between each wave (first wave begins when the level countdown expires)
      const delay = Phaser.Math.RND.between(1500, groupType.delay)
      // monsters stats for wave
      const monsters = weightedValue(groupType.monsterMultiplier, this.threatLevel)
      const healthMultiplier = weightedValue(groupType.healthMultiplier, this.threatLevel)
      const speedMultiplier = weightedValue(groupType.speedMultiplier, this.threatLevel)
      // time between each monster
      const spawnDelay = Phaser.Math.RND.between(200, ((groupType.delay * 4) / 100))

      const waveSettings = {
        delay,
        monsters,
        modifiers: {
          healthMultiplier,
          speedMultiplier,
        },
        spawnDelay,
      }

      console.log(`Wave ${w} for threat ${this.threatLevel}, ${groupType.type}:`, waveSettings)
      this._waveSettings.push(waveSettings)

      totalMonsters += waveSettings.monsters
    }

    this.setData({ totalMonsters })
  },

  spawn(time, delta, config)
  {
    const currentWave = this.getData('wave')
    const waveSettings = this._waveSettings[currentWave]
    let obj

    if (this.spawnTimeout(time))
    {
      obj = this.spawnMonster(Object.assign({}, waveSettings.modifiers, config))

      this.emit(SPAWNER_EVENTS.SPAWNED, obj)

      this.incData('spawned')
      this.incData('spawnedForWave')

      // Is the wave complete?
      if (this.getData('spawnedForWave') < waveSettings.monsters)
      {
        // No, continue spawning monsters
        this.setData('nextEventAt', time + waveSettings.spawnDelay)
      }
      else
      {
        console.log(`Portal has spawned all wave monsters`)

        // Are all waves complete?
        if (currentWave < (this.getData('totalWaves') - 1))
        {
          // No, wait for the next wave to start
          const nextWave = currentWave + 1
          const nextWaveTime = time + this._waveSettings[nextWave].delay

          // prepare the next wave data
          this.setData({
            wave: nextWave,
            nextEventAt: nextWaveTime,
            spawnedForWave: 0
          })
          // notify that the wave has completed
          this.emit(SPAWNER_EVENTS.WAVE_COMPLETE)

          console.log(`Next wave in ${((nextWaveTime - time) / 1000).toFixed(2)}s`)
        }
        else
        {
          //
          this.emit(SPAWNER_EVENTS.ALL_WAVES_COMPLETE)
        }
      }
    }

    return obj
  },

  spawnTimeout: function(time)
  {
    return time > this.getData('nextEventAt')
  },

  spawnMonster: function(config)
  {
    return this.monsters.create(this.x, this.y)
  }
}

export default Spawner