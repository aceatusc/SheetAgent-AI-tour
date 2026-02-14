"""
Extract conditional formatting, tables, and charts from openpyxl workbooks.
Returns serializable structures for the enriched workbook API.
"""

import base64
from pathlib import Path
from typing import Any

import pandas as pd
from openpyxl import load_workbook
from openpyxl.worksheet.worksheet import Worksheet


def _cell_in_range(cell_row: int, cell_col: int, range_str: str) -> bool:
    """Check if (row, col) is within range like A1:C10."""
    try:
        from openpyxl.utils import range_boundaries
        min_col, min_row, max_col, max_row = range_boundaries(range_str)
        return min_row <= cell_row <= max_row and min_col <= cell_col <= max_col
    except Exception:
        return False


def _extract_fill(dxf) -> str | None:
    """Extract fill color from differential format."""
    if dxf is None or getattr(dxf, 'fill', None) is None:
        return None
    fg = dxf.fill.fgColor
    if fg and hasattr(fg, 'rgb') and fg.rgb:
        rgb = str(fg.rgb).replace('FF', '')[-6:]
        return '#' + rgb if len(rgb) >= 6 else None
    return None


def _extract_font_color(dxf) -> str | None:
    """Extract font color from differential format."""
    if dxf is None or getattr(dxf, 'font', None) is None:
        return None
    color = dxf.font.color
    if color and hasattr(color, 'rgb') and color.rgb:
        rgb = str(color.rgb).replace('FF', '')[-6:]
        return '#' + rgb if len(rgb) >= 6 else None
    return None


def extract_conditional_formatting(ws: Worksheet) -> list[dict[str, Any]]:
    """Extract conditional formatting rules from a worksheet."""
    rules_list = []
    for cf in ws.conditional_formatting:
        sqref = str(cf.sqref) if cf.sqref else ''
        rules = getattr(cf, 'rules', None) or getattr(cf, 'cfRule', [])
        for rule in rules:
            formula = rule.formula
            if isinstance(formula, (list, tuple)):
                formula = formula[0] if formula else ''
            else:
                formula = str(formula) if formula else ''
            dxf = getattr(rule, 'dxf', None)
            fill = _extract_fill(dxf) if dxf else None
            font_color = _extract_font_color(dxf) if dxf else None
            rules_list.append({
                'range': sqref,
                'formula': str(formula),
                'fill': fill,
                'fontColor': font_color,
                'type': getattr(rule, 'type', 'expression') or 'expression',
            })
    return rules_list


def extract_tables(ws: Worksheet) -> list[dict[str, Any]]:
    """Extract Excel Table (ListObject) metadata from a worksheet."""
    tables_list = []
    for name, tbl in getattr(ws, 'tables', {}).items():
        ref = getattr(tbl, 'ref', None) or ''
        tables_list.append({
            'name': name,
            'ref': str(ref),
            'displayName': getattr(tbl, 'displayName', name) or name,
            'hasTotalRow': getattr(tbl, 'totalsRowCount', 0) and getattr(tbl, 'totalsRowCount', 0) > 0,
        })
    return tables_list


def _resolve_ref_to_values(wb, ref_str: str) -> list:
    """Resolve a cell reference like 'Sheet1!$A$1:$B$10' to actual values."""
    try:
        if '!' in ref_str:
            sheet_part, range_part = ref_str.split('!', 1)
            sheet_part = sheet_part.strip("'\"")
            if sheet_part in wb.sheetnames:
                ws = wb[sheet_part]
            else:
                ws = list(wb.worksheets)[0]
        else:
            ws = list(wb.worksheets)[0]
            range_part = ref_str
        from openpyxl.utils import range_boundaries
        range_part = range_part.replace('$', '').strip()
        min_col, min_row, max_col, max_row = range_boundaries(range_part)
        values = []
        for row in range(min_row, max_row + 1):
            row_vals = []
            for col in range(min_col, max_col + 1):
                cell = ws.cell(row=row, column=col)
                val = cell.value
                if val is not None:
                    row_vals.append(val)
                else:
                    row_vals.append(None)
            values.append(row_vals)
        return values
    except Exception:
        return []


