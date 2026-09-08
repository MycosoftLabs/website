"""Typed, source-attributed report review and ASCOPE/PMESII projection.

Source disciplines are provenance categories. They do not establish truth or
provide collection, interception, identity inference, or operational decisions.
"""
import math
from .common import digest, safe_id, epoch
from .ranking import _text

ASCOPE = ['Areas', 'Structures', 'Capabilities', 'Organizations', 'People', 'Events']
PMESII = ['Political', 'Military', 'Economic', 'Social', 'Infrastructure', 'Information']
DISCIPLINES = ['HUMINT', 'SIGINT', 'OSINT', 'GEOINT', 'IMINT', 'MASINT', 'TECHINT', 'OTHER']


def assess(payload):
    if not isinstance(payload, dict):
        raise ValueError('Evidence case must be an object')
    records = payload.get('records')
    if not isinstance(records, list) or len(records) > 2000:
        raise ValueError('Supply a records array with at most 2000 reports')
    clean = {'schema': 'itdx-civil-evidence/v1', 'chart_id': 'civil-evidence/v1',
             'title': _text(payload.get('title'), 'Case title', 200),
             'scenario': _text(payload.get('scenario'), 'Scenario context', 1000),
             'data_mode': payload.get('data_mode', 'SUPPLIED_REPORTS'),
             'confidence_definition': _text(payload.get('confidence_definition', ''), 'Confidence scale definition', 2000, False),
             'records': []}
    if clean['data_mode'] not in ['SUPPLIED_REPORTS', 'SYNTHETIC_EXERCISE']:
        raise ValueError('Data mode must be SUPPLIED_REPORTS or SYNTHETIC_EXERCISE')
    ids = set()
    for raw in records:
        if not isinstance(raw, dict):
            raise ValueError('Each report must be an object')
        key = safe_id(raw.get('id'))
        if key in ids:
            raise ValueError('Duplicate report ID; resolve duplicates before assessment')
        ids.add(key)
        discipline = raw.get('discipline')
        if discipline not in DISCIPLINES:
            raise ValueError('Unknown source discipline')
        facets = raw.get('ascope', [])
        variables = raw.get('pmesii', [])
        for values, allowed, field in [(facets, ASCOPE, 'ASCOPE'), (variables, PMESII, 'PMESII')]:
            if not isinstance(values, list) or any(v not in allowed for v in values) or len(set(values)) != len(values):
                raise ValueError(f'{field} tags must be unique values from the declared axis')
        observed_at = raw.get('observed_at')
        if observed_at is not None:
            _text(observed_at, 'Observation timestamp', 60)
            try:
                epoch(observed_at)
            except (ValueError, OverflowError) as e:
                raise ValueError('Use a valid observation timestamp with UTC offset') from e
        kind = raw.get('kind', 'reported')
        review = raw.get('review_status', 'unreviewed')
        if kind not in ['observed', 'reported', 'assessed'] or review not in ['unreviewed', 'reviewed', 'disputed']:
            raise ValueError('Invalid claim kind or review status')
        confidence = raw.get('confidence')
        if confidence is not None and (type(confidence) is not int or not 1 <= confidence <= 5 or not clean['confidence_definition']):
            raise ValueError('Confidence needs an integer 1–5 and a declared scale; use null when unknown')
        location = raw.get('location')
        if location is not None:
            if not isinstance(location, dict) or set(location) != {'lat', 'lon'}:
                raise ValueError('Location must contain lat and lon in EPSG:4326, or be null')
            for field, bound in [('lat', 90), ('lon', 180)]:
                value = location[field]
                if type(value) not in [int, float] or not math.isfinite(value) or not -bound <= value <= bound:
                    raise ValueError('Invalid latitude or longitude')
        conflicts = raw.get('conflicts_with', [])
        if not isinstance(conflicts, list) or any(not isinstance(x, str) for x in conflicts) or len(set(conflicts)) != len(conflicts):
            raise ValueError('Conflicts must be unique report identifiers')
        record = {'id': key, 'discipline': discipline,
                  'source_ref': _text(raw.get('source_ref'), 'Source reference', 1000),
                  'source_group': _text(raw.get('source_group', ''), 'Declared source group', 160, False),
                  'statement': _text(raw.get('statement'), 'Statement', 10000),
                  'kind': kind, 'review_status': review,
                  'ascope': facets, 'pmesii': variables,
                  'observed_at': observed_at, 'location': location,
                  'confidence': confidence, 'conflicts_with': conflicts,
                  'analyst_notes': _text(raw.get('analyst_notes', ''), 'Analyst notes', 4000, False)}
        clean['records'].append(record)
    for r in clean['records']:
        if any(key not in ids or key == r['id'] for key in r['conflicts_with']):
            raise ValueError('Conflicting reports must exist in this case and must not refer to themselves')
    matrix = []
    for facet in ASCOPE:
        for variable in PMESII:
            selected = [r for r in clean['records'] if facet in r['ascope'] and variable in r['pmesii']]
            matrix.append({'ascope': facet, 'pmesii': variable,
                           'status': 'REPORTS_PRESENT' if selected else 'UNKNOWN',
                           'report_ids': [r['id'] for r in selected],
                           'report_count': len(selected),
                           'reviewed': sum(r['review_status'] == 'reviewed' for r in selected),
                           'disputed': sum(r['review_status'] == 'disputed' for r in selected),
                           'declared_source_groups': len({r['source_group'] for r in selected if r['source_group']}),
                           'unknown_source_group': sum(not r['source_group'] for r in selected)})
    result = {'method': 'declared-evidence-projection/v1', 'input_sha256': digest(clean),
              'record_count': len(records), 'matrix': matrix,
              'source_disciplines': {d: sum(r['discipline'] == d for r in clean['records']) for d in DISCIPLINES},
              'unmapped_report_ids': [r['id'] for r in clean['records'] if not r['ascope'] or not r['pmesii']],
              'missing_time': sum(r['observed_at'] is None for r in clean['records']),
              'missing_location': sum(r['location'] is None for r in clean['records']),
              'declared_conflict_links': sum(len(r['conflicts_with']) for r in clean['records']),
              'boundary': 'Tags, confidence, source groups, and conflicts are analyst supplied. Report counts are not confidence or civil-environment completeness. No external feed or NLM model is executed by this projection; source authenticity and independence require separate review.'}
    return {'input': clean, 'result': result, 'result_sha256': digest(result)}
