#!/usr/bin/env bash
# Fill mandatory Project fields (Priority / Size / Estimate) + assignee for
# every issue on the Roadmap project that is missing them.
#
# Mapping (from labels → project fields):
#   priority: high   → Priority = P0
#   priority: medium → Priority = P1
#   priority: low    → Priority = P2
#
#   sp:1  → Size = S,  Estimate = 1
#   sp:2  → Size = M,  Estimate = 2
#   sp:3  → Size = L,  Estimate = 3
#   sp:5  → Size = XL, Estimate = 5
#
# Assignee is always dmitry-malykhin.
#
# Usage:
#   scripts/gh/backfill-project-fields.sh           # every issue on the board
#   scripts/gh/backfill-project-fields.sh 386 390   # only the listed issue numbers

set -euo pipefail
exec python3 - "$@" <<'PY'
import json, subprocess, sys

targets = set(int(a) for a in sys.argv[1:] if a.isdigit())

PROJECT_ID = 'PVT_kwHOA-8K0c4BN0A_'
PRIO_F = 'PVTSSF_lAHOA-8K0c4BN0A_zg8svYE'
SIZE_F = 'PVTSSF_lAHOA-8K0c4BN0A_zg8svYI'
EST_F  = 'PVTF_lAHOA-8K0c4BN0A_zg8svYM'

PRIO = {'priority: high': '79628723', 'priority: medium': '0a877460', 'priority: low': 'da944a9c'}
SIZE = {'sp:1': ('f784b110', 1), 'sp:2': ('7515a9f1', 2), 'sp:3': ('817d0097', 3), 'sp:5': ('db339eb2', 5)}

raw = subprocess.check_output(
    ['gh','project','item-list','5','--owner','@me','--format','json','--limit','500'], text=True)
items = json.loads(raw)['items']

def set_single(item_id, field_id, opt_id):
    subprocess.run(['gh','project','item-edit',
        '--project-id', PROJECT_ID, '--id', item_id,
        '--field-id', field_id,
        '--single-select-option-id', opt_id], check=True, capture_output=True)

def set_number(item_id, field_id, value):
    subprocess.run(['gh','project','item-edit',
        '--project-id', PROJECT_ID, '--id', item_id,
        '--field-id', field_id,
        '--number', str(value)], check=True, capture_output=True)

for i in items:
    c = i.get('content') or {}
    n = c.get('number')
    if not n: continue
    if targets and n not in targets: continue

    # gh project item-list omits labels/assignees; fetch per issue
    detail = subprocess.check_output(
        ['gh','issue','view', str(n), '--json', 'labels,assignees'], text=True)
    dj = json.loads(detail)
    labels = [l['name'] for l in dj.get('labels', [])]
    assignees = [a['login'] for a in dj.get('assignees', [])]

    changes = []
    prio_opt = next((v for k, v in PRIO.items() if k in labels), None)
    if prio_opt and not i.get('priority'):
        set_single(i['id'], PRIO_F, prio_opt); changes.append('Priority')

    sp_hit = next((SIZE[k] for k in SIZE if k in labels), None)
    if sp_hit:
        size_opt, est_val = sp_hit
        if not i.get('size'):
            set_single(i['id'], SIZE_F, size_opt); changes.append('Size')
        if not i.get('estimate'):
            set_number(i['id'], EST_F, est_val); changes.append('Estimate')

    if 'dmitry-malykhin' not in assignees:
        r = subprocess.run(['gh','issue','edit', str(n), '--add-assignee', 'dmitry-malykhin'],
                           capture_output=True, text=True)
        if r.returncode == 0:
            changes.append('Assignee')

    marker = f'set: {", ".join(changes)}' if changes else 'already complete'
    print(f'#{n:4}  labels={labels}  → {marker}')
PY
