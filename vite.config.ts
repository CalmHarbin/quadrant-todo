import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isServe = command === 'serve'
  const isBuild = command === 'build'
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG

  return {
    base: './', // 设置相对路径，确保 Electron 可以正确加载静态资源
    plugins: [
      vue(),
      electron([
        {
          // Main process entry file of the Electron App.
          entry: 'electron/main.ts',
          onstart(options) {
            // TODO: 开发时自动启动 Electron 应用
            if (options.startup) {
              options.startup()
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: 'dist-electron',
              rollupOptions: {
                external: Object.keys('dependencies' in require('./package.json') ? require('./package.json').dependencies : {}),
              },
            },
          },
        },
        {
          entry: 'electron/preload.ts',
          onstart(options) {
            // Notify the Renderer process to reload the page when the Preload scripts build is complete, 
            // instead of restarting the entire Electron App.
            options.reload()
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: 'dist-electron',
              rollupOptions: {
                external: Object.keys('dependencies' in require('./package.json') ? require('./package.json').dependencies : {}),
              },
            },
          },
        },
      ]),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      host: process.env.VITE_DEV_SERVER_HOST,
      port: process.env.VITE_DEV_SERVER_PORT ? +process.env.VITE_DEV_SERVER_PORT : 3000,
    },
    clearScreen: false,
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
      },
    },
    // TODO: 配置 CSS 预处理器和其他构建选项
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },
    },
  }
})