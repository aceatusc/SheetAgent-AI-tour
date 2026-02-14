"""
FastAPI server bridging the UI to main.py.
Exposes /api/process, /api/workbook, /api/workbook/enriched, and serves the UI.
"""

import logging
import os
import subprocess
import sys
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

# Project root (parent of api/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = Path(__file__).resolve().parent / "temp" / "uploads"
OUTPUT_DIR = PROJECT_ROOT / "output"

app = FastAPI(title="SheetAgent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.post("/api/process")
async def process_instruction(
    instruction: str = Form(...),
    workbook_path: str | None = Form(None),
    file: UploadFile | None = File(None),
):
    """
    Run SheetAgent on a workbook with the given instruction.
    Either provide workbook_path (relative to project) or upload a file.
    Returns the path to workbook_new.xlsx.
    """
    logger.info("POST /api/process received: instruction=%r, workbook_path=%r, file=%r", instruction[:80], workbook_path, file.filename if file else None)
    wb_path = None
    output_dir = OUTPUT_DIR / str(uuid.uuid4())
    output_dir.mkdir(parents=True, exist_ok=True)
    db_path = output_dir / "db_path"
    db_path.mkdir(parents=True, exist_ok=True)

    try:
        if file and file.filename and file.filename.endswith((".xlsx", ".xls")):
            suffix = Path(file.filename).suffix
            wb_path = UPLOAD_DIR / f"{uuid.uuid4()}{suffix}"
            with open(wb_path, "wb") as f:
                f.write(await file.read())
        elif workbook_path:
            resolved = (PROJECT_ROOT / workbook_path).resolve()
            if not str(resolved).startswith(str(PROJECT_ROOT.resolve())):
                raise HTTPException(400, "workbook_path must be within project")
            if not resolved.exists():
                raise HTTPException(404, f"Workbook not found: {workbook_path}")
            wb_path = resolved
        else:
            raise HTTPException(400, "Provide either workbook_path or file upload")

        api_config = str(PROJECT_ROOT / "config" / "mistralai.yaml")
        python_exe = sys.executable
        cmd = [
            python_exe,
            str(PROJECT_ROOT / "main.py"),
            "--workbook_path", str(wb_path),
            "--instruction", instruction,
            "--output_dir", str(output_dir),
            "--api_config", api_config,
        ]
        logger.info("Running: cwd=%s cmd=%s", PROJECT_ROOT, cmd)

        result = subprocess.run(
            cmd,
            cwd=str(PROJECT_ROOT),
            capture_output=False,
            timeout=300,
            env={**os.environ, "PYTHONPATH": str(PROJECT_ROOT)},
        )
        logger.info("Subprocess finished: returncode=%s", result.returncode)

        if result.returncode != 0:
            raise HTTPException(
                500,
                detail=f"main.py exited with code {result.returncode}. Check API server logs for stdout/stderr.",
            )

        out_file = output_dir / "workbook_new.xlsx"
        if not out_file.exists():
            raise HTTPException(500, "SheetAgent did not produce workbook_new.xlsx")

        return {"path": str(out_file.relative_to(PROJECT_ROOT)), "outputDir": str(output_dir.relative_to(PROJECT_ROOT))}
    finally:
        pass


@app.get("/api/workbook")
async def get_workbook(path: str = Query(...)):
    """Serve xlsx file from project root."""
    resolved = (PROJECT_ROOT / path).resolve()
    if not str(resolved).startswith(str(PROJECT_ROOT.resolve())):
        raise HTTPException(403, "Access denied")
    if not resolved.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(resolved, filename=resolved.name)


@app.get("/api/workbook/enriched")
async def get_workbook_enriched(path: str = Query(...)):
    """Return enriched workbook data (sheets, CF, tables, charts) as JSON."""
    resolved = (PROJECT_ROOT / path).resolve()
    if not str(resolved).startswith(str(PROJECT_ROOT.resolve())):
        raise HTTPException(403, "Access denied")
    if not resolved.exists():
        raise HTTPException(404, "File not found")

    try:
        import sys
        api_dir = Path(__file__).parent
        if str(api_dir) not in sys.path:
            sys.path.insert(0, str(api_dir))
        from extractors import extract_enriched_workbook
        data = extract_enriched_workbook(resolved)
        return JSONResponse(data)
    except Exception as e:
        raise HTTPException(500, str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
