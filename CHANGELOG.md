# Changelog

## [1.1.0] - 2026-07-24

### Added
- 可交互的自定义 HTML 图例（点击切换 series 显示/隐藏），支持 flex-wrap 自动换行
- 模型对比、效率分析、工具调用、概览、项目对比页面的自定义图例

### Fixed
- 修复 ECharts 内建图例 series 过多时与图表重叠（grid.top 固定）
- 修复切换时间范围后图例状态残留（replaceMerge: ['series']）
- 修复深色模式切换时间范围时白色闪烁（backgroundColor + loading 遮罩主题化）
- 修复模型对比错误详情超长消息重叠其他列（text-overflow: ellipsis）

### Internal
- 图表组件拆分：BaseChart 统一管理 loading 遮罩与画布背景色
- 各视图 watch(selectedPeriod) 时重置 hidden* 状态

## [1.0.0] - 2026-06-17

### Added
- Bilingual README (English/Chinese) with language switch links
- English dashboard screenshots (`*-en.png`)

### Changed
- Updated dashboard screenshots for overview, efficiency, models, sessions, tools, projects

### Notes
- This is the first stable release (v1.0.0)
- No breaking changes from v1.0.0-beta.5
- All APIs and projections remain backward compatible
