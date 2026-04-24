import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

// Inject current git branch at build time so the UI can show it
const gitBranch = (() => {
  try { return execSync('git rev-parse --abbrev-ref HEAD').toString().trim() }
  catch { return 'unknown' }
})()

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    __GIT_BRANCH__: JSON.stringify(gitBranch),
  },
})
