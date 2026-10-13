import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {readFileSync} from 'node:fs'

const packageInfo=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8')) as {version:string}

export default defineConfig({
  // GitHub Pages sirve cada proyecto bajo el nombre de su repositorio.
  // En local se conserva la raíz para que http://127.0.0.1:4173 funcione igual.
  base: process.env.GITHUB_ACTIONS ? '/SAT-CENTRAL-/' : '/',
  plugins: [react(), tailwindcss()],
  define: {
    __SAT_VERSION__: JSON.stringify(packageInfo.version),
    __SAT_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
