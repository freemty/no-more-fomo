---
name: no-more-fomo
description: >
  Use when user says 'fomo', 'digest', 'daily', 'AI news', 'today's papers',
  'what's new in AI', 'catch up', or on a scheduled daily cron trigger.
---

# No More FOMO

Daily AI intelligence briefing: Twitter KOLs + AI lab blogs + tech podcasts + HackerNews.

**IMPORTANT: Primary digest is always in English.** After generating the English version, automatically translate to Chinese and save as `YYYY-MM-DD-zh.md` (skip with `--en-only`). Both versions get HTML rendering. Speaker names, model names, and technical terms stay in original form in both versions.

## When to Use

- User asks about today's AI papers, news, or trending research
- Morning routine check-in on new releases
- Scheduled daily cron trigger

**When NOT to use:** Searching for a specific paper (use WebFetch or arxiv directly).

## Prerequisites

- **xreach** (`npm i -g xreach-cli`) — Twitter/X data. Requires auth: `xreach auth`
- **curl** — RSS feeds and HN API (standard on all systems)
- **Jina Reader** — free, no auth needed (`https://r.jina.ai/URL`)
- **baoyu-youtube-transcript** (optional) — podcast transcript download with chapters and speaker detection. Path: `~/.claude/plugins/ljg-skills/.agents/skills/baoyu-youtube-transcript`. If not installed, falls back to yt-dlp.
- **bun** (optional) — runtime for youtube-transcript scripts. Required only if youtube-transcript is installed.
- **yt-dlp** — podcast YouTube subtitles (fallback if youtube-transcript unavailable)

## Sources

### Twitter — Tier 1: KOLs (Default, always fetched)

| Handle | Who | Focus | Count |
|--------|-----|-------|-------|
| @_akhaliq | AK | Papers, models, tools — highest signal/volume | `-n 50` |
| @karpathy | Andrej Karpathy | Deep insights, tutorials, AI commentary | `-n 20` |
| @dotey | Baoyu | Chinese AI community, translations, commentary | `-n 30` |
| @bcherny | Boris Cherny | Claude Code core dev, coding agents | `-n 20` |
| @oran_ge | OrangeAI | AI research, tools, commentary | `-n 20` |
| @trq212 | Thariq | Claude Code core dev | `-n 20` |
| @swyx | swyx | Latent Space host, AI engineering ecosystem | `-n 20` |
| @emollick | Ethan Mollick | Wharton professor, AI adoption & impact | `-n 20` |
| @drjimfan | Jim Fan | NVIDIA robotics/embodied AI research | `-n 20` |
| @simonw | Simon Willison | LLM tooling, Datasette creator, pragmatic builder | `-n 20` |
| @hardmaru | David Ha | Sakana AI CEO, creative AI research | `-n 20` |
| @ylecun | Yann LeCun | Meta/NYU, AI theory debates, high signal | `-n 20` |
| @cursor_ai | Cursor | AI-native code editor | `-n 15` |
| @AnthropicAI | Anthropic | Claude, safety research | `-n 15` |
| @OpenAI | OpenAI | GPT, API, product launches | `-n 15` |
| @GoogleDeepMind | Google DeepMind | Models, research papers | `-n 15` |

### Twitter — Tier 2: More Companies & Tools (on-demand via `--full`)

| Handle | Who | Focus |
|--------|-----|-------|
| @xai | xAI | Grok, compute infrastructure |
| @WindsurfAI | Windsurf | AI coding (Codeium) |
| @cognition | Cognition | Devin, autonomous coding agent |
| @replit | Replit | AI-native IDE & deployment |
| @huggingface | Hugging Face | Open-source models & datasets |
| @llama_index | LlamaIndex | RAG, AI agents for documents |

Users can also add any handle via arguments: `/no-more-fomo @someone`

### AI Lab Blogs

| Source | URL | Method |
|--------|-----|--------|
| DeepMind | `https://deepmind.google/blog/rss.xml` | Jina Reader |
| Anthropic | `https://www.anthropic.com/research` + `https://www.anthropic.com/news` | Jina Reader (no RSS) |
| OpenAI | `https://openai.com/blog/rss.xml` | Jina Reader |

