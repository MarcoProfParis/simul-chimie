import { useState, useEffect, useCallback, Fragment } from "react"
import {
  Popover, PopoverButton, PopoverPanel, Transition,
  Disclosure, DisclosureButton, DisclosurePanel,
} from "@headlessui/react"
import {
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  ChevronRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/24/outline"
import { CATEGORIES } from "./config"
import { useTheme } from "./ThemeContext"

/* ─────────────────────────────────────────────────────────────────────────────
   Hook : détection mobile < 768 px
───────────────────────────────────────────────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const h = e => setIsMobile(e.matches)
    mq.addEventListener("change", h)
    return () => mq.removeEventListener("change", h)
  }, [])
  return isMobile
}

/* ─────────────────────────────────────────────────────────────────────────────
   Hook : gestion du mode expanded
   Injecte / retire une feuille de style dynamique dans <head>
   pour surcharger tous les maxWidth hardcodés dans les apps.
───────────────────────────────────────────────────────────────────────────── */
const EXPAND_STYLE_ID = "mdc-expanded-overrides"

function useExpanded() {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // Classe sur #root pour le border-inline et le max-width de #root lui-même
    const root = document.getElementById("root")
    if (root) {
      root.classList.toggle("expanded", expanded)
    }

    // Feuille de style dynamique pour surcharger les apps enfants
    let tag = document.getElementById(EXPAND_STYLE_ID)
    if (expanded) {
      if (!tag) {
        tag = document.createElement("style")
        tag.id = EXPAND_STYLE_ID
        document.head.appendChild(tag)
      }
      tag.textContent = `
        /* ── Expanded mode overrides ── */
        #root.expanded {
          width: 100% !important;
          max-width: 100% !important;
          border-inline: none !important;
        }
        /* Neutraliser tous les conteneurs à maxWidth fixe dans les apps */
        #root.expanded > div > div,
        #root.expanded > div > div > div,
        #root.expanded > div > div > div > div {
          max-width: none !important;
          box-sizing: border-box;
        }
        /* Ré-appliquer un padding horizontal confortable */
        #root.expanded [style*="margin: 0 auto"],
        #root.expanded [style*="margin:0 auto"],
        #root.expanded [style*="margin: 0px auto"] {
          padding-left: clamp(16px, 2.5vw, 48px) !important;
          padding-right: clamp(16px, 2.5vw, 48px) !important;
        }
      `
    } else {
      if (tag) tag.remove()
    }

    return () => {
      if (root) root.classList.remove("expanded")
      const t = document.getElementById(EXPAND_STYLE_ID)
      if (t) t.remove()
    }
  }, [expanded])

  return [expanded, setExpanded]
}

