import { createContext, useContext, useState } from "react"
import fr from "./fr"
import en from "./en"

const dicts = { fr, en }

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    // Persistance dans localStorage
    return localStorage.getItem("lang") || "fr"
  })

  const switchLang = (l) => {
    setLang(l)
    localStorage.setItem("lang", l)
  }

  // t("key") ou t("key", { n: 3, msg: "oops" })
  const t = (key, vars) => {
    let str = dicts[lang]?.[key] ?? dicts.fr[key] ?? key
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v)
      })
    }
    return str
  }

  return (
    <LangContext.Provider value={{ lang, setLang: switchLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
