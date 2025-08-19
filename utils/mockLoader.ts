// utils/mockLoader.ts
import fs from "fs"
import yaml from "js-yaml"
import { setMockConfig } from "./mockStore";
import chokidar from "chokidar"

let mockData: Record<string, any> = {}

function loadYaml() {
  const file = fs.readFileSync("test.yaml", "utf-8")
  const doc = yaml.load(file.toString());
  setMockConfig('admin', doc as any)
}

export function initMockLoader() {
  loadYaml()

  chokidar.watch("test.yaml").on("change", () => {
    try {
      loadYaml()
      console.log("[mockLoader] YAML reloaded")
    } catch (e) {
      console.error("[mockLoader] Failed to reload YAML:", e)
    }
  })
}
export function getMockData() {
  return mockData
}
