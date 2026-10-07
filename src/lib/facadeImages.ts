// Facade elevation images for the ק.מ חולף (stick curtain wall) system.
// The highlighted region for each installation sub-stage code is NOT hardcoded here —
// it's marked by the user directly on the image (drag-to-mark) and stored in the
// FacadeRegion table, keyed by this image's `key` + the task's subStage code.

export interface FacadeImageDef {
  key: string   // matches FacadeRegion.key, e.g. "A|מזרח"
  src: string
  label: string
}

// Keyed by `${building}|${facade}` — matches Task.building ("A"/"B") and Task.facade
// ("מזרח"/"מערב"/"צפון"/"דרום"). צפון and דרום share one combined image for both buildings.
export const FACADE_IMAGES: Record<string, FacadeImageDef> = {
  'A|מזרח': { key: 'A|מזרח', src: '/facades/mizrah-a.png', label: 'חזית מזרח A' },
  'B|מזרח': { key: 'B|מזרח', src: '/facades/mizrah-b.png', label: 'חזית מזרח פנים B' },
  'A|מערב': { key: 'A|מערב', src: '/facades/mearav-a.png', label: 'חזית מערב פנים A' },
  'B|מערב': { key: 'B|מערב', src: '/facades/mearav-b.png', label: 'חזית מערב B' },
  'A|צפון': { key: 'צפון', src: '/facades/tzafon.png', label: 'חזית צפון' },
  'B|צפון': { key: 'צפון', src: '/facades/tzafon.png', label: 'חזית צפון' },
  'A|דרום': { key: 'דרום', src: '/facades/darom.png', label: 'חזית דרום' },
  'B|דרום': { key: 'דרום', src: '/facades/darom.png', label: 'חזית דרום' },
}

export function getFacadeImage(building?: string | null, facade?: string | null): FacadeImageDef | null {
  if (!building || !facade) return null
  return FACADE_IMAGES[`${building}|${facade}`] ?? null
}
