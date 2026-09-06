# X Link to PDF （X长文链接转PDF）

输入一个 X/Twitter 帖子链接，生成可选中文字的 PDF，保留文章图片、标题和代码块。无需上传 HTML，也无需 X API Key。

**v0.1：实验版本。** 使用第三方 FxTwitter 公共读取服务。受限帖子、被删除的内容、接口变化可能导致失败；无法保证所有链接均可转换。只导出单条帖子/文章，不包括评论和整个串帖。

## 快速使用

需要 Node.js 18+、npm 和 curl，以及访问 FxTwitter、Twitter 图片和 GitHub 的网络。

```sh
git clone https://github.com/onenight19-coder/x-link-to-pdf.git
cd x-link-to-pdf
npm ci --ignore-scripts
node scripts/export.cjs "https://x.com/ai_xiaomu/status/2089324371991216173" article.pdf
```

第一次运行会下载并校验 Noto CJK 字体。PDF 通常约 14 MB。已有同名文件不会被覆盖。成功时输出页数、图片数、代码块数和警告；失败时返回非零退出码。

## 用作 Skill

仓库根目录就是标准 Skill 文件夹，包含 `SKILL.md`、`scripts/` 和 `agents/openai.yaml`。

- **Codex**：让技能安装器从本仓库根目录安装，然后请求“使用 x-link-to-pdf 把这个 X 链接转成 PDF”。
- **Claude Code**：把完整仓库放到 `~/.claude/skills/x-link-to-pdf`，然后使用 `/x-link-to-pdf 链接`。
- **WorkBuddy**：本仓库提供标准 `SKILL.md` 格式；请使用客户端支持的本地 Skill 导入入口。尚未在 WorkBuddy 客户端完成安装验证，不承诺版本间自动兼容。

安装时需要完整文件夹，不能只复制 SKILL.md。主机必须允许运行 Node 和 curl；仅支持聊天、不能执行脚本的客户端无法直接运行此 Skill。

## 保留与限制

- 支持中英文可选文本、图片、标题、列表和 fenced code。
- 文章视频保留封面和原文链接，PDF 内不播放视频。
- 不展开引用帖、评论、连续帖；行内粗体/斜体会转为普通文字。
- 部分 emoji 缺字会在结果中提示；宽代码块可能缩小到横向页。
- 正文只有摘要、未知内容块或图片下载失败时，停止导出。
- 不绕过登录、付费墙或访问限制。请尊重原作者的版权和使用条件。

## English

Export a public X/Twitter status URL directly to a selectable-text PDF. Requires Node 18+, npm and curl. Uses the third-party FxTwitter service, not an official X API. Images are fetched from pbs.twimg.com; a checksum-verified Noto font is cached on first use. No cookies or API key needed. Private/deleted posts and unsupported content fail explicitly. Threads, comments, quoted posts and playable videos are outside scope. Some emoji and inline formatting are not preserved.

Run `npm test` for synthetic parser checks. Real article content and generated PDFs are deliberately not distributed in this repository.

## License / Credits

Project code: MIT, see LICENSE. Dependencies retain their own licenses: pdf-lib (MIT), @pdf-lib/fontkit (MIT), Noto CJK font (SIL OFL, included in assets/FONT-LICENSE.txt). Public extraction service: [FxEmbed](https://docs.fxembed.com/). Not affiliated with X, OpenAI, Anthropic or Tencent.