### Tech Podcasts (RSS)

| Podcast | RSS Feed | Transcript Source | Focus |
|---------|----------|-------------------|-------|
| No Priors | `https://rss.art19.com/no-priors-ai` | YouTube subs | AI/ML/startups — top researcher interviews |
| Latent Space | `https://api.substack.com/feed/podcast/1084089.rss` | Substack post (embedded) | AI engineering deep dives |
| Dwarkesh Podcast | `https://apple.dwarkesh-podcast.workers.dev/feed.rss` | Substack post (embedded) | Long-form interviews with AI leaders |
| Training Data (Sequoia) | `https://feeds.megaphone.fm/trainingdata` | YouTube subs | AI/tech from Sequoia Capital |

**Transcript retrieval (Phase 2 — automatic, no flag needed):**

Phase 2 automatically processes new podcast episodes. Primary method uses youtube-transcript:
```bash
# Step 1: Find YouTube URL for the episode
# Preferred: extract youtube.com URL from RSS <enclosure> or <link>
# Fallback: search YouTube
yt-dlp --flat-playlist "ytsearch1:PODCAST_NAME EPISODE_TITLE" --print url
```

```bash
# Step 2: Download transcript with chapters and speaker detection
bun ~/.claude/plugins/ljg-skills/.agents/skills/baoyu-youtube-transcript/scripts/main.ts VIDEO_URL \
  --chapters --speakers \
  --languages en,zh \
  --output-dir ~/no-more-fomo/.cache/pods
```

**Fallback chain** (if youtube-transcript fails or is not installed):
1. `yt-dlp --write-auto-sub --sub-lang en --skip-download` — auto-generated subtitles
2. `curl -s "https://r.jina.ai/POST_URL"` — Substack transcript (Latent Space, Dwarkesh)
3. Keep basic episode entry (title + description only)

Substack-based podcasts (Latent Space, Dwarkesh) embed full transcripts in posts and can be fetched directly via Jina Reader as a fallback.

### arxiv Papers (Topic-filtered)

Default topics (customizable via config):

| Topic | arxiv Query | Categories |
|-------|-------------|------------|
| AI Agents | `abs:"AI agent" OR abs:"LLM agent"` | cs.AI, cs.CL |
| Large Language Models | `abs:"large language model" OR abs:LLM` | cs.CL, cs.AI |

**arxiv API** — fetch papers from last 24h matching user topics:
```bash
curl -s "https://export.arxiv.org/api/query?search_query=cat:cs.AI+AND+abs:AI+agent&sortBy=submittedDate&sortOrder=descending&max_results=10"
```

**HuggingFace Daily Papers** — community-upvoted trending papers (no topic filter, but quality signal):
```bash
curl -s "https://huggingface.co/api/daily_papers?limit=20"
```
Filter: `upvotes >= 3` (configurable via `min_hf_upvotes`).

**Merge logic:** Deduplicate by arxiv ID across both sources. If a paper appears in both arxiv topic search AND HF daily, mark it as high-signal.

### HackerNews

Two parallel searches via HN Algolia API, filtered to last 24h:
1. `ai agent` — agent-specific stories
2. `LLM OR GPT OR Claude OR Gemini` — broader AI coverage

## User Config (Optional)

Users can customize sources by creating `~/.no-more-fomo/config.yaml`. The skill merges this with defaults — users only specify what they want to change.

**Before fetching, always check if config exists:**
```bash
cat ~/.no-more-fomo/config.yaml 2>/dev/null
```

