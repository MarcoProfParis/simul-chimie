import { Fragment, useMemo, useState } from "react"
import {
  Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption,
  Transition,
} from "@headlessui/react"
import { ChevronUpDownIcon, CheckIcon, PlusIcon } from "@heroicons/react/24/outline"
import { useSolventLibrary } from "../SolventLibraryContext"

const ACCENT = "#ea580c"

// Sentinel value used for the "custom / free-text" option.
const CUSTOM_TAG = "__hsp_custom__"

export default function SolventCombobox({ value, onPick, placeholder }) {
  const [query, setQuery] = useState("")
  const trimmedQ = query.trim()
  const { library } = useSolventLibrary()

  const filtered = useMemo(() => {
    const q = trimmedQ.toLowerCase()
    if (!q) return library
    // Match against name AND synonyms (synonyms come from the API).
    return library.filter(s => {
      if (s.name.toLowerCase().includes(q)) return true
      if (s.synonyms && s.synonyms.some(syn => syn.toLowerCase().includes(q))) return true
      return false
    })
  }, [trimmedQ, library])

  const hasExact = filtered.some(s => s.name.toLowerCase() === trimmedQ.toLowerCase())
  const showCustom = trimmedQ.length > 0 && !hasExact

  // onChange receives either a library object or a string (the custom typed name).
  const handleChange = (picked) => {
    if (!picked) return
    if (typeof picked === "string") {
      // Custom: strip the sentinel prefix to extract the real name.
      const name = picked.startsWith(CUSTOM_TAG) ? picked.slice(CUSTOM_TAG.length) : picked
      onPick({ name, custom: true })
    } else {
      onPick({ name: picked.name, D: picked.D, P: picked.P, H: picked.H, custom: false })
    }
    setQuery("")
  }

  return (
    <Combobox value={null} onChange={handleChange} onClose={() => setQuery("")}>
      {({ open }) => (
        <div className="relative w-full">
          <div
            className="flex items-center w-full rounded border transition-colors"
            style={{
              borderColor: open ? ACCENT : "var(--border)",
              background: "var(--bg-card)",
              boxShadow: open ? `0 0 0 2px ${ACCENT}25` : "none",
            }}
          >
            <ComboboxInput
              displayValue={() => value || ""}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 min-w-0 px-2 py-1 text-xs bg-transparent border-0 outline-none"
              style={{ color: "var(--text)" }}
            />
            <ComboboxButton className="flex items-center justify-center px-1.5 py-1 border-0 bg-transparent cursor-pointer">
              <ChevronUpDownIcon className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            </ComboboxButton>
          </div>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 translate-y-[-4px]"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ComboboxOptions
              anchor="bottom start"
              className="z-50 mt-1 max-h-64 w-[min(380px,90vw)] overflow-auto rounded-lg py-1 text-xs focus:outline-none [--anchor-gap:4px]"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
              }}
            >
              {showCustom && (
                <ComboboxOption as={Fragment} value={CUSTOM_TAG + trimmedQ}>
                  {({ focus }) => (
                    <li
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                      style={{
                        background: focus ? `${ACCENT}12` : "transparent",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <PlusIcon className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
                      <span style={{ color: "var(--text)" }}>
                        Utiliser <b>« {trimmedQ} »</b> <span style={{ color: "var(--text-muted)" }}>(saisie libre)</span>
                      </span>
                    </li>
                  )}
                </ComboboxOption>
              )}

              {filtered.length === 0 && !showCustom && (
                <div className="px-3 py-3 text-center" style={{ color: "var(--text-muted)" }}>
                  Aucun solvant dans la base pour « {trimmedQ} »
                </div>
              )}

              {filtered.map(s => (
                <ComboboxOption key={s.name} as={Fragment} value={s}>
                  {({ focus, selected }) => (
                    <li
                      className="flex items-center justify-between gap-3 px-3 py-1.5 cursor-pointer"
                      style={{
                        background: focus ? `${ACCENT}12` : "transparent",
                      }}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        {selected
                          ? <CheckIcon className="w-3 h-3 shrink-0" style={{ color: ACCENT }} />
                          : <span className="w-3 shrink-0" />}
                        <span className="truncate" style={{ color: "var(--text)", fontWeight: focus ? 600 : 500 }}>
                          {s.name}
                        </span>
                      </span>
                      <span
                        className="shrink-0 font-mono tabular-nums"
                        style={{ color: "var(--text-muted)", fontSize: 10 }}
                      >
                        δD={s.D.toFixed(1)}  δP={s.P.toFixed(1)}  δH={s.H.toFixed(1)}
                      </span>
                    </li>
                  )}
                </ComboboxOption>
              ))}
            </ComboboxOptions>
          </Transition>
        </div>
      )}
    </Combobox>
  )
}
