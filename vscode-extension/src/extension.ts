import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as net from 'net'
import { spawn, ChildProcess } from 'child_process'

let serverProcess: ChildProcess | undefined
let currentPort: number | undefined
let yamlWatcher: vscode.FileSystemWatcher | undefined

async function ensureServerProjectPath(context: vscode.ExtensionContext): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration()
  let serverProjectPath = config.get<string>('mockoro.serverProjectPath') || ''

  // 尝试推断：扩展所在目录的上一级（即本仓库根）
  if (!serverProjectPath) {
    const candidate = path.resolve(context.extensionUri.fsPath, '..')
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
      serverProjectPath = candidate
      await config.update('mockoro.serverProjectPath', serverProjectPath, vscode.ConfigurationTarget.Global)
    }
  }

  // 仍未获得则提示用户选择
  if (!serverProjectPath) {
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: '选择 Mockoro 服务项目根目录（包含 package.json）'
    })
    if (!picked || picked.length === 0) return undefined
    serverProjectPath = picked[0].fsPath
    await config.update('mockoro.serverProjectPath', serverProjectPath, vscode.ConfigurationTarget.Global)
  }

  return serverProjectPath
}

async function pickWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders
  if (!folders || folders.length === 0) return undefined
  if (folders.length === 1) return folders[0]
  const picks = folders.map(f => ({ label: f.name, description: f.uri.fsPath, folder: f }))
  const selected = await vscode.window.showQuickPick(picks, { placeHolder: '选择要监听的工作区（用于定位 mock.yaml）' })
  return selected?.folder
}

function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.once('close', () => resolve(true)).close())
      .listen(port, '127.0.0.1')
  })
}

async function findAvailablePort(start: number, end: number): Promise<number> {
  for (let p = start; p <= end; p++) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await checkPortAvailable(p)
    if (ok) return p
  }
  // 若全部占用，退回默认 3000
  return 3000
}

function ensureYamlWatcher(folder: vscode.WorkspaceFolder, port: number) {
  if (yamlWatcher) {
    return
  }
  const pattern = new vscode.RelativePattern(folder, 'mock.yaml')
  yamlWatcher = vscode.workspace.createFileSystemWatcher(pattern)
  const notify = () => {
    vscode.window.showInformationMessage(`Mockoro 当前端口: http://localhost:${port}`)
  }
  yamlWatcher.onDidChange(() => notify())
  yamlWatcher.onDidCreate(() => notify())
  yamlWatcher.onDidDelete(() => notify())
}

async function startMockoro(context: vscode.ExtensionContext) {
  if (serverProcess) {
    vscode.window.showInformationMessage('Mockoro 已在运行')
    return
  }

  const folder = await pickWorkspaceFolder()
  if (!folder) {
    vscode.window.showErrorMessage('未检测到工作区，请先打开一个文件夹')
    return
  }

  const serverProjectPath = await ensureServerProjectPath(context)
  if (!serverProjectPath) return

  const testYamlPath = path.join(folder.uri.fsPath, 'mock.yaml')

  currentPort = await findAvailablePort(3000, 3999)

  serverProcess = spawn('npm', ['run', 'dev', '--silent'], {
    cwd: serverProjectPath,
    env: { ...process.env, MOCK_YAML_PATH: testYamlPath, NODE_ENV: 'development', PORT: String(currentPort), NITRO_PORT: String(currentPort) },
    shell: true
  })

  serverProcess.stdout?.on('data', (d) => console.log('[mockoro]', d.toString()))
  serverProcess.stderr?.on('data', (d) => console.error('[mockoro]', d.toString()))
  serverProcess.on('exit', (code) => {
    console.log('[mockoro] exit with code', code)
    serverProcess = undefined
  })

  ensureYamlWatcher(folder, currentPort)
  vscode.window.showInformationMessage(`Mockoro 已启动: http://localhost:${currentPort}`)
}

async function stopMockoro() {
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

export function activate(context: vscode.ExtensionContext) {
  const start = vscode.commands.registerCommand('mockoro.start', () => startMockoro(context))
  const stop = vscode.commands.registerCommand('mockoro.stop', () => stopMockoro())

  context.subscriptions.push(start, stop)

  const autoStart = vscode.workspace.getConfiguration().get<boolean>('mockoro.autoStart')
  if (autoStart) {
    startMockoro(context)
  }
}

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