**Config format:**
```yaml
# ~/.no-more-fomo/config.yaml

twitter:
  add:                          # Extra accounts to follow
    - handle: "@elonmusk"
      count: 15
    - handle: "@sama"
      count: 15
  remove:                       # Accounts to skip from defaults
    - "@ylecun"
    - "@hardmaru"

papers:
  topics:                       # arxiv topic searches (default: ai agent + llm)
    - query: "AI agent"
      categories: ["cs.AI", "cs.CL"]
    - query: "large language model"
      categories: ["cs.CL", "cs.AI"]
    # Add your own:
    # - query: "world model"
    #   categories: ["cs.AI", "cs.CV"]
    # - query: "diffusion transformer"
    #   categories: ["cs.CV"]
  hf_daily: true                # Also pull HuggingFace trending papers
  min_hf_upvotes: 3             # Quality threshold for HF papers

podcasts:
  add:
    - name: "Lex Fridman"
      rss: "https://lexfridman.com/feed/podcast/"
      transcript: youtube       # youtube | substack | none
    - name: "80000 Hours"
      rss: "https://feeds.feedburner.com/80000HoursPodcast"
      transcript: none
  remove:
    - "Training Data"           # Match by podcast name
  depth: full                   # full | none (default: full)
                                #   full = TLDR + chapters + speaker quotes
                                #   none = title + description only (skip Phase 2 podcasts)
  max_episodes: 3               # Max episodes per podcast to deep-process (default: 3)
  cache_dir: ~/no-more-fomo/.cache/pods  # Transcript cache directory

blogs:
  add:
    - name: "Meta AI"
      url: "https://ai.meta.com/blog/"
  remove: []

hn:
  extra_queries:                # Additional HN search terms
    - "robotics"
    - "computer vision"

discovery:
  enabled: true                 # Enable s.jina.ai discovery layer (default: true)
  max_per_topic: 3              # Max discoveries per topic (default: 3)

topic_search:
  enabled: true                 # Enable xreach search supplementation (default: true)
  min_mentions: 2               # Entity must be mentioned N+ times to trigger search (default: 2)
  max_topics: 5                 # Max topics to search (default: 5)

language: zh                    # zh | en — output language (default: zh)
```

**Merge rules:**
- `add` items are appended to defaults
- `remove` items are excluded from defaults (match by handle or name)
- If no config file exists, use all defaults as-is
- Unspecified sections keep their defaults

## Process

### 1. Fetch All Sources (PARALLEL)

Launch ALL fetches in parallel. Use separate Bash tool calls. **First read `~/.no-more-fomo/config.yaml` if it exists, then merge with defaults to determine the final source list.**

**CRITICAL — Filter at fetch time to minimize context usage.** Pipe xreach output through jq to keep only relevant tweets. This reduces ~30KB/account to ~2KB/account:

```bash
# Template for each account (adjust -n and likeCount threshold per account):
xreach tweets @HANDLE --json -n N | jq '[.items[] | select(.isRetweet==false or .isQuote==true) | {text,createdAt,likeCount,retweetCount,isQuote,urls: [.entities.urls[]?.expanded_url // empty]}]'
```

The `urls` field extracts all expanded URLs from each tweet (arxiv, github, huggingface, etc.), eliminating t.co links. This is the **primary source of links** for the digest — always include these URLs in the output.

**Twitter — Tier 1 (always, one call per account). Batch accounts together (3-4 per Bash call) to reduce tool call overhead:**
```bash
# Batch 1: High volume
xreach tweets @_akhaliq --json -n 50 | jq '[.items[] | select(.isRetweet==false or .isQuote==true) | {text,createdAt,likeCount,retweetCount,isQuote,urls:[.entities.urls[]?.expanded_url // empty]}]'
xreach tweets @dotey --json -n 30 | jq '[.items[] | select(.isRetweet==false or .isQuote==true) | {text,createdAt,likeCount,retweetCount,isQuote,urls:[.entities.urls[]?.expanded_url // empty]}]'
```
```bash
# Batch 2: KOLs (chain with &&, each piped through jq)
for h in karpathy bcherny oran_ge trq212 swyx emollick; do xreach tweets @$h --json -n 20 | jq -c "[.items[] | select(.isRetweet==false or .isQuote==true) | {text,createdAt,likeCount,urls:[.entities.urls[]?.expanded_url // empty]}]"; echo "---$h---"; done
```
```bash
# Batch 3: More KOLs
for h in drjimfan simonw hardmaru ylecun; do xreach tweets @$h --json -n 20 | jq -c "[.items[] | select(.isRetweet==false or .isQuote==true) | {text,createdAt,likeCount,urls:[.entities.urls[]?.expanded_url // empty]}]"; echo "---$h---"; done
```
```bash
# Batch 4: Company accounts
for h in cursor_ai AnthropicAI OpenAI GoogleDeepMind; do xreach tweets @$h --json -n 15 | jq -c "[.items[] | select(.isRetweet==false or .isQuote==true) | {text,createdAt,likeCount,urls:[.entities.urls[]?.expanded_url // empty]}]"; echo "---$h---"; done
```

