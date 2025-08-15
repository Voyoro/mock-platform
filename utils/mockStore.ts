import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

interface MockConfig {
  [key: string]: {
    method: string;
    stream?: boolean;
    fields: Record<string, any>;
    count?: number;
    interval?: number;
  };
}

const storeFile = join(process.cwd(), 'data', 'mockStore.json')

// 内存 Map
const mockMap = new Map<string, MockConfig>()

// 初始化：启动时从文件加载
if (existsSync(storeFile)) {
  try {
    const data = JSON.parse(readFileSync(storeFile, 'utf-8'))
    for (const [key, value] of Object.entries(data)) {
      mockMap.set(key, value as MockConfig)
    }
    console.log(`[mockStore] Loaded ${mockMap.size} records from file`)
  } catch (err) {
    console.error('[mockStore] Failed to load store:', err)
  }
}

// 保存到文件
function saveToFile() {
  const obj = Object.fromEntries(mockMap.entries())
  writeFileSync(storeFile, JSON.stringify(obj, null, 2), 'utf-8')
}

export function setMockConfig(id: string, config: MockConfig) {
  mockMap.set(id, config)
  saveToFile()
}

export function getMockConfig(id: string) {
  return mockMap.get(id)
}

export function deleteMockConfig(id: string) {
  mockMap.delete(id)
  saveToFile()
}

export function getAllMockConfigs() {
  return Array.from(mockMap.values())
}
