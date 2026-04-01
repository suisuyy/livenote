import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const logEnvPlugin = () => ({
  name: 'log-env',
  configResolved() {
    console.log('Vite config resolved. NEXT_PUBLIC_GEMINI_API_KEY:', process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'Set' : 'Not set')
    console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Not set')
    console.log('API_KEY:', process.env.API_KEY ? 'Set' : 'Not set')
  }
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), logEnvPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    define: {
      'process.env.NEXT_PUBLIC_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.NEXT_PUBLIC_GEMINI_API_KEY || env.API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY || ''),
    }
  }
})
