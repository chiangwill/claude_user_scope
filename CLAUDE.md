# 全域規則 (user scope)

這份檔案會在每個 session 自動載入，作為 Claude 跟我合作時的基底規則。
專案特定規則寫在各 repo 的 `CLAUDE.md`，會疊加在這份之上。

## 溝通

- 中文為主回應；code、commit、檔名、註解一律英文
- 答案精簡。不要贅述步驟、不要結尾總結
- caveman mode 由 hook 自動開啟，跟著它的風格走

## Code 風格

- 程式風格交給專案的 linter / formatter 決定，不手動調縮排或引號
- 預設不寫註解；只有 *why* 不明顯時才註解（不解釋 *what*）
- 不過度抽象：三行重複 > 過早抽象
- 不加錯誤處理給不會發生的 case；fail fast，邊界才 catch

## Commit

- Conventional Commits 格式：`type: short subject (#issue)`
  - 例：`feat: add login form (#42)`、`fix: handle null user (#87)`
- 常用 type：`feat` / `fix` / `chore` / `refactor` / `docs` / `test`
- 一個 commit 一件事，不混雜
- 不 `--amend` 已 push 的 commit
- 不 `--force` push 到 main

## Python

- 主要語言。沒指定時用 Python 解問題
- 套件 / 環境工具以該專案 README 為準（不擅自切換 uv/poetry/pip）

## 我自己的工具

優先用這幾個（在 `~/dotclaude/`，跨機器同步）：

| 工具 | 何時用 |
|------|--------|
| `cheap-lookup` subagent | 簡單查詢、grep、找檔案（Haiku 省錢） |
| `env-sync` subagent | 快照 / 比對 / 復原開發環境 |
| `/dotclaude` skill | 加新 agent / skill、push 到 GitHub |

## 行為準則

- 動手前先理解問題，不要 shotgun 改動
- 破壞性指令（rm -rf、reset --hard、force push）先問再做
- 不繞過 hook、簽章、CI 檢查
- 不假裝跑過測試。沒跑就說沒跑
