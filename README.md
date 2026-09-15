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
- 右：標題／slug／分類／tags／author／editedBy + **Preview-first** 文章檢視
  - 開啟／選擇文章 → 預設 **Preview only**（渲染 Markdown）
  - 按 **編輯** → 左 Markdown（EasyMDE 工具列）＋ 右即時 Preview
  - **完成** 或成功 **儲存** → 回到 Preview only
  - 元資料面板可摺疊（localStorage）；分類／tags／author／editedBy 有既有值建議
  - Tags：chips（可移除）+ 輸入建議；Author 一經儲存即鎖定唯讀；Edited by 可改
- **手動儲存**（按鈕或 **Ctrl+S**）：成功後 POST → GET 重載，並返回 Preview
- Dirty 導航：僅在有未儲存變更時顯示三鍵對話框「儲存並繼續／丟棄／取消」
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

## 編輯器（M9 + M12）

- 預設 **Preview only**（`marked` + `DOMPurify` via `markdown.js`）
- **編輯** 開啟左 EasyMDE Markdown 編輯器 | 右即時 Preview 分欄；輸入同步更新右側 Preview 與 dirty
- **EasyMDE**（M12，vendored `www/vendor/easymde/`，無 runtime CDN／無 Font Awesome CDN）：
  - 較大工具列按鈕（約 38px）；粗體／斜體／**H1／H2／H3**（分開）／列表／引用／程式碼／連結／水平線／undo／redo
  - Bold／Italic／列表／引用等由 EasyMDE 原生 **toggle**；連結可 prompt URL
  - Inline／line wrap 前會去掉選區尾端換行（雙擊整行時關閉標記／列表前綴唔會掉去下一行）
  - **唔用** EasyMDE 內建 preview／side-by-side／fullscreen 做主 UX（右側維持本專案 Preview）
- 無 Toast UI／無 WYSIWYG／無 Markdown↔WYSIWYG 模式切換；`body` 仍以 Markdown 存 kb.json
- 元資料欄位兩邊模式都可見；Preview 時唯讀，Edit 時可改（Author 已設定則永久唯讀）
- 可選：雙擊 Preview 進入編輯

## 元資料（M10）

- **分類**：`<datalist>` 建議既有 category 路徑，可輸入新路徑
- **Tags**：chips UI；從全部文章收集既有 tags 作建議；Enter／點選新增；× 移除；trim、保留首次大小寫、唔重複
- **Author**／**Edited by**：第一級欄位（缺省 `""`）；datalist 建議；新建時皆空
- **Author 鎖定**：文章已有非空 author（或儲存後寫入）→ UI 永久唯讀；空 author 可設定一次
- **Edited by**：隨時可改；唔會自動填使用者名
- 元資料面板摺疊狀態存 `localStorage`（`kb-workbench:layout.metaCollapsed`）

## 注意

- **唔好改 `web.ps1`**（由 daily-work 原樣複製）
- Vendor：`www/vendor/marked`、`www/vendor/dompurify`、`www/vendor/easymde`（含 CodeMirror）
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
| M9 | preview-first；Edit → Markdown\|Preview split；Save → Preview；移除 Toast UI |
| M10 | category autocomplete + tag chips；author／editedBy；元資料可摺疊 |
| M11 | Markdown 格式工具列（Edit split 左側）；自訂 toolbar，非 Toast UI／EasyMDE |
| M12 | EasyMDE 較大工具列（左編輯）；右側維持 marked+DOMPurify Preview；vendored，無 CDN |
| fix | 整行選取 wrap 時關閉 markdown 標記留喺同行（trim trailing `\n`） |
