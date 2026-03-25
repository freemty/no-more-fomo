# Deep Layer Pipeline — 信息获取工具充分利用

**Date:** 2026-03-25
**Status:** Draft
**Scope:** SKILL.md 流程升级 + config 扩展

## Problem

no-more-fomo 的 digest 流程未充分利用已安装的信息获取工具：

| 工具 | 已用能力 | 未用能力 |
|------|---------|---------|
| **youtube-transcript** | 完全未用 | 章节分割、说话者识别、缓存、批量下载、多语言 |
| **xreach** | `tweets` | `search`（全 Twitter 搜索）、`thread`（对话链） |
| **Jina Reader** | `r.jina.ai`（阅读） | `s.jina.ai`（搜索发现） |
| **yt-dlp** | 自动字幕下载 | 被 youtube-transcript 替代 |

播客摘要质量尤其不足——部分集只有标题，缺乏基于 transcript 的结构化总结。

## Solution: Two-Phase Pipeline

将 digest 生成拆为两个阶段。Phase 1 保持现有速度，Phase 2 异步补充深度内容。

### Architecture

```
Phase 1: Quick Layer (现有流程，微调)
  并行 fetch: Twitter KOLs + Blogs + RSS + arxiv + HN + HuggingFace
  → Parse → Filter → Enrich → Categorize
  → 输出基础 digest (播客带占位符)
  → 提取当天高频话题 (内存中，传给 Phase 2)

Phase 2: Deep Layer (新增，三个子任务并行)
  ├── Podcast Deep: youtube-transcript → 说话者识别 → 结构化摘要
  ├── Topic Search: xreach search 补充高频话题的社区讨论
  └── Discovery: s.jina.ai 发现 arxiv/HN 之外的内容
  → 逐个子任务完成后立即回填更新 digest 文件
```

Phase 1 完成后立即保存文件，用户不用等 Phase 2。Phase 2 任何子任务失败不影响基础 digest。

## Phase 2 Detail: Podcast Deep

### 流程

```
Phase 1 (Quick):
  RSS fetch → 提取新 episode 列表 (title, date, link)
  → 对每集: 找到 YouTube URL (yt-dlp ytsearch 或 RSS 中的 link)
  → digest 中写入: 标题 + 日期 + 链接 + "⏳ 深度摘要生成中..."

Phase 2 (Deep): 并行处理每集新 episode
  Step 1: youtube-transcript 下载
    bun {baseDir}/scripts/main.ts VIDEO_URL
      --chapters --speakers
      --languages en,zh
      --output-dir ~/no-more-fomo/.cache/pods

  Step 2: AI 说话者识别 (sub-agent)
    读取生成的 .md + prompts/speaker-transcript
    → 识别 host vs guest
    → 标注说话者 + 时间戳

  Step 3: AI 结构化摘要 (同一 sub-agent)
    输入: 说话者标注的 transcript + 章节
    输出: TLDR + 章节要点 + 关键引用
```

### 输出格式

所有播客摘要默认中文输出。说话者名字保留英文原名，技术术语保留原文。

```markdown
## Podcasts (Last 7 Days)

- **[Dwarkesh]** Terence Tao — Kepler, Newton, and Mathematical Discovery (Mar 20) | [link](URL)

  **TLDR:** Tao 认为 AI 已将假设生成成本降至接近零，验证成为新瓶颈。
  同行评审正被 AI 生成的投稿淹没。人机混合在数学领域的主导地位将
  比预期持续更久。

  **章节:**
  - *开普勒——高温采样的 LLM* — 二十年随机尝试各种轨道形状，
    最终靠第谷的精确数据破解
  - *验证是新瓶颈* — 生成想法已经很廉价，判断哪些想法重要
    需要数十年的学科文化积累
  - *数学发现的未来* — AI 不会取代数学家，但会重塑"做数学"的含义

  **关键引用:**
  > **Terence Tao:** "开普勒本质上在运行一个高温采样过程——
  > 用二十年时间尝试每一种可能的轨道形状。" [00:15:32]
  >
  > **Dwarkesh Patel:** "所以你是说，犯错的成本在正确的成本之前
  > 就先降为零了？" [00:22:10]
```

### 缓存策略

- youtube-transcript 自带缓存：`~/no-more-fomo/.cache/pods/{channel}/{title}/`
- 同一集二次运行直接读缓存，跳过下载
- AI 摘要结果也缓存到同目录：`summary.md`
- Phase 2 检查 `summary.md` 存在 → 直接读取，不重新生成

### Fallback 链

```
youtube-transcript → 完整结构化摘要 (TLDR + 章节 + 引用)
  ↓ 失败 (字幕不可用)
yt-dlp --write-auto-sub → 纯文本 transcript → 简化摘要 (无章节/说话者)
  ↓ 失败
Jina Reader (Substack post) → 从文章提取要点 (Latent Space, Dwarkesh)
  ↓ 失败
保留 Phase 1 的基础条目 (标题+描述)
```

## Phase 2 Detail: Topic Search