**Twitter — Tier 2 (only with `--full` flag):**
```bash
for h in xai WindsurfAI cognition replit huggingface llama_index; do xreach tweets @$h --json -n 15 | jq -c "[.items[] | select(.isRetweet==false or .isQuote==true) | {text,createdAt,likeCount,urls:[.entities.urls[]?.expanded_url // empty]}]"; echo "---$h---"; done
# + any extra @handles from arguments, same jq filter
```

**AI Lab Blogs (one call per source):**
```bash
curl -s "https://r.jina.ai/https://deepmind.google/blog/rss.xml"
curl -s "https://r.jina.ai/https://www.anthropic.com/news"
curl -s "https://r.jina.ai/https://openai.com/blog/rss.xml"
```

**Podcasts (one call per feed):**
```bash
curl -s "https://r.jina.ai/https://rss.art19.com/no-priors-ai"
curl -s "https://r.jina.ai/https://api.substack.com/feed/podcast/1084089.rss"
curl -s "https://r.jina.ai/https://apple.dwarkesh-podcast.workers.dev/feed.rss"
curl -s "https://r.jina.ai/https://feeds.megaphone.fm/trainingdata"
```

**arxiv Papers (one call per topic from config, default: ai agent + llm):**
```bash
# For each topic, build query from categories + keywords
curl -s "https://export.arxiv.org/api/query?search_query=(cat:cs.AI+OR+cat:cs.CL)+AND+abs:%22AI+agent%22&sortBy=submittedDate&sortOrder=descending&max_results=10"
curl -s "https://export.arxiv.org/api/query?search_query=(cat:cs.CL+OR+cat:cs.AI)+AND+abs:%22large+language+model%22&sortBy=submittedDate&sortOrder=descending&max_results=10"
```

**HuggingFace Daily Papers:**
```bash
curl -s "https://huggingface.co/api/daily_papers?limit=20"
```
Filter to `upvotes >= 3` (or `min_hf_upvotes` from config). Extract: title, arxiv ID, upvotes.

**HackerNews:**
```bash
YESTERDAY=$(python3 -c "import time; print(int(time.time()) - 86400)")
curl -s "https://hn.algolia.com/api/v1/search?query=ai+agent&tags=story&numericFilters=created_at_i%3E$YESTERDAY&hitsPerPage=20"
```
```bash
YESTERDAY=$(python3 -c "import time; print(int(time.time()) - 86400)")
curl -s "https://hn.algolia.com/api/v1/search?query=LLM+OR+GPT+OR+Claude+OR+Gemini&tags=story&numericFilters=created_at_i%3E$YESTERDAY&hitsPerPage=15"
```

### 2. Parse & Extract

**CRITICAL: xreach JSON structure.** Tweets are in `data.items[]`. Each item has:
- `text` — tweet text (may contain t.co links)
- `createdAt` — date string like "Fri Mar 20 18:31:49 +0000 2026"
- `likeCount`, `retweetCount`, `viewCount`
- `isRetweet`, `isQuote`, `isReply`
- `entities.urls[]` — **MUST use `expanded_url` field** to get real URLs (arxiv, github, etc.)
- `media[]` — images/videos

**URL expansion is mandatory.** Never output t.co links. Always extract `entities.urls[].expanded_url`. If entities is empty, resolve t.co links via `curl -sI URL | grep -i location`.

### 3. Filter

**Twitter:**
- Filter to last 24h
- Include original tweets and quote tweets with commentary
- Exclude pure retweets (`isRetweet: true` without `isQuote: true`) and reply threads
- Quality: `likeCount > 100` for @_akhaliq, `> 50` for others (lower on weekends)

