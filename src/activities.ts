/** The things that can appear as an emoji on a day. Add a line here to add a new kind. */
export interface Activity {
  id: string
  emoji: string
  label: string
}

export const ACTIVITIES: Activity[] = [
  { id: 'puzzle', emoji: '🧩', label: 'Puzzle' },
  { id: 'walk', emoji: '🥾', label: 'Walk' },
  { id: 'rings', emoji: '⭕', label: 'Rings closed' },
  { id: 'music', emoji: '🎸', label: 'Music' },
  { id: 'sourdough', emoji: '🍞', label: 'Sourdough' },
  { id: 'photos', emoji: '📷', label: 'Photos' },
  { id: 'game', emoji: '🎮', label: 'Video game' },
  { id: 'alcohol', emoji: '🍷', label: 'Alcohol' },
  { id: 'other', emoji: '✨', label: 'Something else' },
]

const byId = new Map(ACTIVITIES.map((a) => [a.id, a]))

export function activity(id: string): Activity {
  return byId.get(id) ?? { id, emoji: '•', label: id }
}
