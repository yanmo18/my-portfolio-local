// 施工图纸（怎么构建，路径别名，环境变量）
// 配置文件vite.config.js，进行项目插件配置，路径别名，环境变量配
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // 插件配置，这里配置了 vue 插件和 tailwindcss 插件，用于处理 vue 项目编译和 tailwindcss 样式框架
    plugins: [
      vue(),
      tailwindcss(),
    ],
    publicDir: 'public',
    resolve: {
      // 路径别名配置，@ 表示 src 目录
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    // 环境变量配置
    // __VITE_API_BASE__ 是一个全局变量，在项目中可以使用 __VITE_API_BASE__ 来引用环境变量 VITE_API_BASE
    // 例如：import { __VITE_API_BASE__ } from 'vite'
    define: {
      __VITE_API_BASE__: JSON.stringify(env.VITE_API_BASE)
    }
  }
})