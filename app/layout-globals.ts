

// ─── app/globals.css ─────────────────────────────────────────────────
/*
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #fdf8f5;
  color: #1a1a1a;
  -webkit-font-smoothing: antialiased;
}
button { font-family: inherit; }
textarea, input { font-family: inherit; }
*/


// ─── .env.local  (직접 작성, 절대 커밋 금지) ─────────────────────────
/*
NOTION_TOKEN=secret_여기에_붙여넣기
NOTION_DB_MORNING=9eb49af9-90d3-4687-a901-a5a51690ba6e
NOTION_DB_ARTIST=67c5637d-62b8-48ee-9a7e-8050a727457d
NOTION_DB_CHECKIN=b5ca178c-13cc-4005-846c-e3bfa7f34659
*/


// ─── .gitignore 추가 확인 (create-next-app이 자동 생성함) ───────────
/*
.env.local      ← 이 줄이 있는지 반드시 확인!
.env
node_modules/
.next/
*/


// ─── package.json 의존성 (npm install 후 확인) ───────────────────────
/*
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "react-dom": "^18",
    "@notionhq/client": "^2"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/node": "^20"
  }
}
*/
