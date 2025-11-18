import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Safely define process.env properties for the browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.GEMINI_API_KEY_POOL': JSON.stringify(env.GEMINI_API_KEY_POOL),
      // Define process.env object to avoid "process is not defined" errors
      'process.env': JSON.stringify({
        NODE_ENV: process.env.NODE_ENV || 'development',
        ...env
      }),
      // Fallback for direct process usage
      'process': JSON.stringify({ env: { ...env } }),
    }
  }
})