**Blogs:** Only posts from last 7 days. Skip non-technical posts (hiring, events).

**Podcasts:** Only episodes from last 7 days. Extract: title, date, description (200 chars), link.

**HN:** `points > 20`. Deduplicate against Twitter (same URL = merge, note both sources).

### 4. Enrich (IMPORTANT — this is what makes the digest useful)

After filtering, collect all unique URLs from tweets, blogs, and HN. Then enrich in parallel:

**arxiv papers** — fetch abstract:
```bash
curl -s "https://r.jina.ai/https://arxiv.org/abs/PAPER_ID" | head -80
```
Extract: title, authors (first 3), abstract (first 2 sentences). This is the **primary value** of the digest — users need to know what the paper actually does, not just its title.

**GitHub repos** — fetch description:
```bash
curl -s "https://api.github.com/repos/OWNER/REPO" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('description',''), '|', d.get('stargazers_count',0), 'stars')"
```

**HuggingFace models** — fetch model card summary:
```bash
curl -s "https://r.jina.ai/https://huggingface.co/MODEL_ID" | head -40
```

**Blog posts** (from Lab Updates) — already fetched in Step 1, extract first paragraph as summary.

**Podcast transcripts** — basic metadata extracted in Phase 1 (title, date, description, link). Full transcript processing (TLDR, chapters, speaker quotes) happens in Phase 2 below. Phase 1 writes a placeholder: `> ⏳ 深度摘要生成中...`

**Parallelism:** Launch all enrichment fetches in parallel. Typically 5-15 URLs to enrich.

**What "enriched" looks like:**

| Before (bad) | After (good) |
|-------------|-------------|
| `**FASTER** — paper | @_akhaliq | 33L` | `**FASTER** — 将 VLA 推理速度提升 5x，通过 flow matching 替代 diffusion 采样，在 LIBERO 上达到 93% 成功率 | [arxiv](https://arxiv.org/abs/...) [github](https://github.com/...) | @_akhaliq | 33L` |
| `**Nemotron-Cascade 2** — Nvidia 发布` | `**Nemotron-Cascade 2** — Nvidia 的级联推理模型，小模型处理简单 query、大模型处理复杂 query，推理成本降低 3x | [HF](https://huggingface.co/...) [paper](https://arxiv.org/...) | @_akhaliq | 35L` |
| `**OpenCode** — 开源 AI coding agent | HN 673 pts` | `**OpenCode** — TypeScript 实现的开源 AI coding agent，支持 Claude/GPT/Gemini，类似 Claude Code 的终端体验 (2.1k stars) | [github](https://github.com/nicepkg/opencode) | HN 673 pts` |

### 5. Categorize

**Section titles follow `language` config.** The table below shows both versions:

| Section (zh) | Section (en) | Content |
|--------------|-------------|---------|
| 模型与发布 | Models & Releases | New models, checkpoints, fine-tunes, API launches |
| 工具与演示 | Tools & Demos | Libraries, frameworks, demos, open-source tools |
| AI Agents | AI Agents | Agent frameworks, benchmarks, real-world agent stories |
| 实验室动态 | Lab Updates | DeepMind / Anthropic / OpenAI blog highlights |
| 播客 | Podcasts | New episodes from tracked shows (last 7 days) |
| HN 讨论 | HN Threads | Top HN discussions on AI/agents (with comment count) |
| 行业动态 | Industry | Company announcements, funding, policy, safety |
| HF 热门论文 | HF Trending Papers | HuggingFace community-upvoted papers (bottom, Part 1) |
| arxiv: [主题] | arxiv: [Topic] | Per-topic arxiv search results (bottom, Part 2) |
| 发现 | Discovery | Phase 2: s.jina.ai web search results (bottom, Part 3) |

### 6. Format & Output

**The template below uses `zh` section titles (default).** When `language: en`, use the English equivalents from the Categorize table above.

