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
  loadYaml(yamlPath)

  chokidar.watch(yamlPath).on("change", () => {
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
