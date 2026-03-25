# no-more-fomo

> You wake up. 47 new arxiv papers. 200 AI tweets. 3 podcast episodes. A new model just dropped.
>
> You're already behind.
>
> **Or are you?**

One command. Every morning. Never miss what matters.

`/no-more-fomo` turns the firehose of AI news into a single enriched daily digest — with real summaries, real links, and real context. Not just headlines.

```
npx skills add freemty/no-more-fomo
```

**[See a real example digest](examples/2026-03-22.md)** to know exactly what you get.

## What makes this different

Most "AI news" tools give you a list of links. You still have to click each one, read it, and decide if it matters.

`/no-more-fomo` does the reading for you:

- Papers come with **2-3 sentence summaries from the actual arxiv abstract**
- Podcasts come with **structured summaries: TLDR, chapter breakdown, and speaker-attributed quotes** extracted from transcripts
- HN threads come with **context on why the community cares**
- Everything has **real links** — arxiv, GitHub, HuggingFace, not t.co
- Every digest also outputs a **styled HTML version** with three-view layout, dark mode, and date navigation

## Sources

| Category | What | Count |
|----------|------|-------|
| Twitter KOLs | @karpathy, @_akhaliq, @emollick, @simonw, @swyx, and 11 more | 16 default |
| AI Lab Blogs | DeepMind, Anthropic, OpenAI | 3 |
| Podcasts | No Priors, Latent Space, Dwarkesh, Training Data (Sequoia) | 4 |
| arxiv Papers | Topic-filtered search (default: AI agent + LLM) | per topic |
| HuggingFace Daily | Community-upvoted trending papers | top 20 |
| HackerNews | AI agent + broader AI/LLM stories | 2 queries |
| Company accounts | Cursor, xAI, Windsurf, Cognition, Replit, HuggingFace | 6 (with `--full`) |

## Usage

```bash
/no-more-fomo                    # Daily digest — all default sources
/no-more-fomo --full             # Also include company/product accounts
/no-more-fomo --transcripts      # (deprecated — Phase 2 does this automatically)
/no-more-fomo @someone           # Add any Twitter handle
/no-more-fomo --hn-only          # Just HackerNews
/no-more-fomo --quick           # Quick digest — skip deep processing
/no-more-fomo --no-html          # Markdown only, skip HTML output
/no-more-fomo --podcasts-only    # Just podcast feeds
```

Saves to `~/no-more-fomo/YYYY-MM-DD.md`.

## Customize your sources

Create `~/.no-more-fomo/config.yaml` to add/remove sources. You only specify what you want to change — everything else keeps the defaults.

```yaml
twitter:
  add:
    - handle: "@elonmusk"
      count: 15
    - handle: "@sama"
      count: 15
  remove:
    - "@ylecun"

podcasts:
  add:
    - name: "Lex Fridman"
      rss: "https://lexfridman.com/feed/podcast/"
      transcript: youtube

papers:
  topics:
    - query: "world model"
      categories: ["cs.AI", "cs.CV"]
    - query: "reinforcement learning"
      categories: ["cs.LG"]
  hf_daily: true
  min_hf_upvotes: 5

hn:
  extra_queries:
    - "robotics"

discovery:
  enabled: true
  max_per_topic: 3

topic_search:
  enabled: true

language: zh   # en | zh
```

See [SKILL.md](SKILL.md#user-config-optional) for the full config reference.

## Install

### Via skills.sh (recommended)

```bash
npx skills add freemty/no-more-fomo
```

Works with Claude Code, Cursor, Codex, Windsurf, and [15+ other agents](https://skills.sh).

### Manual

```bash
git clone https://github.com/freemty/no-more-fomo.git ~/.claude/skills/no-more-fomo
```

### Prerequisites

- [xreach](https://github.com/nicepkg/xreach) (`npm i -g xreach-cli`) — Twitter/X data
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — podcast transcripts (optional)
- [baoyu-youtube-transcript](https://github.com/nicepkg/xreach) (optional) — enhanced podcast transcript processing
- [bun](https://bun.sh) — runtime for youtube-transcript (optional)
- `curl` — RSS feeds and HN API (standard on all systems)

## Schedule it

### Claude Code Cloud (recommended)

Go to [preview.claude.ai/code](https://preview.claude.ai/code) → **Scheduled** → **+ New scheduled task**:

- **Name:** `no-more-fomo`
- **Prompt:** `run /no-more-fomo and save the digest`
- **Frequency:** Daily, 09:00 AM

Runs on cloud infra — no local machine needed.

### Local fallback (crontab)

```bash
0 9 * * * claude -p "run /no-more-fomo and save the digest" --allowedTools "Bash,Read,Write,Glob" --output-format stream-json >> /tmp/no-more-fomo.log 2>&1
```

## How it works

1. **Fetch** — pulls from all sources in parallel (16+ Twitter accounts, 3 blogs, 4 podcasts, HN)
2. **Parse** — extracts expanded URLs from tweet entities (never outputs t.co links)
3. **Filter** — last 24h for Twitter/HN, last 7 days for blogs/podcasts, quality thresholds
4. **Enrich** — fetches arxiv abstracts, GitHub descriptions, podcast transcripts
5. **Categorize** — Papers, Models, Tools, Agents, Lab Updates, Podcasts, HN, Industry
6. **Output** — structured markdown with summaries, links, and engagement metrics
7. **Render** — generates styled HTML from template with three-view layout (newspaper/sidebar/grid)

## More from freemty

- [claude-code-best-practices](https://github.com/freemty/claude-code-best-practices) — Workflow advisor skill — recommends the right skill, agent, or workflow for any task
- [labmate](https://github.com/freemty/labmate) — Research harness for Claude Code
- [cc-research-playbook](https://github.com/freemty/cc-research-playbook) — AI Research with Claude Code — slides, demos, and reference materials
- [ai-dotfiles](https://github.com/freemty/ai-dotfiles) — Sync AI CLI configs across machines with automatic API key redaction

## License

MIT