```markdown
# No More FOMO Digest — YYYY-MM-DD

## 今日要点
1. [Most important — 1 sentence]
2. [Second — 1 sentence]
3. [Third — 1 sentence]

## 模型与发布
- **[Name]** — [what it is, key capability, how it compares to previous] | [HF](URL) [paper](URL) | @source | Likes: N

## 工具与演示
- **[Name]** — [what it does, why it matters, key differentiator] (N stars) | [github](URL) | @source | Likes: N

## AI Agents
- **[Title]** — [what it does, architecture insight if available, why notable] | [link](URL) | @source | Likes: N

## 实验室动态
- **[DeepMind]** [Title] — [1-paragraph summary of the blog post] | [link](URL)
- **[Anthropic]** [Title] — [1-paragraph summary] | [link](URL)
- **[OpenAI]** [Title] — [1-paragraph summary] | [link](URL)

## 播客 (Last 7 Days)
- **[Show Name]** [Episode Title] — [guest name & role] | [link](URL)
  > ⏳ 深度摘要生成中...

## HN 讨论
- **[Title]** — [points] pts, [comments] comments | [url](URL) | [HN](URL)
  > [1-2 sentences: what it is + why HN cares]

## 行业动态
- **[Topic]** — [what happened, who's involved, why it matters] | @source | Likes: N

---

## HF 热门论文
Community-upvoted papers from [HuggingFace Daily Papers](https://huggingface.co/papers). Sorted by upvotes, no topic filter — shows what the broader ML community finds interesting today.

- **[Title]** (N upvotes) — [1-2 sentence summary] | [arxiv](URL) [HF](https://huggingface.co/papers/ID)

## arxiv: AI Agents
Recent papers matching `"AI agent" OR "LLM agent"` in cs.AI, cs.CL. Customize topics in `~/.no-more-fomo/config.yaml`.

- **[Title]** — [2-3 sentence summary from abstract] | [arxiv](URL) | categories

## arxiv: Large Language Models
Recent papers matching `"large language model"` in cs.CL, cs.AI.

- **[Title]** — [2-3 sentence summary from abstract] | [arxiv](URL) | categories

## 发现 (Beyond arxiv/HN)
来自全网搜索的技术内容，未被 KOL 推文或 HN 覆盖。

- **[类型]** [Title] — [summary in configured language] | [link](URL)

---
Sources: Tier1-KOLs(N) [Tier2-Companies(N)] Labs(N) Podcasts(N/深度N) HN(N) HF-Trending(N) arxiv(N) 社区补充(N) 发现(N)
Total: N items
```

Save to `~/no-more-fomo/YYYY-MM-DD.md` (create directory if needed).

### 6.5. Save Phase 1 Digest & Extract Hot Topics

Save the digest file immediately: `~/no-more-fomo/YYYY-MM-DD.md`

Before proceeding to Phase 2, scan all digest entries and extract high-frequency entities:
- Paper names mentioned by 2+ different sources
- Model names mentioned by 2+ KOLs
- Tool/repo names discussed in both Twitter and HN
- Collect 3-5 hot topics (pass to Phase 2 Topic Search)

Podcast entries at this point have the placeholder `⏳ 深度摘要生成中...` — these will be filled in Phase 2.

### 7. Relevance Check

If user has CLAUDE.md or memory files with project keywords, tag matching items with `[RELEVANT]`.

### 8. Summary to User

Print concise summary:
- Top 3 highlights with links
- Count per section
- New podcast episodes (always mention)
- Any `[RELEVANT]` items called out

## Phase 2: Deep Layer (same session, after Phase 1)

Phase 2 runs in the same Claude Code session immediately after Phase 1 saves the digest. Skip Phase 2 entirely if `--quick` flag is set.

### Phase 2 Step A: Parallel Network Requests

Launch ALL of the following as parallel Bash tool calls:

**Podcast transcripts** (if `podcasts.depth` is `full`, which is the default):
For each new episode found in Phase 1 (up to `max_episodes` per podcast, default 3):
For each episode, check cache first: if `~/no-more-fomo/.cache/pods/{channel}/{episode}/summary.md` exists, skip download. Otherwise:
```bash
bun ~/.claude/plugins/ljg-skills/.agents/skills/baoyu-youtube-transcript/scripts/main.ts VIDEO_URL \
  --chapters --speakers --languages en,zh \
  --output-dir ~/no-more-fomo/.cache/pods
```

