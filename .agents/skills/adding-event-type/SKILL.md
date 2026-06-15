---
name: adding-event-type
description: Use when extending event support in opencode-stats-engine, such as new SDK events, missing projections, or schema changes
---

# 新增事件类型

## Overview

新增事件类型需要横跨共享类型、转换器、注册、投影和测试五个层级，漏掉任何一步都会导致数据流断裂。

## When to Use

- OpenCode SDK 新增了需要持久化的事件
- Dashboard 统计缺失某类事件的数据
- 现有事件需要补充投影字段
- 需要为新事件扩展数据库 schema

## When NOT to Use

- 修复已有转换器的 bug（直接改对应文件）
- 仅调整 Dashboard 前端展示（不涉及后端事件处理）
- 修改现有事件的 schema 但不需要新增事件类型

## Quick Reference

| 步骤 | 文件/目录 | 操作 |
|------|----------|------|
| 1 | `packages/shared/src/types/events.ts` | 更新 `StatsEvent` 联合类型 |
| 2 | `packages/engine/src/event/converters/` | 新增转换器，导出 `eventType` 和 `convert` |
| 3 | `packages/engine/src/event/converter.ts` | 在 `REGISTERED` 中注册 |
| 4 | `packages/engine/src/projection/` | 如需投影，更新 handler 的 `handles` |
| 5 | `packages/engine/src/db/migrations/` | 如需新列，新增迁移并更新 schema |
| 6 | `packages/engine/tests/event/` | 添加转换器测试，必要时补投影/API 测试 |

## Constraints

- 禁止将 `tool_input`、`tool_output`、`message_body`、`raw_input`、`raw_output` 写入元数据
- `*_ms` 字段保持 UTC 毫秒 epoch，时区转换只在 Dashboard API 边界做
- 运行时只用 Bun，模块系统保持 ESM，代码检查用 Biome

## Common Mistakes

- 新增转换器但忘记在 `REGISTERED` 中注册
- 写了投影 handler 但没更新 `handles` 数组
- 写了迁移文件但没更新 schema 定义
- 测试只覆盖转换器，没覆盖投影逻辑