def extract_charts(ws: Worksheet, wb) -> list[dict[str, Any]]:
    """Extract chart metadata from a worksheet."""
    charts_list = []
    charts = getattr(ws, '_charts', []) or []
    for chart in charts:
        try:
            chart_type = type(chart).__name__.lower()
            type_map = {'barchart': 'bar', 'columnchart': 'column', 'linechart': 'line',
                        'piechart': 'pie', 'areachart': 'area', 'scatterchart': 'scatter'}
            ctype = type_map.get(chart_type, 'bar')
            title = ''
            if chart.title and chart.title.tx:
                from openpyxl.chart.title import Title
                if hasattr(chart.title.tx, 'rich') and chart.title.tx.rich:
                    parts = []
                    for p in chart.title.tx.rich.p:
                        for r in getattr(p, 'r', []):
                            for t in getattr(r, 't', []):
                                parts.append(str(t))
                    title = ''.join(parts)
                elif hasattr(chart.title.tx, 'strRef') and chart.title.tx.strRef:
                    pass
            series_data = []
            categories = []
            for s in chart.series:
                series_name = getattr(s, 'title', None)
                if series_name and hasattr(series_name, 'v') and series_name.v:
                    sname = str(series_name.v)
                else:
                    sname = f'Series {len(series_data) + 1}'
                vals = []
                if hasattr(s, 'val') and s.val and hasattr(s.val, 'numRef') and s.val.numRef:
                    f = s.val.numRef.f
                    if f:
                        vals = _resolve_ref_to_values(wb, f)
                        if vals and isinstance(vals[0], list):
                            vals = [v for row in vals for v in row if v is not None]
                if hasattr(s, 'cat') and s.cat and hasattr(s.cat, 'strRef') and s.cat.strRef:
                    f = s.cat.strRef.f
                    if f:
                        cat_vals = _resolve_ref_to_values(wb, f)
                        if cat_vals and not categories:
                            if isinstance(cat_vals[0], list):
                                categories = [str(v) for row in cat_vals for v in row if v is not None]
                            else:
                                categories = [str(v) for v in cat_vals if v is not None]
                if not vals and hasattr(s, 'yVal') and s.yVal:
                    pass
                series_data.append({'name': sname, 'data': vals if vals else []})
            if not categories and series_data:
                categories = [str(i) for i in range(len(series_data[0]['data']) if series_data[0]['data'] else 0)]
            charts_list.append({
                'type': ctype,
                'title': title or 'Chart',
                'series': series_data,
                'categories': categories,
            })
        except Exception:
            continue
    return charts_list


def extract_chart_images(ws: Worksheet) -> str | None:
    """Extract embedded images (e.g., matplotlib charts) from a worksheet as base64."""
    images = getattr(ws, '_images', []) or []
    if not images:
        return None
    try:
        img = images[0]
        if hasattr(img, '_data') and img._data:
            return base64.b64encode(img._data()).decode('utf-8')
        if hasattr(img, 'ref') and hasattr(img, '_data'):
            return base64.b64encode(img._data()).decode('utf-8')
    except Exception:
        pass
    return None


def extract_enriched_workbook(path: Path) -> dict[str, Any]:
    """
    Extract sheet data, conditional formatting, tables, and charts from an xlsx file.
    Returns a JSON-serializable dict for the enriched workbook API.
    """
    wb = load_workbook(path, data_only=True, read_only=False)
    sheet_names = list(wb.sheetnames)
    sheets_data = {}
    conditional_formatting = {}
    tables = {}
    charts = {}
    chart_images = {}

    for sheet_name in sheet_names:
        ws = wb[sheet_name]
        df_dict = pd.read_excel(path, sheet_name=sheet_name, header=None)
        arr = df_dict.values.tolist()
        for i, row in enumerate(arr):
            for j, v in enumerate(row):
                if pd.isna(v):
                    arr[i][j] = None
                elif isinstance(v, (int, float)) and not isinstance(v, bool):
                    arr[i][j] = float(v) if isinstance(v, float) else int(v)
        sheets_data[sheet_name] = arr
        conditional_formatting[sheet_name] = extract_conditional_formatting(ws)
        tables[sheet_name] = extract_tables(ws)
        charts[sheet_name] = extract_charts(ws, wb)
        img_b64 = extract_chart_images(ws)
        if img_b64:
            chart_images[sheet_name] = img_b64

    wb.close()
    return {
        'sheets': sheets_data,
        'conditionalFormatting': conditional_formatting,
        'tables': tables,
        'charts': charts,
        'chartImages': chart_images,
        'sheetNames': sheet_names,
    }
