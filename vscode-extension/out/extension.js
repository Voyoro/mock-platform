"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const net = __importStar(require("net"));
const child_process_1 = require("child_process");
let serverProcess;
let currentPort;
let yamlWatcher;
async function ensureServerProjectPath(context) {
    const config = vscode.workspace.getConfiguration();
    let serverProjectPath = config.get('mockoro.serverProjectPath') || '';
    // 尝试推断：扩展所在目录的上一级（即本仓库根）
    if (!serverProjectPath) {
        const candidate = path.resolve(context.extensionUri.fsPath, '..');
        if (fs.existsSync(path.join(candidate, 'package.json'))) {
            serverProjectPath = candidate;
            await config.update('mockoro.serverProjectPath', serverProjectPath, vscode.ConfigurationTarget.Global);
        }
    }
    // 仍未获得则提示用户选择
    if (!serverProjectPath) {
        const picked = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: '选择 Mockoro 服务项目根目录（包含 package.json）'
        });
        if (!picked || picked.length === 0)
            return undefined;
        serverProjectPath = picked[0].fsPath;
        await config.update('mockoro.serverProjectPath', serverProjectPath, vscode.ConfigurationTarget.Global);
    }
    return serverProjectPath;
}
async function pickWorkspaceFolder() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0)
        return undefined;
    if (folders.length === 1)
        return folders[0];
    const picks = folders.map(f => ({ label: f.name, description: f.uri.fsPath, folder: f }));
    const selected = await vscode.window.showQuickPick(picks, { placeHolder: '选择要监听的工作区（用于定位 mock.yaml）' });
    return selected?.folder;
}
function checkPortAvailable(port) {
    return new Promise((resolve) => {
        const tester = net.createServer()
            .once('error', () => resolve(false))
            .once('listening', () => tester.once('close', () => resolve(true)).close())
            .listen(port, '127.0.0.1');
    });
}
async function findAvailablePort(start, end) {
    for (let p = start; p <= end; p++) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await checkPortAvailable(p);
        if (ok)
            return p;
    }
    // 若全部占用，退回默认 3000
    return 3000;
}
function ensureYamlWatcher(folder, port) {
    if (yamlWatcher) {
        return;
    }
    const pattern = new vscode.RelativePattern(folder, 'mock.yaml');
    yamlWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    const notify = () => {
        vscode.window.showInformationMessage(`Mockoro 当前端口: http://localhost:${port}`);
    };
    yamlWatcher.onDidChange(() => notify());
    yamlWatcher.onDidCreate(() => notify());
    yamlWatcher.onDidDelete(() => notify());
}
async function startMockoro(context) {
    if (serverProcess) {
        vscode.window.showInformationMessage('Mockoro 已在运行');
        return;
    }
    const folder = await pickWorkspaceFolder();
    if (!folder) {
        vscode.window.showErrorMessage('未检测到工作区，请先打开一个文件夹');
        return;
    }
    const serverProjectPath = await ensureServerProjectPath(context);
    if (!serverProjectPath)
        return;
    const testYamlPath = path.join(folder.uri.fsPath, 'mock.yaml');
    currentPort = await findAvailablePort(3000, 3999);
    serverProcess = (0, child_process_1.spawn)('npm', ['run', 'dev', '--silent'], {
        cwd: serverProjectPath,
        env: { ...process.env, MOCK_YAML_PATH: testYamlPath, NODE_ENV: 'development', PORT: String(currentPort), NITRO_PORT: String(currentPort) },
        shell: true
    });
    serverProcess.stdout?.on('data', (d) => console.log('[mockoro]', d.toString()));
    serverProcess.stderr?.on('data', (d) => console.error('[mockoro]', d.toString()));
    serverProcess.on('exit', (code) => {
        console.log('[mockoro] exit with code', code);
        serverProcess = undefined;
    });
    ensureYamlWatcher(folder, currentPort);
    vscode.window.showInformationMessage(`Mockoro 已启动: http://localhost:${currentPort}`);
}
async function stopMockoro() {
    if (!serverProcess) {
        vscode.window.showInformationMessage('Mockoro 未在运行');
        return;
    }
    serverProcess.kill();
    serverProcess = undefined;
    currentPort = undefined;
    if (yamlWatcher) {
        yamlWatcher.dispose();
        yamlWatcher = undefined;
    }
    vscode.window.showInformationMessage('Mockoro 已停止');
}
function activate(context) {
    const start = vscode.commands.registerCommand('mockoro.start', () => startMockoro(context));
    const stop = vscode.commands.registerCommand('mockoro.stop', () => stopMockoro());
    context.subscriptions.push(start, stop);
    const autoStart = vscode.workspace.getConfiguration().get('mockoro.autoStart');
    if (autoStart) {
        startMockoro(context);
    }
}
function deactivate() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = undefined;
    }
    if (yamlWatcher) {
        yamlWatcher.dispose();
        yamlWatcher = undefined;
    }
}
//# sourceMappingURL=extension.js.map