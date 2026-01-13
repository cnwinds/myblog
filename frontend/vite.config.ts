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
    // 启用代码分割
    rollupOptions: {
      output: {
        // 手动配置代码分割策略
        manualChunks: (id) => {
          // 将 node_modules 中的依赖拆分成单独的 chunk
          if (id.includes('node_modules')) {
            // 先处理具体的包名，避免循环依赖
            const packageName = id.split('node_modules/')[1]?.split('/')[0];
            
            // React 核心库（react, react-dom）- 必须最先判断
            if (packageName === 'react' || packageName === 'react-dom') {
              return 'vendor-react-core';
            }
            // React Router
            if (packageName === 'react-router' || packageName === 'react-router-dom') {
              return 'vendor-router';
            }
            // Markdown 相关（编辑器、解析器等）- 不包含 react 依赖的部分
            if (packageName === '@uiw' || packageName === 'react-markdown' || 
                packageName?.startsWith('remark') || packageName?.startsWith('rehype') ||
                packageName === 'micromark' || packageName === 'unified' ||
                packageName === 'mdast' || packageName === 'unist') {
              return 'vendor-markdown';
            }
            // Axios
            if (packageName === 'axios') {
              return 'vendor-axios';
            }
            // React Icons
            if (packageName === 'react-icons') {
              return 'vendor-icons';
            }
            // 其他第三方库
            // 注意：这里可能包含一些共享依赖，但为了简化，统一放到 vendor-others
            return 'vendor-others';
          }
        },
        // 优化 chunk 文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // 设置 chunk 大小警告阈值（500KB）
    chunkSizeWarningLimit: 500,
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
