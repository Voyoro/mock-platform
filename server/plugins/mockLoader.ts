import { initMockLoader } from "../../utils/mockLoader"

export default async function mockLoaderPlugin(nitroApp: any) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'
  if (isDevelopment) {
    console.log("[mockLoader] Nitro initializing in development mode")
    initMockLoader()
  } else if (isProduction) {
    console.log("[mockLoader] Nitro initializing in production mode")
    // 生产环境可能不需要初始化 mock loader
  }
  nitroApp.hooks.hook("close", () => {
    console.log("[mockLoader] Nitro shutting down, cleanup if needed")
  })
}