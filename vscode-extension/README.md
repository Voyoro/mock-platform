# Mockoro Helper

在 VS Code 中一键启动 Mockoro 服务，并监听当前工作区的 `mock.yaml`。

## 功能
- 命令：`Mockoro: Start` / `Mockoro: Stop`
- 自动把当前工作区的 `mock.yaml` 路径注入为环境变量 `MOCK_YAML_PATH`
- 服务端保留原本本地启动逻辑，未注入该变量时，仍读取项目根 `mock.yaml`

## 配置
- `mockoro.serverProjectPath`：Mockoro 服务项目的根目录（包含 `package.json`）绝对路径
- `mockoro.autoStart`：VS Code 启动后自动启动服务

## 使用步骤
1. 在 VS Code 设置中配置 `mockoro.serverProjectPath` 为你的 Mockoro 项目根路径
2. 打开含有 `mock.yaml` 的任意工作区
3. 运行命令 `Mockoro: Start`
4. 修改 `mock.yaml` 后，Mockoro 会自动热加载
5. 需要停止时运行 `Mockoro: Stop`

## 开发与打包
```bash
# 在 vscode-extension 目录内安装依赖并构建
npm i
npm run compile
# 若需打包 VSIX
npm run package
```

