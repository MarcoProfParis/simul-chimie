import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { loadLibrary, clearCache, getBundled } from "./data/solventLibraryStore"

const Ctx = createContext(null)

function buildIndex(list) {
  return new Map(list.map(s => [s.name.toLowerCase(), s]))
}

export function SolventLibraryProvider({ children }) {
  // Start with the bundled list — renders immediately, no network wait.
  const [library, setLibrary] = useState(getBundled)
  const [source, setSource] = useState("bundled")  // bundled | cache | api
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (opts) => {
    setLoading(true)
    try {
      const { library: lib, source: src } = await loadLibrary(opts)
      setLibrary(lib)
      setSource(src)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const refresh = useCallback(() => { clearCache(); return load({ forceRefresh: true }) }, [load])

  const byName = useMemo(() => buildIndex(library), [library])
  const findSolvent = useCallback(name => (name ? byName.get(name.trim().toLowerCase()) ?? null : null), [byName])

  const value = useMemo(() => ({ library, source, loading, refresh, findSolvent }),
    [library, source, loading, refresh, findSolvent])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSolventLibrary() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useSolventLibrary must be used inside <SolventLibraryProvider>")
  return v
}
