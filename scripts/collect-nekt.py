#!/usr/bin/env python3
"""
Accumulates MCP output files into per-pipe JSON data files.
Usage: python3 collect-nekt.py <pipe_key> <mcp_output_file>
  pipe_key: 0, 1, 2, 3, 4, 5, 51
"""
import json
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

def collect(pipe_key, mcp_file):
    with open(mcp_file) as f:
        result = json.load(f)

    rows = result["data"]
    cols = result["columns"]
    row_count = result["row_count"]

    records = [dict(zip(cols, row)) for row in rows]

    out_path = os.path.join(DATA_DIR, f"pipe_{pipe_key}.json")
    existing = []
    existing_ids = set()
    if os.path.exists(out_path):
        with open(out_path) as f:
            existing = json.load(f)
        existing_ids = {r["id"] for r in existing}

    new_records = [r for r in records if r["id"] not in existing_ids]
    existing.extend(new_records)

    with open(out_path, "w") as f:
        json.dump(existing, f)

    last_id = max(int(r["id"]) for r in existing) if existing else 0
    print(f"pipe_{pipe_key}: +{len(new_records)} new rows → total {len(existing)} | last_id={last_id}")
    return last_id, len(existing)

def status(pipe_key):
    out_path = os.path.join(DATA_DIR, f"pipe_{pipe_key}.json")
    if not os.path.exists(out_path):
        print(f"pipe_{pipe_key}: 0 rows")
        return 0, 0
    with open(out_path) as f:
        data = json.load(f)
    last_id = max(int(r["id"]) for r in data) if data else 0
    print(f"pipe_{pipe_key}: {len(data)} rows | last_id={last_id}")
    return last_id, len(data)

if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "status":
        for k in ["0","1","2","3","4","5","51"]:
            status(k)
    elif len(sys.argv) >= 3:
        collect(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python3 collect-nekt.py <pipe_key> <mcp_output_file>")
        print("       python3 collect-nekt.py status")
