"""Reproducible Borda aggregation of evaluator preferences, not inference confidence."""
from .common import digest, safe_id

METHOD = 'borda-average-ties/v1'


def _text(value, field, limit=1000, required=True):
    if not isinstance(value, str) or len(value) > limit or (required and not value.strip()):
        raise ValueError(f'{field}: text is required (maximum {limit} characters)')
    return value.strip()


def evaluate(payload):
    if not isinstance(payload, dict):
        raise ValueError('Comparison must be a JSON object')
    mode = payload.get('mode', 'rank')
    if mode not in ('rank', 'rating_1_5'):
        raise ValueError('Mode must be rank or rating_1_5')
    candidates = payload.get('candidates')
    ballots = payload.get('ballots', [])
    if not isinstance(candidates, list) or not 2 <= len(candidates) <= 20:
        raise ValueError('Use a fixed set of 2–20 comparable outputs')
    if not isinstance(ballots, list) or len(ballots) > 100:
        raise ValueError('Use at most 100 evaluator ballots')
    clean_candidates = []
    ids = []
    for c in candidates:
        if not isinstance(c, dict):
            raise ValueError('Each output must be an object')
        key = safe_id(c.get('id'))
        if key in ids:
            raise ValueError('Output identifiers must be unique')
        ids.append(key)
        clean_candidates.append({'id': key, 'label': _text(c.get('label'), 'Output label', 160),
                                 'evidence_ref': _text(c.get('evidence_ref', ''), 'Evidence reference', 1000, False)})
    clean = {'schema': 'itdx-ranking-input/v1',
             'title': _text(payload.get('title'), 'Comparison title', 200),
             'scenario': _text(payload.get('scenario'), 'Scenario / comparison context', 1000),
             'task_id': _text(payload.get('task_id', 'other'), 'Task', 50),
             'rubric': _text(payload.get('rubric'), 'Criterion and scale definition', 4000),
             'mode': mode, 'candidates': clean_candidates, 'ballots': []}
    names = set()
    traces = []
    sums = {key: 0.0 for key in ids}
    rank_sums = {key: 0.0 for key in ids}
    m = len(ids)
    for b in ballots:
        if not isinstance(b, dict):
            raise ValueError('Each ballot must be an object')
        reviewer = _text(b.get('reviewer'), 'Evaluator identifier', 120)
        if reviewer.casefold() in names:
            raise ValueError('One ballot per evaluator per comparison; duplicate evaluator found')
        names.add(reviewer.casefold())
        scores = b.get('scores')
        if not isinstance(scores, dict) or set(scores) != set(ids):
            raise ValueError('Every ballot must name the same complete output set')
        maximum = 5 if mode == 'rating_1_5' else m
        for value in scores.values():
            if value is not None and (type(value) is not int or not 1 <= value <= maximum):
                raise ValueError(f'Ballot values must be integers 1–{maximum}, or null for abstention')
        missing = sum(v is None for v in scores.values())
        if 0 < missing < m:
            raise ValueError('Partial ballots are not scored. Complete the comparison or abstain on the whole ballot.')
        clean['ballots'].append({'reviewer': reviewer, 'scores': {key: scores[key] for key in ids},
                                 'notes': _text(b.get('notes', ''), 'Evaluator notes', 4000, False)})
        if missing == m:
            traces.append({'reviewer': reviewer, 'status': 'ABSTAINED', 'ranks': {}, 'points': {}})
            continue
        ranks, points = {}, {}
        for key in ids:
            value = scores[key]
            better = sum(v > value if mode == 'rating_1_5' else v < value for v in scores.values())
            tied = sum(v == value for v in scores.values())
            ranks[key] = better + (tied + 1) / 2
            points[key] = m - ranks[key]
            sums[key] += points[key]
            rank_sums[key] += ranks[key]
        traces.append({'reviewer': reviewer, 'status': 'COUNTED', 'ranks': ranks, 'points': points})
    n = sum(t['status'] == 'COUNTED' for t in traces)
    ordered = sorted(clean_candidates, key=lambda c: (-sums[c['id']], c['id']))
    rows = []
    for c in ordered:
        key = c['id']
        rows.append({**c, 'position': 1 + sum(s > sums[key] for s in sums.values()) if n else None,
                     'borda_points': sums[key], 'mean_rank': rank_sums[key] / n if n else None,
                     'normalized_preference': sums[key] / (n * (m - 1)) if n else None})
    result = {'method': METHOD, 'input_sha256': digest(clean), 'candidate_count': m,
              'counted_ballots': n, 'abstained_ballots': len(traces) - n,
              'status': 'MEASURED_PREFERENCE' if n else 'NO_COUNTED_BALLOTS',
              'top_tie_ids': [r['id'] for r in rows if r['position'] == 1],
              'rows': rows, 'ballot_trace': traces,
              'rules': {'points': 'm − average occupied rank; highest total first',
                        'ties': 'Average points across occupied positions; final ties retained',
                        'missing': 'Whole-ballot abstention allowed; partial ballots rejected',
                        'weights': 'Equal evaluator weights; independence is not assumed',
                        'rating_conversion': 'Higher 1–5 rating ranks ahead; magnitude is discarded' if mode == 'rating_1_5' else 'Lower rank value ranks ahead',
                        'scope': 'Relative preference for this fixed output set and criterion. No probability, truth, acceptance, or command authority is inferred. Evidence references and rubric text are supplied by the evaluator.'}}
    return {'input': clean, 'result': result, 'result_sha256': digest(result)}
