import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    // 不进行代码分割，所有依赖打包在一起，避免循环依赖问题
    // 设置 chunk 大小警告阈值（提高阈值，因为所有包会合在一起）
    chunkSizeWarningLimit: 2000,
    // 启用压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 保留 console，生产环境可设为 true
      },
    },
    // 启用 sourcemap（可选，生产环境可关闭以减小体积）
    sourcemap: false,
  }
})
