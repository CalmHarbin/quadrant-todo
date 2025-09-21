# 构建说明

## 🚀 自动构建（推荐）

本项目使用GitHub Actions进行自动跨平台构建。

### 触发构建

1. **通过标签触发**（推荐）：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **手动触发**：
   - 访问GitHub仓库的Actions页面
   - 选择"Build and Release"工作流
   - 点击"Run workflow"

### 构建产物

构建完成后，会在GitHub Releases中自动创建发布，包含：

- **Windows**: 安装包(.exe)和便携版(.zip)
- **macOS**: Intel和Apple芯片版本的DMG文件
- **Linux**: AppImage文件

## 🛠️ 本地构建

### Windows
```bash
npm run build:win
```

### macOS（需要在macOS系统上）
```bash
npm run build:mac
```

### Linux
```bash
npm run build:linux
```

## 📁 构建产物位置

- Windows: `release/1.0.0/`
- macOS: `release/1.0.0/`
- Linux: `release/1.0.0/`

## 🔧 开发环境

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 类型检查
npm run type-check
```

## 📝 注意事项

- macOS构建必须在macOS系统上进行
- 确保有足够的磁盘空间（至少2GB）
- 构建过程中会下载Electron二进制文件
