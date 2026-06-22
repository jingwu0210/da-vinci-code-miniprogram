# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WeChat Mini Program (微信小程序) using WeChat Cloud Development (微信云开发 / CloudBase / TCB). This is a quickstart/demo project that showcases CloudBase's core capabilities: database, cloud functions, cloud storage, CloudRun (containers), and AI integration.

- **AppID**: `wx27833863a4d377ce`
- **WeChat Base Library**: v3.16.1 (private config), v2.20.1 (shared config)
- **CloudBase Environment**: configured in `miniprogram/app.js` → `globalData.env` (currently empty, must be set per-developer)

## Development

This project has no CLI build/lint/test toolchain. All development happens inside **WeChat DevTools** (微信开发者工具).

1. Open the project root in WeChat DevTools
2. The tool reads `project.config.json` → `miniprogramRoot: "miniprogram/"`, `cloudfunctionRoot: "cloudfunctions/"`
3. Hot reload is enabled in `project.private.config.json` (`compileHotReLoad: true`)
4. To deploy cloud functions: right-click `cloudfunctions/quickstartFunctions` in DevTools → 上传并部署-云端安装依赖

## Architecture

```
├── miniprogram/           # Mini Program frontend (source root)
│   ├── app.js             # App entry — wx.cloud.init() with env ID
│   ├── app.json           # Page registration, window config
│   ├── pages/
│   │   ├── index/         # Home: expandable list of CloudBase capabilities
│   │   └── example/       # Multi-purpose demo page driven by ?type= param
│   └── components/
│       └── cloudTipModal/ # Error/info modal (env not found, deploy needed, etc.)
├── cloudfunctions/
│   └── quickstartFunctions/  # Single cloud function dispatching by event.type
│       ├── index.js          # Switch on type: getOpenId, createCollection, selectRecord, etc.
│       ├── config.json       # Permissions: openapi.wxacode.get
│       └── package.json      # Dep: wx-server-sdk ~2.4.0
├── project.config.json       # Shared WeChat project settings
└── project.private.config.json  # Per-developer overrides (hot reload, lib version)
```

### Page routing

- **`pages/index/index`** — Home page listing CloudBase features (cloud hosting, cloud functions, database, storage, AI). Tapping an item navigates to the example page with a `type` parameter.
- **`pages/example/index`** — Demo/detail page. Behavior driven entirely by `options.type` in `onLoad`:
  - `getOpenId` / `getMiniProgramCode` / `createCollection` / `selectRecord` / `uploadFile` — run corresponding cloud function and display result
  - `cloudbaserun` — call CloudRun container via `wx.cloud.Cloud.callContainer`
  - `model-guide` — static guide showing Agent-UI integration steps
  - `ai-assistant` — guide for installing the WeChat DevTools AI Toolkit extension

### Cloud function dispatch pattern

`quickstartFunctions/index.js` exports a single `main` function that switches on `event.type` and delegates to private async functions (`getOpenId`, `createCollection`, `selectRecord`, `updateRecord`, `insertRecord`, `deleteRecord`, `getMiniProgramCode`). This is the standard pattern for a single multi-purpose cloud function in CloudBase quickstart projects.

### Environment check pattern

Before any cloud call, `index.js` checks `app.globalData.env` (unless `skipEnvCheck: true`). If unset, it shows a modal prompting the user to configure the env ID in `miniprogram/app.js`. Cloud function call errors with `"Environment not found"` or `"FunctionName parameter could not be found"` are caught and shown via `cloudTipModal`.

## CloudBase Skills & Tools

This project has CloudBase skills installed for Claude Code:

- **Skill** (`.agents/skills/cloudbase/SKILL.md`): Comprehensive CloudBase development skill covering WeChat Mini Program, cloud functions, databases, AI models, auth, CloudRun, storage, ops, and spec workflows. 72 sub-agents. Invoke with `Skill("cloudbase")`.
- **Plugin** (`cloudbase@tencent-cloudbase` v0.1.0): MCP server providing CloudBase tools. Two MCP servers registered — run `/reload-plugins` after first install.

When developing CloudBase features, prefer using the `cloudbase` skill for guidance on SDK APIs, database operations, auth patterns, and deployment.