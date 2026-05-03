export function generateOrderNo(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 10)
  return `${ts}${rand}`.toUpperCase()
}
