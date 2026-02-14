# SheetAgent UI

Standalone React UI for SheetAgent: Excel-like spreadsheet with AI Copilot chat.

## Setup

```bash
npm install
```

## Run

1. Start the API bridge from the project root (with Python venv activated):

```bash
cd /path/to/SheetAgent-AI-tour
source .venv/bin/activate  # or: .venv\Scripts\activate on Windows
pip install -r api/requirements.txt
cd api && uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

2. Start the UI:

```bash
npm run dev
```

3. Open the UI at **http://localhost:5173** (use the same host as the API; avoid mixing 127.0.0.1 and localhost).

**If you see "Processing..." but the API log shows no request:** the browser may not be reaching the API (e.g. you opened the app from a different origin). Set the API URL and restart the dev server:
```bash
VITE_API_URL=http://127.0.0.1:8000 npm run dev
```
Then open http://localhost:5173 again and try sending an instruction.

## Usage

1. Click "Open file" and select an .xlsx workbook
2. Type an instruction in the chat (e.g. "Add a column for total revenue")
3. Click Send – the AI will process the workbook and the updated sheet will reload
4. Use the spreadsheet: select cells, edit values, switch sheets

## Build

```bash
npm run build
```
