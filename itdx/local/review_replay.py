#!/usr/bin/env python3
"""Verify deterministic source-matrix projection from an exported case JSON."""
import json
import sys
from pathlib import Path
from itdx.civil_evidence import assess

def main():
    try:
        document=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
        computed=assess(document.get('input',document))
        if 'result' in document and (computed['result']!=document['result'] or computed['result_sha256']!=document.get('result_sha256')):
            print('MISMATCH: saved matrix does not match the supplied reports.')
            return 1
        print(json.dumps(computed,indent=2,ensure_ascii=False))
        return 0
    except (IndexError,OSError,ValueError,TypeError) as e:
        print('Usage: python review_replay.py case.json\n'+str(e),file=sys.stderr)
        return 2

if __name__=='__main__':sys.exit(main())
