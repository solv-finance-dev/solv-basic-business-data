# Repository Guidelines

## 项目结构与模块组织 / Project Structure & Module Organization
- `src/` 为核心源码目录；`src/lib/` 放通用工具（如 `db.ts`, `secret.ts`），`src/models/` 为 Sequelize 模型，`src/evmEventMonitor.ts` 为主要入口脚本。 `src/` holds the main TypeScript code; `src/lib/` contains helpers, `src/models/` defines ORM models, and the two entry scripts are task runners.
- `build/` 是 `tsc` 编译输出目录。`build/` is the TypeScript build output.
- `config/` 用于配置文件；`.github/workflows/` 为部署流水线。`config/` stores configuration and `.github/workflows/` contains CI/CD pipelines.

## 构建、测试与本地运行 / Build, Test, and Development Commands
- `npm install`: 安装依赖。Install dependencies.
- `npm run build`: 编译 TypeScript 输出到 `build/`。Compile to `build/`.
- `npm test`: 当前为占位脚本（会直接退出）。Currently a placeholder.
- `npx ts-node src/evmEventMonitor.ts`: 本地运行入口脚本。Run entry scripts locally.
- `node build/okxTaskETH.js`: 编译后运行。Run compiled output.
- `docker build -t solv-basic-business-data .`: 构建 Docker 镜像。Build a Docker image.

## 代码风格与命名 / Coding Style & Naming Conventions
- 使用 TypeScript 严格模式（见 `tsconfig.json`）；缩进以制表符为主。TypeScript strict mode with tab-based indentation.
- 类名 PascalCase，变量/字段 camelCase；Sequelize 模型用装饰器定义。PascalCase classes, camelCase fields, decorator-based models.
- 代码注释使用中文；文件编码为 UTF-8（无 BOM）。Comments in Chinese; UTF-8 without BOM.

## 测试指南 / Testing Guidelines
- 当前未配置测试框架与覆盖率门槛；如需新增，建议引入 `tests/` 目录并补齐 `npm test`。No test framework is configured; add a `tests/` folder and wire `npm test` if needed.

## 提交与 PR 指南 / Commit & Pull Request Guidelines
- 未检测到 Git 历史（仓库无 `.git`），暂无既定提交规范。No git history detected; no enforced convention.
- 建议使用 Conventional Commits；PR 说明需包含变更目的、影响的脚本/模型、所需环境变量及潜在数据库影响。Use Conventional Commits; PRs should describe intent, affected scripts/models, required env vars, and DB impact.

## 安全与配置 / Security & Configuration Tips
- 依赖环境变量：`SECRET_ID`, `CDK_DEPLOY_REGION`, `DATABASE_NAME`, `DB_PROXY_HOSTNAME`, `API_VERIFY`, `CONFIG_ENV`。Requires these env vars.
- 禁止提交密钥；密钥通过 AWS Secrets Manager 获取。Do not commit secrets; retrieve them via AWS Secrets Manager.
