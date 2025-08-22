// utils/mockLoader.ts
import fs from "fs"
import yaml from "js-yaml"
import { setMockConfig } from "../store/mockStore";
import chokidar from "chokidar"
import { mockDB } from "../memoryDB";

let mockData: Record<string, any> = {}

function loadYaml(yamlPath: string) {
  const file = fs.readFileSync(yamlPath, "utf-8")
  const doc = yaml.load(file.toString());
  setMockConfig('admin', doc as any)
}

export function initMockLoader() {
  const yamlPath = process.env.MOCK_YAML_PATH || "mock.yaml"
  try {
    if (!fs.existsSync(yamlPath)) {
      console.warn(`[mockLoader] YAML not found yet: ${yamlPath}. Waiting for file creation...`)
    } else {
      loadYaml(yamlPath)
      console.log("[mockLoader] YAML loaded")
    }
  } catch (e) {
    console.error("[mockLoader] Failed to load YAML on start:", e)
  }

  const watcher = chokidar.watch(yamlPath)
  watcher.on("add", () => {
    try {
      mockDB.clear("admin")
      loadYaml(yamlPath)
      console.log("[mockLoader] YAML loaded (add)")
    } catch (e) {
      console.error("[mockLoader] Failed to load YAML on add:", e)
    }
  })
  watcher.on("change", () => {
    try {
      mockDB.clear("admin")
      loadYaml(yamlPath)
      console.log("[mockLoader] YAML reloaded")
    } catch (e) {
      console.error("[mockLoader] Failed to reload YAML:", e)
    }
  })
}
export function getMockData() {
  return mockData
}
