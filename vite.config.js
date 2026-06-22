// 施工图纸（怎么构建，路径别名，环境变量）
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      vue(),
      tailwindcss(),
    ],
    publicDir: 'public',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    define: {
      __VITE_API_BASE__: JSON.stringify(env.VITE_API_BASE)
    }
  }
})