### 定位

保守使用。不作为独立信源，只为已有条目补充社区讨论广度信号。

### 流程

```
Phase 1 结束时:
  扫描 digest 所有条目 → 提取高频实体:
  - 论文名 (出现 2+ 次的 arxiv paper)
  - 模型名 (被多人提及的 model release)
  - 工具名 (被多人讨论的 repo/product)
  → 得到 3-5 个高频话题

Phase 2 - Topic Search:
  对每个高频话题:
    xreach search "TOPIC_NAME" --type top -n 15 --json
    → 过滤: likeCount > 200, 排除已有 KOL 的推文 (去重)
    → 提取: 有价值的外部视角 (不同意见、补充信息、使用反馈)
    → 追加到对应条目
```

### 输出格式

```markdown
- **OpenCode** — TypeScript 开源 AI coding agent... | [github](...) | HN 673 pts
  > 社区热议: 多名开发者反馈在大型 monorepo 上表现优于 Cursor，
  > 但插件生态尚不成熟 (来自 5 条高互动推文)
```

### 限制

- 最多搜索 5 个话题
- 每个话题最多补充 2-3 条外部视角
- 搜索结果和 KOL 推文高度重复 (>80%) → 跳过该话题
- xreach search 失败 → 静默跳过

## Phase 2 Detail: Discovery Layer

### 定位

用 Jina 搜索模式发现 arxiv API + HN 之外的内容。

### 流程

```
读取 config.yaml 中的 papers.topics (默认: "AI agent", "LLM")

对每个 topic:
  curl -s "https://s.jina.ai/latest+TOPIC+research+2026+march"
  → 返回 5-10 条搜索结果 (title + URL + snippet)
  → 去重: 排除已在 digest 中出现的 URL
  → 过滤: 只保留技术内容
  → 每个 topic 保留 2-3 条新发现
```

### 输出格式

```markdown
## 发现 (Beyond arxiv/HN)
来自全网搜索的技术内容，未被 KOL 推文或 HN 覆盖。

- **[博客]** Scaling Laws for Agent Tool Use — Deeplearning.ai 深度分析
  agent 工具调用的 scaling behavior | [link](...)
- **[会议]** ICLR 2026 Outstanding Paper: ReasonFlux — 基于 flow matching
  的推理加速框架 | [link](...)
```

### 限制

- 最多搜索 3 个 topic
- 每个 topic 最多补充 3 条
- 去重是硬性的：和 digest 已有 URL 任何匹配都跳过
- s.jina.ai 失败 → 静默跳过，不新增 section

## File Update Mechanism

```
Phase 1 → 写入 ~/no-more-fomo/YYYY-MM-DD.md (完整基础 digest)
Phase 2 → 读取同一文件，定向更新:
  1. 播客: 找到 "⏳ 深度摘要生成中..." → 替换为结构化摘要
  2. Topic Search: 找到对应条目 → 追加社区热议备注
  3. Discovery: 在 "---" 分隔线前插入 "## 发现" section
```

逐个子任务完成后立即写入文件。

Phase 2 全部完成后更新 Sources 行：

```markdown
Sources: Tier1-KOLs(12) arxiv(20) Labs(4) Podcasts(7,深度摘要4) HN(2) 社区补充(3) 发现(5)
```

## Config Extension

```yaml
# ~/.no-more-fomo/config.yaml (新增部分)

podcasts:
  depth: full          # full | tldr | none
                       #   full = TLDR + 章节 + 引用 (默认)
                       #   tldr = 只生成 TLDR (3句)
                       #   none = 只有标题+描述 (跳过 Phase 2)
  max_episodes: 3      # 每个播客最多处理几集 (默认 3)
  cache_dir: ~/no-more-fomo/.cache/pods

discovery:
  enabled: true        # 是否启用 s.jina.ai 发现层
  max_per_topic: 3     # 每个 topic 最多补充几条

topic_search:
  enabled: true        # 是否启用 xreach search 补充
  min_mentions: 2      # 实体被提及几次才触发搜索
  max_topics: 5        # 最多搜索几个话题

language: zh           # 默认改为 zh
```

### 默认行为（无 config 时）

| 设置 | 默认值 |
|------|--------|
| `podcasts.depth` | `full` |
| `podcasts.max_episodes` | `3` |
| `discovery.enabled` | `true` |
| `topic_search.enabled` | `true` |
| `language` | `zh` |

### 新增 CLI Flag

- `--quick`：跳过 Phase 2，只出基础 digest
- `--transcripts` flag 保留但行为变化：Phase 2 默认就做深度摘要，此 flag 变为 no-op

### 向后兼容

所有新字段都有默认值。现有用户的 config.yaml 不需要改动。

## Non-Goals

- Playwright/browse 集成：当前场景不需要 JS 渲染，curl + Jina 足够
- WebFetch 替代 Jina：token 成本过高，不适合批量
- xreach search 作为独立信源：噪音太大，只做补充
- 播客预处理 cron：增加架构复杂度和分发门槛
