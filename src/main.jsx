import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { AuthProvider } from "./AuthContext"
import { LangProvider } from "./i18n"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <LangProvider>
        <App />
      </LangProvider>
    </AuthProvider>
  </React.StrictMode>
)
