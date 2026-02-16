#!/usr/bin/env python3
"""
Genera SQL (PostgreSQL) para categories, brands y products desde un archivo XLSX.

Uso:
  python3 scripts/xlsx_to_product_inserts.py --xlsx productos.xlsx --tenant-id <UUID> --output inserts.sql
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
import zipfile
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Dict, List, Optional
import xml.etree.ElementTree as ET


NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def col_to_index(col_ref: str) -> int:
    n = 0
    for ch in col_ref:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def normalize_header(value: str) -> str:
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"\s+", " ", text.strip().lower())
    return text


def slugify(value: str) -> str:
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "sin-categoria"


def sql_quote(value: Optional[str]) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def parse_decimal(value: Optional[str]) -> Optional[Decimal]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    text = text.replace(" ", "")

    # Heurística: si tiene "." y ",", tratamos "." como miles y "," como decimal.
    if "." in text and "," in text:
        text = text.replace(".", "").replace(",", ".")
    elif "," in text:
        text = text.replace(",", ".")

    text = re.sub(r"[^0-9.\-]", "", text)
    if text in {"", "-", ".", "-."}:
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def parse_int(value: Optional[str]) -> Optional[int]:
    dec = parse_decimal(value)
    if dec is None:
        return None
    try:
        return int(dec)
    except (ValueError, OverflowError):
        return None


def read_xlsx_rows(path: Path, sheet_index: int = 0) -> List[Dict[str, str]]:
    with zipfile.ZipFile(path) as zf:
        shared_strings: List[str] = []
        if "xl/sharedStrings.xml" in zf.namelist():
            shared_root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in shared_root.findall("x:si", NS):
                text = "".join((t.text or "") for t in si.findall(".//x:t", NS))
                shared_strings.append(text)

        workbook = ET.fromstring(zf.read("xl/workbook.xml"))
        sheets = workbook.findall("x:sheets/x:sheet", NS)
        if not sheets:
            raise ValueError("El XLSX no contiene hojas.")
        if sheet_index < 0 or sheet_index >= len(sheets):
            raise ValueError(f"sheet_index fuera de rango: {sheet_index}")

        rels_root = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        rel_by_id = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in rels_root.findall("{http://schemas.openxmlformats.org/package/2006/relationships}Relationship")
        }

        rel_id = sheets[sheet_index].attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        if not rel_id or rel_id not in rel_by_id:
            raise ValueError("No se pudo resolver la hoja en workbook.xml.rels")

        sheet_target = rel_by_id[rel_id].lstrip("/")
        if not sheet_target.startswith("xl/"):
            sheet_target = f"xl/{sheet_target}"

        sheet = ET.fromstring(zf.read(sheet_target))
        row_nodes = sheet.findall(".//x:sheetData/x:row", NS)
        if not row_nodes:
            return []

        matrix: List[List[str]] = []
        max_col = 0

        for row in row_nodes:
            row_map: Dict[int, str] = {}
            for cell in row.findall("x:c", NS):
                ref = cell.attrib.get("r", "")
                col_ref_match = re.match(r"[A-Z]+", ref)
                if not col_ref_match:
                    continue
                col_idx = col_to_index(col_ref_match.group(0))
                cell_type = cell.attrib.get("t")
                value_node = cell.find("x:v", NS)
                val = ""
                if value_node is not None and value_node.text is not None:
                    val = value_node.text
                    if cell_type == "s":
                        val = shared_strings[int(val)]
                row_map[col_idx] = val
                max_col = max(max_col, col_idx)

            matrix.append([row_map.get(i, "") for i in range(max_col + 1)])

        headers = [normalize_header(h) for h in matrix[0]]
        records: List[Dict[str, str]] = []
        for row in matrix[1:]:
            item = {headers[i]: (row[i].strip() if i < len(row) else "") for i in range(len(headers))}
            if any(v for v in item.values()):
                records.append(item)

        return records


def pick_first(values: List[Optional[str]]) -> Optional[str]:
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def build_sql(rows: List[Dict[str, str]], tenant_id: str) -> str:
    categories: Dict[str, str] = {}
    brands: Dict[str, str] = {}
    product_values: List[str] = []
    sku_seen: Dict[str, int] = {}

    for idx, row in enumerate(rows, start=2):
        name = row.get("producto", "").strip()
        if not name:
            continue

        category_name = pick_first(
            [
                row.get("categoria primaria"),
                row.get("ruta categorias", "").split("/")[-1] if row.get("ruta categorias") else None,
            ]
        )
        category_slug = None
        if category_name:
            category_slug = slugify(category_name)
            categories[category_slug] = category_name

        brand_name = row.get("marca", "").strip() or None
        brand_slug = None
        if brand_name:
            brand_slug = slugify(brand_name)
            brands[brand_slug] = brand_name

        sku_base = pick_first(
            [
                row.get("sku"),
                row.get("codigo producto"),
                row.get("codigos interno"),
                row.get("id precio"),
                row.get("id"),
            ]
        )
        if not sku_base:
            sku_base = f"row-{idx}"
        sku = sku_base
        if sku in sku_seen:
            sku_seen[sku] += 1
            sku = f"{sku}-{sku_seen[sku]}"
        else:
            sku_seen[sku] = 1

        barcode = pick_first([row.get("codigos de barras"), row.get("codigo producto")])
        cost = parse_decimal(row.get("costo"))
        base_price = parse_decimal(row.get("precio")) or cost or Decimal("0")
        stock = parse_int(row.get("stock:tienda")) or 0

        description = pick_first([row.get("descripcion"), row.get("descripcion corta"), row.get("modelo")])

        metadata = {}
        if row.get("modelo"):
            metadata["model"] = row["modelo"]
        if row.get("tamanos"):
            metadata["size"] = row["tamanos"]
        if row.get("colores"):
            metadata["color"] = row["colores"]
        if row.get("etiquetas"):
            metadata["tags"] = row["etiquetas"]
        if row.get("imagenes ailoo"):
            metadata["images"] = row["imagenes ailoo"]
        if row.get("descuento"):
            metadata["discount"] = row["descuento"]

        metadata_json = json.dumps(metadata, ensure_ascii=False)

        category_sql = (
            f"(SELECT id FROM categories WHERE tenant_id = {sql_quote(tenant_id)} AND slug = {sql_quote(category_slug)})"
            if category_slug
            else "NULL"
        )
        brand_sql = (
            f"(SELECT id FROM brands WHERE tenant_id = {sql_quote(tenant_id)} AND slug = {sql_quote(brand_slug)})"
            if brand_slug
            else "NULL"
        )

        product_values.append(
            "("
            f"{sql_quote(tenant_id)}, "
            f"{category_sql}, "
            f"{brand_sql}, "
            f"{sql_quote(name)}, "
            f"{sql_quote(description)}, "
            f"{sql_quote(sku)}, "
            f"{sql_quote(barcode)}, "
            f"{base_price}, "
            f"{str(cost) if cost is not None else 'NULL'}, "
            f"{stock}, "
            f"{sql_quote(metadata_json)}::jsonb, "
            "true"
            ")"
        )

    lines: List[str] = []
    lines.append("-- SQL generado automáticamente desde XLSX")
    lines.append("BEGIN;")
    lines.append("")

    if categories:
        lines.append("-- Categories")
        cat_values = ",\n".join(
            f"({sql_quote(tenant_id)}, {sql_quote(name)}, {sql_quote(slug)})"
            for slug, name in sorted(categories.items())
        )
        lines.append("INSERT INTO categories (tenant_id, name, slug)")
        lines.append("VALUES")
        lines.append(cat_values)
        lines.append("ON CONFLICT (tenant_id, slug) DO UPDATE SET")
        lines.append("  name = EXCLUDED.name;")
        lines.append("")

    if brands:
        lines.append("-- Brands")
        brand_values = ",\n".join(
            f"({sql_quote(tenant_id)}, {sql_quote(name)}, {sql_quote(slug)})"
            for slug, name in sorted(brands.items())
        )
        lines.append("INSERT INTO brands (tenant_id, name, slug)")
        lines.append("VALUES")
        lines.append(brand_values)
        lines.append("ON CONFLICT (tenant_id, slug) DO UPDATE SET")
        lines.append("  name = EXCLUDED.name;")
        lines.append("")

    if product_values:
        lines.append("-- Products")
        lines.append(
            "INSERT INTO products "
            "(tenant_id, category_id, brand_id, name, description, sku, barcode, base_price, cost, stock, metadata, active)"
        )
        lines.append("VALUES")
        lines.append(",\n".join(product_values))
        lines.append("ON CONFLICT (tenant_id, sku) DO UPDATE SET")
        lines.append("  category_id = EXCLUDED.category_id,")
        lines.append("  brand_id = EXCLUDED.brand_id,")
        lines.append("  name = EXCLUDED.name,")
        lines.append("  description = EXCLUDED.description,")
        lines.append("  barcode = EXCLUDED.barcode,")
        lines.append("  base_price = EXCLUDED.base_price,")
        lines.append("  cost = EXCLUDED.cost,")
        lines.append("  stock = EXCLUDED.stock,")
        lines.append("  metadata = EXCLUDED.metadata,")
        lines.append("  active = EXCLUDED.active,")
        lines.append("  updated_at = NOW();")
        lines.append("")

    lines.append("COMMIT;")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera SQL INSERT/UPSERT para products desde XLSX")
    parser.add_argument("--xlsx", required=True, help="Ruta al archivo XLSX")
    parser.add_argument("--tenant-id", required=True, help="UUID del tenant")
    parser.add_argument("--sheet-index", type=int, default=0, help="Indice de hoja (default: 0)")
    parser.add_argument("--output", help="Archivo de salida .sql (si no se indica, imprime por stdout)")
    args = parser.parse_args()

    rows = read_xlsx_rows(Path(args.xlsx), sheet_index=args.sheet_index)
    sql = build_sql(rows, tenant_id=args.tenant_id)

    if args.output:
        Path(args.output).write_text(sql, encoding="utf-8")
        print(f"SQL generado en: {args.output}")
    else:
        print(sql)


if __name__ == "__main__":
    main()
