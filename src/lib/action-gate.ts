export function createActionGate() {
  let active = false
  return {
    get busy() { return active },
    async run<T>(action: () => Promise<T>): Promise<T | undefined> {
      if (active) return undefined
      active = true
      try { return await action() } finally { active = false }
    }
  }
}
