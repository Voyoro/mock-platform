import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as net from 'net'
import { spawn, ChildProcess } from 'child_process'

let serverProcess: ChildProcess | undefined
let currentPort: number | undefined
let yamlWatcher: vscode.FileSystemWatcher | undefined

// 检查端口是否可用
function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.once('close', () => resolve(true)).close())
      .listen(port, '127.0.0.1')
  })
}

// 查找可用端口
async function findAvailablePort(start: number, end: number): Promise<number> {
  for (let p = start; p <= end; p++) {
    const ok = await checkPortAvailable(p)
    if (ok) return p
  }
  return 3000
}

// 获取打包后的服务目录
function getServerPath(context: vscode.ExtensionContext) {
  // VSIX 打包后 server 放在 out/server
  return path.join(context.extensionPath, 'out', 'server')
}

// 获取工作区的 mock.yaml 路径
function getYamlPath(): string | undefined {
  const folders = vscode.workspace.workspaceFolders
  if (!folders || folders.length === 0) return undefined
  const folder = folders[0] // 默认取第一个工作区
  const yamlPath = path.join(folder.uri.fsPath, 'mock.yaml')
  return fs.existsSync(yamlPath) ? yamlPath : undefined
}

// 监听 mock.yaml 变化
function ensureYamlWatcher(folder: vscode.WorkspaceFolder, port: number) {
  if (yamlWatcher) return

  const pattern = new vscode.RelativePattern(folder, 'mock.yaml')
  yamlWatcher = vscode.workspace.createFileSystemWatcher(pattern)

  const notify = () => {
    if (serverProcess) {
      serverProcess.kill()
      serverProcess = undefined
    }
  }

  yamlWatcher.onDidChange(() => notify())
  yamlWatcher.onDidCreate(() => notify())
  yamlWatcher.onDidDelete(() => notify())
}

// 启动服务
async function startServer(context: vscode.ExtensionContext) {
  if (serverProcess) {
    vscode.window.showInformationMessage('Mockoro 已在运行')
    return
  }

  const folder = vscode.workspace.workspaceFolders?.[0]
  if (!folder) {
    vscode.window.showErrorMessage('未检测到工作区，请先打开一个文件夹')
    return
  }

  const serverPath = getServerPath(context)
  const yamlPath = getYamlPath()
  currentPort = await findAvailablePort(3000, 3999)

  if (!fs.existsSync(serverPath)) {
    vscode.window.showErrorMessage('服务目录不存在: ' + serverPath)
    return
  }

  const env: NodeJS.ProcessEnv & { MOCK_YAML_PATH?: string } = {
    ...process.env,
    PORT: String(currentPort),
    NITRO_PORT: String(currentPort),
  }

  if (yamlPath) {
    env.MOCK_YAML_PATH = yamlPath
  }

  const entry = path.join(serverPath, 'index.mjs')
  console.log('spawning node', entry, 'cwd', serverPath)

  serverProcess = spawn(process.execPath, [entry], {
    cwd: serverPath,
    env,
    shell: false,
  })
  console.log(env)

  serverProcess.stdout?.on('data', (d) => console.log('[mockoro]', d.toString()))
  serverProcess.stderr?.on('data', (d) => console.error('[mockoro]', d.toString()))
  serverProcess.on('exit', (code) => {
    console.log('[mockoro] exit with code', code)
    serverProcess = undefined
  })

  // ensureYamlWatcher(folder, currentPort)
  vscode.window.showInformationMessage(`Mockoro 已启动: http://localhost:${currentPort}`)
}

// 停止服务
function stopServer() {
  if (!serverProcess) {
    vscode.window.showInformationMessage('Mockoro 未在运行')
    return
  }
  serverProcess.kill()
  serverProcess = undefined
  currentPort = undefined

  if (yamlWatcher) {
    yamlWatcher.dispose()
    yamlWatcher = undefined
  }

  vscode.window.showInformationMessage('Mockoro 已停止')
}

// 激活插件
export function activate(context: vscode.ExtensionContext) {
  const start = vscode.commands.registerCommand('mockoro.start', () => startServer(context))
  const stop = vscode.commands.registerCommand('mockoro.stop', () => stopServer())
  context.subscriptions.push(start, stop)

  const autoStart = vscode.workspace.getConfiguration().get<boolean>('mockoro.autoStart')
  if (autoStart) {
    startServer(context)
  }
}

// 注销插件
export function deactivate() {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = undefined
  }
  if (yamlWatcher) {
    yamlWatcher.dispose()
    yamlWatcher = undefined
  }
}
