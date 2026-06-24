# claude-hud

[Claude Code](https://claude.com/claude-code) 的雙行彩色狀態列,含 Nerd Font 圖示與進度條。

![claude-hud](assets/1.png)

- **第一行**:目錄 · git 分支 · 模型 · 推理強度(effort)
- **第二行**:context 使用率 · 5 小時限額 · 7 天限額 · 最近重置時間

使用率進度條依高低變色(綠 → 黃 → 琥珀 → 紅)。

## 需求

- **Node.js**(腳本用 node 執行)
- **Nerd Font** 終端機字型(如 `JetBrainsMono NF`),否則圖示會變方框。沒有的話請改用無圖示模式(見下方)。
- 第二行(使用率 + 限額)要**對話開始、有資料後**才出現;`5h`/`7d`/重置時間另需 **Claude.ai 訂閱**。

## 安裝

1. 把 `statusline-command.js` 複製到 Claude Code 設定資料夾:
   - **Windows:** `C:\Users\<你>\.claude\`
   - **macOS / Linux:** `~/.claude/`

2. 在 `~/.claude/settings.json` 加入以下設定(沒有檔案就新建),**路徑改成你自己的家目錄**:

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node \"C:/Users/<你>/.claude/statusline-command.js\""
     }
   }
   ```

   macOS / Linux 可用 `node \"$HOME/.claude/statusline-command.js\"`。

3. 重啟 Claude Code(或開新 session)即可看到狀態列。

## 無圖示模式(無 Nerd Font / cmd)

預設圖示是 Nerd Font 字元,在沒有 Nerd Font 的終端機(如 cmd + Consolas)會變方框。設環境變數 **`CLAUDE_HUD_PLAIN=1`** 即可改用無圖示版(只保留進度條與 ⏱,純文字標籤,任何終端機都能顯示),如下:

```
proj │ main │ Opus 4.8 │ medium
ctx ▮▮▮▯▯▯ 45% │ 5h ▮▮▯▯▯▯ 34% │ 7d ▮▮▮▮▮▯ 88% │ ⏱ 19:10
```

- **Windows 最簡單**:`setx CLAUDE_HUD_PLAIN 1`,然後重開終端機。
- **macOS / Linux**:設定裡的 command 前面加 `CLAUDE_HUD_PLAIN=1 `。
- (`CLAUDE_HUD_ASCII=1` 為同義別名。)

## 自訂

全部邏輯都在 `statusline-command.js`:

- **顏色** — 最上方的 `c` 物件,以及 `pctColor()` 的變色門檻。
- **圖示** — 集中在 `ic` 物件,可換成 [Nerd Fonts cheat sheet](https://www.nerdfonts.com/cheat-sheet) 的任何字元。
- **進度條** — `makeBar()`(字元與寬度)。
- **版面** — 各區塊 push 進 `line1` / `line2`,可自由增減或排序。

## 備註

- git 分支用 `git --no-optional-locks rev-parse`,不會干擾其他 git 程序;非 repo 自動略過。
- 腳本從 stdin 讀取 Claude Code 的狀態列 JSON,完整欄位見[官方文件](https://docs.claude.com/en/docs/claude-code/statusline)。
