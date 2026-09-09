from __future__ import annotations
import json, sqlite3, threading
from pathlib import Path
from .common import canonical, now

SCHEMA='''
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS datasets(id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY, payload TEXT NOT NULL, original_path TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, status TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS suites(id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rankings(id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS civil_cases(id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS document_notes(id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS document_checks(id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ratings(id INTEGER PRIMARY KEY AUTOINCREMENT,run_id TEXT NOT NULL REFERENCES runs(id),task_id TEXT NOT NULL,reviewer TEXT NOT NULL,score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),notes TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS form_states(id TEXT NOT NULL,run_id TEXT NOT NULL REFERENCES runs(id),chart_id TEXT NOT NULL,model_sha256 TEXT NOT NULL,evidence_id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(id,run_id));
CREATE TABLE IF NOT EXISTS audit_events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,event_type TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);
'''

class Store:
    def __init__(self,root):
        self.root=Path(root);self.root.mkdir(parents=True,exist_ok=True);self.path=self.root/'mindex_local.sqlite3';self.lock=threading.RLock()
        with self.connect() as c:c.executescript(SCHEMA)
    def connect(self):
        c=sqlite3.connect(self.path,timeout=15);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON');return c
    def put(self,table,identifier,payload,**extra):
        if table not in ['datasets','documents','runs','suites','rankings','civil_cases','document_notes','document_checks','settings']:raise ValueError('Invalid collection')
        fields={'id':identifier,'payload':canonical(payload).decode(),**extra}
        if table!='settings':fields['created_at']=payload.get('created_at',now())
        with self.lock,self.connect() as c:
            updates=','.join(k+'=excluded.'+k for k in fields if k!='id')
            c.execute(f"INSERT INTO {table} ({','.join(fields)}) VALUES ({','.join('?' for _ in fields)}) ON CONFLICT(id) DO UPDATE SET {updates}",tuple(fields.values()))
    def get(self,table,identifier):
        if table not in ['datasets','documents','runs','suites','rankings','civil_cases','document_notes','document_checks','settings']:raise ValueError('Invalid collection')
        with self.connect() as c:r=c.execute(f'SELECT payload FROM {table} WHERE id=?',(identifier,)).fetchone()
        if not r:raise KeyError(identifier)
        return json.loads(r['payload'])
    def list(self,table,limit=200):
        if table not in ['datasets','documents','runs','suites','rankings','civil_cases','document_notes','document_checks']:raise ValueError('Invalid collection')
        with self.connect() as c:rows=c.execute(f'SELECT payload FROM {table} ORDER BY created_at DESC LIMIT ?',(limit,)).fetchall()
        return [json.loads(r['payload']) for r in rows]
    def add_states(self,run_id,predictions):
        with self.lock,self.connect() as c:
            c.executemany('INSERT INTO form_states(id,run_id,chart_id,model_sha256,evidence_id,payload) VALUES(?,?,?,?,?,?)',[(p['id'],run_id,p['chart_id'],p['model_sha256'],p['id'],canonical(p).decode()) for p in predictions])
    def rate(self,run_id,task_id,reviewer,score,notes):
        self.get('runs',run_id)
        if task_id not in ['12','13','8','14'] or not 1<=int(score)<=5:raise ValueError('Valid task and rating 1–5 required')
        if not str(reviewer).strip():raise ValueError('Reviewer name is required')
        with self.lock,self.connect() as c:c.execute('INSERT INTO ratings(run_id,task_id,reviewer,score,notes,created_at) VALUES(?,?,?,?,?,?)',(run_id,task_id,str(reviewer)[:120],int(score),str(notes)[:10000],now()))
    def ratings(self,run_id):
        with self.connect() as c:rows=c.execute('SELECT * FROM ratings WHERE run_id=? ORDER BY id',(run_id,)).fetchall()
        return [dict(r) for r in rows]
    def audit(self,kind,payload):
        with self.lock,self.connect() as c:c.execute('INSERT INTO audit_events(event_type,payload,created_at) VALUES(?,?,?)',(kind,canonical(payload).decode(),now()))
