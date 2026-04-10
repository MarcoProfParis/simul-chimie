import { createContext, useContext, useState, useEffect } from "react"

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark"
  })

  useEffect(() => {
    localStorage.setItem("theme", dark ? "dark" : "light")
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light")
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, setDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}