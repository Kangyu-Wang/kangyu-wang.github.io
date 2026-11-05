# Kangyu Wang 王康予 · Markdown 编辑版

以后日常更新只需打开对应 Markdown 文件，点击 GitHub 的铅笔按钮，改文字，再点击 **Commit changes**。发布流程会把 Markdown 生成网页并更新网站。

## 平时编辑哪里

| 想更新的内容 | 打开这个文件 |
| --- | --- |
| 首页简介、求学经历、学术服务和公众写作 | [text/profile.md](text/profile.md) |
| 研究、论文、合作者 | [text/research.md](text/research.md) |
| 教学和课程 | [text/teaching.md](text/teaching.md) |
| 邮箱、CV、PhilPeople、LinkedIn | [text/contact.md](text/contact.md) |
| “I'm from Beijing.” 和家乡链接 | [text/footer.md](text/footer.md) |
| 中英文姓名、照片文件名 | [site.json](site.json) |

在仓库默认分支上编辑。截图中的旧仓库是 `dev`，新建仓库一般是 `main`。这个流程自动识别默认分支。

提交后打开 **Actions → Publish website**。等最新一次运行变为绿色对勾，再刷新网站。GitHub 编辑器的 **Preview** 可以检查链接、粗体和列表，网站上的折叠效果在发布后查看。

## 一次性设置

如果尚未创建新版仓库，先按之前的迁移顺序创建独立的临时仓库 `academic-site-preview`。在新版仓库中完成以下设置和验收，再将它改名为 `kangyu-wang.github.io` 接管原网址。

如果新版网站已经部署，就在那个新版仓库上更新。

1. 完整解压本包。在 GitHub 仓库根目录选择 **Add file → Upload files**，上传包内全部文件和文件夹。上传后，根目录应直接出现 `text`、`assets`、`layouts`、`vendor`、`tests`、`build.mjs`、`site.json`、`README.md`、`docs` 和 `.github`。上传的是外层文件夹里面的内容。
2. **确认 `.github/workflows/pages.yml` 已上传。** Mac Finder 中按 **Command + Shift + .** 可以显示隐藏文件夹。如果浏览器上传时遗漏了 `.github`，在 GitHub 仓库根目录选择 **Add file → Create new file**，文件名填写 `.github/workflows/pages.yml`，将本包同名文件的全部内容粘贴进去，提交到默认分支。可直接打开 [工作流文件](.github/workflows/pages.yml) 复制内容。
3. 进入 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。这一步取代上一版的 `main /docs` 发布设置。
4. 打开 **Actions → Publish website → Run workflow**，选择默认分支，再点击绿色 **Run workflow**。如果上传时已经触发一次失败，设置好 Pages 后重新运行即可。
5. 等运行变绿，在 **Settings → Pages → Visit site** 检查首页、Research、Teaching、头像放大、CV、深浅色和天气。

以后提交 Markdown 内容或新附件，流程会自动运行。默认分支以外的提交不会发布网站。此流程使用 GitHub 自带的发布权限。

如果新仓库的 `github-pages` 环境限制了允许部署的分支，在 **Settings → Environments → github-pages** 将当前默认分支加入允许列表，再运行一次。

完整源码和示例都在本包中。GitHub Pages 的发布说明见 [GitHub 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## Markdown 怎么写

段落之间空一行。列表、粗体、斜体和链接可以这样写。

```markdown
这是一段正文。

这是另一段正文，含有 **粗体**、*斜体* 和 [链接文字](https://example.com)。

- 第一个条目
- 第二个条目
```

首页中的 `## Education and visits` 这类二级标题会自动变成可展开的小节。修改标题后的文字即可更新小节内容，也可以添加新的二级标题。

研究页和教学页用 `##` 分组。研究页用 `###` 写普通小标题，用 `####` 写可展开的小标题。展开小节在下一个同级或更高级标题前结束。单独一行 `---` 结束当前分组和折叠小节，后面可以继续写普通段落。

```markdown
## 1: AI

### Accepted:

- **Kangyu Wang**, [*论文标题*](https://example.com/paper), *期刊名称*

### Ongoing, solo:

- 新项目

#### Ongoing, collab:

- with [合作者](https://example.com/person): 合作项目

---

这是折叠小节之外的普通段落。
```

课程条目内需要换行时，在上一行末尾加反斜杠，下一行缩进两个空格。现有教学文件已有示例。

链接到另一栏时，可以写 `[Research](research.md)`，生成器会转换成对应网页地址。链接到附件时，写 `[论文](../assets/paper.pdf)`。所有 PDF 链接都会在新标签页打开。

## 更新 CV 或照片

- 把新版 PDF 上传到根目录的 `assets` 文件夹。使用原文件名即可替换。若文件名改变，修改 [text/contact.md](text/contact.md) 中的 CV 链接一次，三个页面会同步更新。
- 照片也在 `assets` 中。小图为 `kangyu-wang.jpg`，放大图为 `kangyu-wang-large.jpg`。
- 字体、配色和排版在 `assets/site.css`，日常改文字时使用上面的 Markdown 文件即可。
- 家乡文字与北京天气各自独立。修改 `footer.md` 只修改文字和链接，天气仍读取北京。

## 本地检查

直接打开 `docs/index.html` 可以检查包内已经生成好的页面。

本地修改 Markdown 后，先生成新页面。电脑需要 Node.js 20 或更新版本。在这个文件夹中运行：

```sh
node build.mjs
```

然后刷新 `docs/index.html`。字体和 Markdown 转换器已经随包提供，本地生成可以离线完成。天气需要联网。

GitHub Actions 每次会重新生成 `docs` 并发布结果。仓库中的 `docs` 是本地预览快照，因此将以后的仓库重新下载到电脑时，也请先运行上述命令。

## 源码说明

`text` 是内容，`layouts/page.html` 是共用布局，`assets` 是字体、照片、CV 和样式。生成器 `build.mjs` 使用随包的 Marked 18.1.3，许可证见 `vendor/marked/LICENSE`。Source Sans 3 许可证随字体提供。

回归检查可运行：

```sh
node --test tests/build.test.mjs
```

北京天气来自 [Open-Meteo](https://open-meteo.com/en/licence)，按 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 使用，气温取整，天气代码转为图标与文字。天气读数链接到来源说明。
