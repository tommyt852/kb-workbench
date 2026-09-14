# kb-workbench

本機 Knowledge Base 工作台（繁體中文 HK UI）。唔使 npm／bundler：PowerShell `web.ps1` + 純 JS。

## 點樣跑（Windows）

```bat
run.bat
```

會開瀏覽器 `http://localhost:8085/`，並用：

```bat
powershell.exe -ExecutionPolicy Bypass -File web.ps1 8085
```

手動：

```bat
C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe -ExecutionPolicy Bypass -File web.ps1 8085
```

然後瀏覽器開 `http://localhost:8085/`。

## 功能

- 左：分類樹（全部／未分類／由文章 category 推導），可摺疊（狀態存 localStorage）
- 中：文章列表，可摺疊
- 右：標題／slug／分類／tags + **Toast UI WYSIWYG**（可切換 Markdown 模式；`body` 仍以 Markdown 存 kb.json）
- **手動儲存**（按鈕或 **Ctrl+S**）：成功後 POST → GET 重載
- Dirty 導航：三鍵對話框「儲存並繼續／丟棄／取消」
- 刪除／匯入覆寫需確認
- 搜尋 title／body／tags／slug／category
- 匯入／匯出 JSON；slug 撞名禁止儲存
- Dark theme

## 資料

- GET `www/data/kb.json`（`window.KB_SERVER.getPath`）
- POST `/api/data` → `controller/api/data.ps1` 寫入 `kb.json`，並備份 `kb-yyyy-MM-dd-HH-mm-ss.json`（UTF-8 無 BOM）
- Schema：`version`、`app: "kb"`、`updatedAt`、`meta`、`articles[]`（保留未知欄位）

## 設定

改 `www/config.js`：

```js
window.KB_SERVER = {
  host: "localhost",
  port: 8085,
  getPath: "/data/kb.json",
  postPath: "/api/data"
};
```

## 編輯器（M8）

- 預設 **wysiwyg**（Word-like），工具列提供粗體／斜體／標題／列表／連結／程式碼等
- 內建模式切換可改睇／改 **Markdown** 原始碼
- 儲存時仍 POST Markdown `body`（唔係 HTML）
- 資產：`www/vendor/toastui/toastui-editor-all.min.js`、`toastui-editor.min.css`、`theme/toastui-editor-dark.min.css`

## 注意

- **唔好改 `web.ps1`**（由 daily-work 原樣複製）
- Vendor：`www/vendor/marked`、`www/vendor/dompurify`、`www/vendor/toastui`（Toast UI Editor 3.2.2 browser builds + dark theme）
- 腳本順序：`config.js` → vendor → 各 `js/*` → `app.js`（非 ES modules）

## 里程碑

| Commit | 內容 |
|--------|------|
| M0 | skeleton：web.ps1、run.bat、config、data.ps1 |
| M1 | store load/save/dirty + dummy kb.json |
| M2 | schema + slug |
| M3 | styles + layout/tree/list |
| M4 | marked + DOMPurify + preview |
| M5 | dialogs（刪除確認 + dirty 三鍵） |
| M6 | 完整 CRUD + search |
| M7 | polish：empty states、toasts、Ctrl+S、import/export、README |
| M8 | Toast UI WYSIWYG editor（Markdown storage；單編輯窗格） |
