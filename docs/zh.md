# no-more-fomo

> 每天醒来，47 篇新 arxiv 论文、200 条 AI 推文、3 期播客、又一个新模型发布。
>
> 你已经落后了。
>
> **真的吗？**

一条命令，每天早上，不再错过重要的事。

## 安装

```bash
npx skills add freemty/no-more-fomo
```

或手动：

```bash
git clone https://github.com/freemty/no-more-fomo.git ~/.claude/skills/no-more-fomo
```

## 用法

```bash
/no-more-fomo                    # 每日简报 — 所有默认源
/no-more-fomo --full             # 加上公司/产品账号
/no-more-fomo --transcripts      # (deprecated — Phase 2 默认启用)
/no-more-fomo @someone           # 临时加 Twitter 账号
/no-more-fomo --quick           # 快速简报 — 跳过深度处理
/no-more-fomo --no-html          # 只生成 markdown，跳过 HTML
```

## 数据源

**Twitter KOL (16个默认)：** @karpathy、@_akhaliq、@emollick、@simonw、@swyx、@dotey(宝玉)、@bcherny、@oran_ge、@trq212、@drjimfan、@hardmaru、@ylecun、@cursor_ai、@AnthropicAI、@OpenAI、@GoogleDeepMind

**AI Lab 博客：** DeepMind、Anthropic、OpenAI

**播客 (4个)：** No Priors、Latent Space、Dwarkesh Podcast、Training Data (Sequoia)

**HackerNews：** AI agent + 广义 AI/LLM 故事

## 和其他 "AI 新闻" 工具的区别

大多数工具给你一堆链接，你还得自己点进去看。`/no-more-fomo` 帮你读：

- 论文附带 **arxiv abstract 的 2-3 句话摘要**
- 播客附带 **结构化摘要：TLDR + 章节要点 + 说话者标注的关键引用**
- HN 帖子附带 **社区关注原因的上下文解释**
- 所有条目都有 **真实链接** — arxiv、GitHub、HuggingFace，不是 t.co
- 每份 digest 同时输出 **HTML 可视化版本**，支持三种布局、暗色主题、日期导航

## 前置依赖

- [xreach](https://github.com/nicepkg/xreach) (`npm i -g xreach-cli`) — Twitter 数据
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — 播客字幕（可选）
- [baoyu-youtube-transcript](optional) — 增强播客 transcript 处理
- [bun](https://bun.sh) — youtube-transcript 运行时（可选）
- `curl` — RSS 和 HN API

## 定时运行

```bash
claude -p "run /no-more-fomo and save the report" \
  --allowedTools "Bash,Read,Write,Glob" \
  --output-format stream-json
```

推荐每天早上 9:00 运行。

## 更多工具

- [labmate](https://github.com/freemty/labmate) — Claude Code 研究助手
- [agent-reach](https://github.com/nicepkg/xreach) — 给 AI agent 接入全网数据