**Topic Search** (if `topic_search.enabled`, default true):
For each hot topic extracted in step 6.5 (max 5):
```bash
xreach search "TOPIC_NAME" --type top -n 15 --json
```

**Discovery** (if `discovery.enabled`, default true):
For each topic in `papers.topics` config (max 3):
```bash
curl -s "https://s.jina.ai/latest%20TOPIC%20research%202026"
```

### Phase 2 Step B: AI Processing (Serial)

**Podcast structured summaries** — for each episode with downloaded transcript:

1. Read the generated `.md` file from `~/no-more-fomo/.cache/pods/{channel}/{title}/transcript.md`
2. If `--speakers` was used, reference the speaker identification prompt at:
   `~/.claude/plugins/ljg-skills/.agents/skills/baoyu-youtube-transcript/prompts/speaker-transcript.md`
3. Identify speakers (host vs guest) from video metadata (title, channel, description)
4. Generate structured summary in the configured `language` (default `zh`):

```markdown
**TLDR:** [3 sentences: core thesis, most surprising insight, practical takeaway]

**章节:**
- *[Chapter Title]* — [1-2 sentence summary of this chapter]
- *[Chapter Title]* — [1-2 sentence summary]

**关键引用:**
> **[Speaker Name]:** "[Translated quote]" [HH:MM:SS]
> **[Speaker Name]:** "[Translated quote]" [HH:MM:SS]
```

5. Cache the summary to `~/no-more-fomo/.cache/pods/{channel}/{title}/summary.md`

Speaker names stay in original form (English). Technical terms stay in original form.
Select 2-3 quotes that are most insightful or surprising.

**Topic Search analysis** — for each xreach search result set:
- Filter: `likeCount > 200`, exclude tweets from KOLs already in the digest (deduplicate by handle)
- If >80% overlap with existing KOL tweets, skip this topic
- Extract 2-3 external perspectives (disagreements, supplementary info, user feedback)
- Format as a `> 社区热议:` blockquote appended to the matching digest entry

**Discovery filtering** — for each s.jina.ai result set:
- Deduplicate: remove any URL already in the digest
- Filter: only keep technical content (papers, blog posts, conference pages — not news aggregators or SEO)
- Keep max 3 per topic, format as:
```markdown
- **[类型]** [Title] — [1-2 sentence summary in configured language] | [link](URL)
```
Where 类型 is one of: 博客, 会议, 报告, 教程

### Phase 2 Step C: Update Digest File

Read `~/no-more-fomo/YYYY-MM-DD.md` and apply updates:

1. **Podcasts:** Find each `⏳ 深度摘要生成中...` placeholder → replace with the structured summary (TLDR + chapters + quotes). If transcript failed, replace placeholder with basic description from RSS.

2. **Topic Search:** Find matching entries by title → append `> 社区热议:` blockquote after the entry.

3. **Discovery:** Find the `---` line immediately above the `Sources:` line → insert before it:
```markdown
## 发现 (Beyond arxiv/HN)
来自全网搜索的技术内容，未被 KOL 推文或 HN 覆盖。

[discovery entries here]
```
Only add this section if there are discovery results. If empty, skip.

4. **Update Sources line** to include Phase 2 counts:
```
Sources: Tier1-KOLs(N) [Tier2-Companies(N)] Labs(N) Podcasts(N/深度N) HN(N) HF-Trending(N) arxiv(N) 社区补充(N) 发现(N)
```
`社区补充` and `发现` only appear if Phase 2 produced results for them.

### Phase 2 Step D: Generate HTML

Skip this step if `--no-save` or `--no-html` flag is set.

Run the render script (uses bun, <1 second):
```bash
bun /path/to/no-more-fomo/scripts/render.js ~/no-more-fomo/YYYY-MM-DD.md
```

This automatically:
1. Reads `template/digest.html` and the `.md` file
2. Parses markdown sections → HTML fragments (with escaping, badges, links)
3. Replaces `{{PLACEHOLDER}}` markers → writes `YYYY-MM-DD.html`
4. Scans all `.html` files → regenerates `index.html` with date cards

