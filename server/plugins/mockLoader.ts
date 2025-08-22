import { initMockLoader } from "../../utils/mockLoader"

export default async function mockLoaderPlugin(nitroApp: any) {

  initMockLoader()

  nitroApp.hooks.hook("close", () => {
    console.log("[mockLoader] Nitro shutting down, cleanup if needed")
  })
}
