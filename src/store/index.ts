import { defineStore } from 'pinia'
import { reactive, ref, watch, computed } from 'vue'
import { Division, Hole, Tag } from '@/types'
import { useTheme } from 'vuetify'
import { listDivisions, listHoles } from '@/apis'

export const useStyleStore = defineStore('style', () => {
  const theme = useTheme()

  const dark = ref<boolean>(false)
  watch(dark, () => {
    theme.global.name.value = dark.value ? 'dark' : 'light'
  })
  return { dark }
})

export const useDivisionStore = defineStore('division', () => {
  const divisions = reactive<Division[]>([])
  const currentDivisionId = ref<number | null>(null)
  function updateDivision(newDivisions: Division[]) {
    divisions.splice(0, divisions.length, ...newDivisions)
    localStorage.setItem('divisions', JSON.stringify(divisions))
  }

  async function fetchDivisions() {
    const localDivisions = localStorage.getItem('divisions')
    if (localDivisions) {
      updateDivision(JSON.parse(localDivisions))
      listDivisions().then((newDivisions) => {
        updateDivision(newDivisions)
      })
    } else {
      updateDivision(await listDivisions())
    }
  }

  const currentDivision = computed(() => {
    return divisions.find((division) => division.id === currentDivisionId.value) || null
  })
  return { divisions, currentDivisionId, fetchDivisions, currentDivision }
})

export const useHoleStore = defineStore('hole', () => {
  const holes = reactive<Map<number, Hole[]>>(new Map())
  const currentHoles = computed(() => {
    const divisionStore = useDivisionStore()
    const divisionId = divisionStore.currentDivisionId
    if (!divisionId || !holes.has(divisionId)) {
      return []
    }
    return holes.get(divisionId)!
  })
  async function fetchDivisionHoles(
    divisionId: number,
    length: number,
    tag?: string | Tag
  ): Promise<boolean> {
    if (!holes.has(divisionId)) {
      holes.set(divisionId, [])
    }
    const oldHoles = holes.get(divisionId)!
    const time = oldHoles.length > 0 ? oldHoles[oldHoles.length - 1].timeUpdated : new Date()
    const newHoles = await listHoles(divisionId, time, length, tag)
    if (newHoles.length === 0) {
      return false
    }
    // Push new holes while keeping the time order (new to old), and remove old duplicates
    for (const newHole of newHoles) {
      const index = oldHoles.findIndex((hole) => hole.id === newHole.id)
      if (index >= 0) {
        oldHoles.splice(index, 1)
      }
      oldHoles.push(newHole)
    }
    oldHoles.sort((a, b) => b.timeUpdated.getTime() - a.timeUpdated.getTime())
    return true
  }
  return { holes, fetchDivisionHoles, currentHoles }
})