**For `--quick` mode:** Run this step at the end of Phase 1. The render script works with whatever content is in the `.md` file at that point.

### Phase 2 Step E: Generate Chinese Translation

Skip this step if `--no-save` flag is set or if the digest is already in Chinese (`language: zh`).

After the English digest is saved, translate it to Chinese:

1. Read `~/no-more-fomo/YYYY-MM-DD.md` (English version, already in memory)
2. Translate all content to Chinese:
   - Section titles → use the zh titles from Categorize table
   - Item descriptions and summaries → translate to Chinese
   - Speaker names, model names, tool names, arxiv IDs → keep original
   - Links → keep as-is
   - Engagement metrics (likes, points) → keep as-is
3. Write to `~/no-more-fomo/YYYY-MM-DD-zh.md`
4. Run render script for the Chinese version:
```bash
bun /path/to/no-more-fomo/scripts/render.js ~/no-more-fomo/YYYY-MM-DD-zh.md
```

**Default behavior:** Always generate both English and Chinese versions. The English version is the primary (generated first), the Chinese version is a translation pass.

**Skip translation with `--en-only` flag.**

## Arguments

| Argument | Effect |
|----------|--------|
| (none) | Phase 1 (all default sources) + Phase 2 (deep processing) |
| `--full` | Also fetch Tier 2 company/product accounts |
| `--quick` | Phase 1 only — skip Phase 2 deep processing |
| `--transcripts` | *(deprecated)* Phase 2 does this by default now |
| `@handle` | Add extra Twitter accounts (repeatable) |
| `--twitter-only` | Skip blogs, podcasts, and HN. Topic Search + Discovery still run. |
| `--hn-only` | Skip Twitter, blogs, and podcasts. Topic Search + Discovery still run. |
| `--podcasts-only` | Only podcast feeds + Phase 2 podcast deep processing |
| `--no-save` | Print results, don't save to file |
| `--no-html` | Only generate .md, skip HTML output |
| `--en-only` | Skip Chinese translation (only English digest) |
| `--query "term"` | Add custom HN search query |

**Flag combinations:**

| Combo | Behavior |
|-------|----------|
| `--quick` | Phase 1 only |
| `--quick --full` | Phase 1 + Tier 2, no Phase 2 |
| `--twitter-only` / `--hn-only` | Skip podcasts in Phase 2 (no podcast data), but Topic Search + Discovery still run |
| `--podcasts-only` | RSS + Phase 2 deep summaries |
| `--podcasts-only --quick` | RSS only, no deep summaries |
| `--twitter-only --quick` | Phase 1 Twitter only |
| `--no-html` | .md only, no HTML generation |
| `--quick --no-html` | Phase 1 .md only, no Phase 2, no HTML |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Including all retweets | Only quote tweets with commentary |
| Sequential fetching | ALL fetches must be parallel |
| Missing URLs | Always extract arxiv/GitHub/HF links |
| Ignoring dedup | Same URL from Twitter + HN = one entry |
| Stale blog/podcast posts | Blogs: 7 days, Podcasts: 7 days |
| Empty section hidden | Show "No new episodes this week" |

## Scheduling

### Claude Code Cloud (recommended)

Go to [preview.claude.ai/code](https://preview.claude.ai/code) → **Scheduled** → **+ New scheduled task**:

| Field | Value |
|-------|-------|
| Name | `no-more-fomo` |
| Prompt | `run /no-more-fomo and save the digest` |
| Frequency | Daily |
| Time | 09:00 AM |

Runs on cloud infra — no local machine needed.

### Local fallback (crontab)

```bash
# Add to crontab
0 9 * * * claude -p "run /no-more-fomo and save the digest" --allowedTools "Bash,Read,Write,Glob" --output-format stream-json >> /tmp/no-more-fomo.log 2>&1
```

## Fallback

- xreach fails: `curl -s "https://r.jina.ai/https://twitter.com/HANDLE"`
- HN API fails: `curl -s "https://r.jina.ai/https://news.ycombinator.com"`
- Podcast RSS fails: `curl -s "https://r.jina.ai/PODCAST_WEBSITE"`