/* ─────────────────────────────────────────────────────────────────────────────
   Barre de navigation
───────────────────────────────────────────────────────────────────────────── */
function TopNav({ categoryId, appId, setCategoryId, setAppId, dark, setDark, expanded, setExpanded }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => { if (!isMobile) setMobileOpen(false) }, [isMobile])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  const goTo = useCallback((catId, appIdVal) => {
    setCategoryId(catId)
    setAppId(appIdVal)
    setMobileOpen(false)
  }, [setCategoryId, setAppId])

  return (
    <>
      <nav
        className="sticky top-0 z-50 h-14 flex items-center px-4 md:px-6"
        style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
          boxShadow: "0 1px 12px rgba(0,0,0,0.06)",
        }}
      >
        {/* Logo */}
        <button
          onClick={() => goTo(null, null)}
          className="flex items-center gap-2.5 h-full pr-5 mr-4 shrink-0 border-0 bg-transparent cursor-pointer"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="9.5" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--text)" }}/>
            <path d="M7 11 C7 8.5 9 7 11 7 C13 7 15 8.5 15 11 C15 13.5 13 15 11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: "var(--text)" }}/>
            <circle cx="11" cy="11" r="1.5" fill="currentColor" style={{ color: "var(--text)" }}/>
          </svg>
          <span
            className="font-bold tracking-tight whitespace-nowrap text-sm"
            style={{ color: "var(--text)", letterSpacing: "-0.02em" }}
          >
            Simulations MDC
          </span>
        </button>

        {/* ── DESKTOP : menus catégories ── */}
        {!isMobile && (
          <div className="flex items-center flex-1 h-full gap-1">
            {CATEGORIES.map(cat => (
              <Popover key={cat.id} className="relative h-full flex items-center">
                {({ open, close }) => (
                  <>
                    <PopoverButton
                      className="flex items-center gap-1.5 h-full px-3 text-[13px] border-0 bg-transparent cursor-pointer outline-none transition-colors duration-150 rounded-none"
                      style={{
                        color: categoryId === cat.id ? cat.color : "var(--text)",
                        borderBottom: categoryId === cat.id ? `2px solid ${cat.color}` : "2px solid transparent",
                        fontWeight: categoryId === cat.id ? 600 : 500,
                      }}
                      onMouseEnter={e => { if (categoryId !== cat.id) e.currentTarget.style.color = cat.color }}
                      onMouseLeave={e => { if (categoryId !== cat.id) e.currentTarget.style.color = "var(--text)" }}
                    >
                      {cat.label}
                      <ChevronDownIcon
                        className="w-3.5 h-3.5 ml-1 transition-transform duration-200"
                        style={{ transform: open ? "rotate(180deg)" : "none", opacity: 0.5, color: "var(--text)" }}
                      />
                    </PopoverButton>

                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-150"
                      enterFrom="opacity-0 translate-y-[-6px]"
                      enterTo="opacity-100 translate-y-0"
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100 translate-y-0"
                      leaveTo="opacity-0 translate-y-[-4px]"
                    >
                      <PopoverPanel
                        className="absolute top-[calc(100%+1px)] left-0 w-56 z-60 overflow-hidden rounded-b-xl rounded-tr-xl"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          boxShadow: "0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                        }}
                      >
                        <div className="h-0.5 w-full" style={{ background: cat.color }} />
                        <div className="py-1.5">
                          {cat.apps.map(app => {
                            const isActive = categoryId === cat.id && appId === app.id
                            return (
                              <button
                                key={app.id}
                                onClick={() => { goTo(cat.id, app.id); close() }}
                                className="flex items-center justify-between w-full px-4 py-2.5 text-left group transition-colors duration-100"
                                style={{
                                  background: isActive ? `${cat.color}12` : "transparent",
                                  borderLeft: isActive ? `3px solid ${cat.color}` : "3px solid transparent",
                                  border: "none",
                                  cursor: "pointer",
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg)" }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent" }}
                              >
                                <div>
                                  <p className="text-[13px] leading-snug m-0" style={{ fontWeight: isActive ? 600 : 500, color: isActive ? cat.color : "var(--text)" }}>
                                    {app.label}
                                  </p>
                                  {app.description && (
                                    <p className="text-[11px] mt-0.5 m-0 leading-snug" style={{ color: "var(--text-muted)" }}>
                                      {app.description}
                                    </p>
                                  )}
                                </div>
                                <ChevronRightIcon className="w-3.5 h-3.5 shrink-0 ml-2 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: "var(--text)" }} />
                              </button>
                            )
                          })}
                        </div>
                      </PopoverPanel>
                    </Transition>
                  </>
                )}
              </Popover>
            ))}
          </div>
        )}

        {isMobile && <div className="flex-1" />}

        {/* ── Bouton expand (desktop seulement) ── */}
        {!isMobile && (
          <button
            onClick={() => setExpanded(e => !e)}
            aria-label={expanded ? "Réduire la largeur" : "Étendre sur toute la largeur"}
            title={expanded ? "Réduire la largeur" : "Étendre sur toute la largeur"}
            className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all duration-200 shrink-0 ml-1"
            style={{
              background: expanded ? "var(--bg)" : "transparent",
              border: `1px solid ${expanded ? "var(--border)" : "transparent"}`,
              color: expanded ? "var(--text)" : "var(--text-muted)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--bg)"
              e.currentTarget.style.borderColor = "var(--border)"
              e.currentTarget.style.color = "var(--text)"
            }}
            onMouseLeave={e => {
              if (!expanded) {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.borderColor = "transparent"
              }
              e.currentTarget.style.color = expanded ? "var(--text)" : "var(--text-muted)"
            }}
          >
            {expanded
              ? <ArrowsPointingInIcon className="w-4 h-4" />
              : <ArrowsPointingOutIcon className="w-4 h-4" />
            }
          </button>
        )}

        {/* ── Bouton dark mode ── */}
        <button
          onClick={() => setDark(d => !d)}
          aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 shrink-0 text-[12px] font-semibold"
          style={{
            marginLeft: 8,
            background: dark ? "rgba(251,191,36,0.15)" : "rgba(99,102,241,0.10)",
            border: dark ? "1px solid rgba(251,191,36,0.35)" : "1px solid rgba(99,102,241,0.25)",
            color: dark ? "#fbbf24" : "#6366f1",
          }}
        >
          {dark
            ? <><SunIcon className="w-4 h-4" />{!isMobile && <span>Clair</span>}</>
            : <><MoonIcon className="w-4 h-4" />{!isMobile && <span>Sombre</span>}</>
          }
        </button>

        {/* ── Hamburger mobile ── */}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="flex items-center justify-center ml-2 p-1.5 rounded-lg border-0 bg-transparent cursor-pointer"
            style={{ color: "var(--text)" }}
          >
            {mobileOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
          </button>
        )}
      </nav>

      {/* ── MOBILE : overlay ── */}
      {isMobile && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-49 transition-opacity duration-250"
          style={{
            top: 56,
            background: "rgba(0,0,0,0.4)",
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? "auto" : "none",
          }}
        />
      )}

      {/* ── MOBILE : Drawer ── */}
      {isMobile && (
        <div
          className="fixed top-14 right-0 bottom-0 z-50 flex flex-col overflow-y-auto"
          style={{
            width: "min(300px, 85vw)",
            background: "var(--bg-card)",
            borderLeft: "1px solid var(--border)",
            boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
            transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <button
            onClick={() => goTo(null, null)}
            className="flex items-center gap-3 px-5 py-4 text-[14px] border-0 cursor-pointer text-left"
            style={{
              background: !categoryId ? "var(--bg)" : "transparent",
              borderBottom: "1px solid var(--border)",
              fontWeight: !categoryId ? 600 : 400,
              color: "var(--text)",
            }}
          >
            Accueil
          </button>

          {CATEGORIES.map(cat => (
            <Disclosure key={cat.id} defaultOpen={categoryId === cat.id}>
              {({ open }) => (
                <div style={{ borderBottom: "1px solid var(--border)" }}>
                  <DisclosureButton
                    className="flex items-center gap-3 w-full px-5 py-3.5 text-left cursor-pointer"
                    style={{
                      background: categoryId === cat.id && !open ? `${cat.color}10` : "transparent",
                      border: "none",
                      borderLeft: categoryId === cat.id ? `3px solid ${cat.color}` : "3px solid transparent",
                    }}
                  >
                    <span className="flex-1 text-[14px]" style={{ fontWeight: categoryId === cat.id ? 600 : 500, color: categoryId === cat.id ? cat.color : "var(--text)" }}>
                      {cat.label}
                    </span>
                    <ChevronDownIcon className="w-4 h-4 transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "none", color: "var(--text-muted)" }} />
                  </DisclosureButton>
                  <Transition
                    enter="transition duration-150 ease-out"
                    enterFrom="opacity-0 -translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition duration-100 ease-in"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 -translate-y-1"
                  >
                    <DisclosurePanel style={{ background: "var(--bg)" }}>
                      {cat.apps.map(app => {
                        const isActive = categoryId === cat.id && appId === app.id
                        return (
                          <button
                            key={app.id}
                            onClick={() => goTo(cat.id, app.id)}
                            className="flex items-start gap-3 w-full pl-8 pr-5 py-3 text-left border-0 cursor-pointer"
                            style={{
                              background: isActive ? `${cat.color}12` : "transparent",
                              borderLeft: isActive ? `3px solid ${cat.color}` : "3px solid transparent",
                            }}
                          >
                            <div>
                              <p className="text-[13px] m-0" style={{ fontWeight: isActive ? 600 : 400, color: isActive ? cat.color : "var(--text)" }}>
                                {app.label}
                              </p>
                              {app.description && (
                                <p className="text-[11px] mt-0.5 m-0" style={{ color: "var(--text-muted)" }}>
                                  {app.description}
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </DisclosurePanel>
                  </Transition>
                </div>
              )}
            </Disclosure>
          ))}
        </div>
      )}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Carte réutilisable
───────────────────────────────────────────────────────────────────────────── */
function AppCard({ item, accent, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left rounded-2xl cursor-pointer transition-all duration-200 border-2"
      style={{
        width: "clamp(150px, 42vw, 240px)",
        padding: "clamp(16px, 4vw, 28px) clamp(12px, 3vw, 24px)",
        borderColor: hovered ? accent : "var(--border)",
        background: hovered ? `${accent}12` : "var(--bg-card)",
        boxShadow: hovered ? `0 8px 32px ${accent}22` : "var(--shadow)",
      }}
    >
      <div className="w-8 h-1 rounded-full mb-4 transition-all duration-200" style={{ background: hovered ? accent : "var(--border)" }} />
      <p className="font-bold mb-1.5 m-0" style={{ fontSize: "clamp(13px, 3vw, 15px)", color: "var(--text)" }}>
        {item.label}
      </p>
      <p className="m-0 leading-relaxed" style={{ fontSize: "clamp(11px, 2.5vw, 12px)", color: "var(--text-muted)" }}>
        {item.description}
      </p>
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Wrapper expanded — enveloppe le rendu de chaque app en mode étendu.
   Utilise une ref pour surcharger le style inline du premier enfant DOM.
───────────────────────────────────────────────────────────────────────────── */
function AppWrapper({ expanded, children }) {
  return (
    <div
      data-expanded={expanded ? "true" : "false"}
      style={{
        /* En mode expanded : on devient le conteneur pleine largeur */
        width: "100%",
        /* Transition douce */
        transition: "padding 0.25s ease",
      }}
    >
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Composant principal
───────────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [categoryId, setCategoryId] = useState(null)
  const [appId, setAppId]           = useState(null)
  const { dark, setDark }           = useTheme()
  const [expanded, setExpanded]     = useExpanded()

  const nav = (
    <TopNav
      categoryId={categoryId}
      appId={appId}
      setCategoryId={setCategoryId}
      setAppId={setAppId}
      dark={dark}
      setDark={setDark}
      expanded={expanded}
      setExpanded={setExpanded}
    />
  )

  /* Niveau 3 — affichage d'une app */
  if (categoryId && appId) {
    const cat = CATEGORIES.find(c => c.id === categoryId)
    const app = cat.apps.find(a => a.id === appId)
    const Component = app.component
    return (
      <div>
        {nav}
        <AppWrapper expanded={expanded}>
          <Component onBack={() => setAppId(null)} />
        </AppWrapper>
      </div>
    )
  }

  /* Niveau 2 — liste des apps d'une catégorie */
  if (categoryId) {
    const cat = CATEGORIES.find(c => c.id === categoryId)
    return (
      <div>
        {nav}
        <div
          className="min-h-[calc(100vh-56px)] flex flex-col items-center"
          style={{ background: "var(--bg)", padding: "clamp(1rem,4vw,2rem)", paddingTop: "clamp(1.5rem,5vw,3rem)" }}
        >
          <div className="text-center mb-10 w-full max-w-3xl">
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: cat.color }} />
            <h1 className="font-extrabold tracking-tight mt-0 mb-1" style={{ fontSize: "clamp(20px,4vw,26px)", color: "var(--text)" }}>
              {cat.label}
            </h1>
            <p className="m-0" style={{ fontSize: "clamp(12px,3vw,14px)", color: "var(--text-muted)" }}>
              {cat.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-5 justify-center w-full max-w-3xl">
            {cat.apps.map(app => (
              <AppCard key={app.id} item={app} accent={cat.color} onClick={() => setAppId(app.id)} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* Niveau 1 — accueil */
  return (
    <div>
      {nav}
      <div
        className="min-h-[calc(100vh-56px)] flex flex-col items-center"
        style={{ background: "var(--bg)", padding: "clamp(1rem,4vw,2rem)", paddingTop: "clamp(1.5rem,5vw,3rem)" }}
      >
        <div className="text-center mb-10 w-full max-w-3xl">
          <h1 className="font-extrabold tracking-tight mt-0 mb-1" style={{ fontSize: "clamp(20px,4vw,26px)", color: "var(--text)" }}>
            Simulations MDC
          </h1>
          <p className="m-0" style={{ fontSize: "clamp(12px,3vw,14px)", color: "var(--text-muted)" }}>
            BTS Métiers de la Chimie
          </p>
        </div>
        <div className="flex flex-wrap gap-5 justify-center w-full max-w-3xl">
          {CATEGORIES.map(cat => (
            <AppCard key={cat.id} item={cat} accent={cat.color} onClick={() => setCategoryId(cat.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}