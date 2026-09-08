#!/usr/bin/env python3
"""Install missing app dependencies, start the local server, and open its verified URL."""
from __future__ import annotations
import argparse,json,os,socket,subprocess,sys,time,traceback,webbrowser
from pathlib import Path
from urllib.request import Request,build_opener,ProxyHandler

ROOT=Path(__file__).resolve().parent
DEPENDENCY_CHECK="from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey; k=Ed25519PrivateKey.generate(); k.public_key().verify(k.sign(b'itdx-startup'),b'itdx-startup')"

def log(message):print(message,flush=True)
def check_files(root):
    required=['run.py','requirements-optional.txt','web/index.html','web/app.js','itdx/runner.py','bundled_documents/index.json','vendor/pypdf/__init__.py']
    missing=[name for name in required if not (root/name).is_file()]
    if missing:raise RuntimeError('The application folder is incomplete. Extract the ENTIRE ZIP first; do not run a launcher inside the ZIP. Missing: '+', '.join(missing))
def venv_python(folder):return folder/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
def has_signing(python):
    try:return subprocess.run([str(python),'-c',DEPENDENCY_CHECK],capture_output=True,timeout=20).returncode==0
    except (OSError,subprocess.TimeoutExpired):return False

def choose_python(root,allow_unsigned=False,no_install=False):
    env_path=root/'.itdx-venv';env_python=venv_python(env_path)
    if env_python.is_file() and has_signing(env_python):return env_python,True
    if has_signing(sys.executable):return Path(sys.executable),True
    if allow_unsigned:return Path(sys.executable),False
    if no_install:raise RuntimeError('Ed25519 support is missing. Run the launcher normally while online to install it, or explicitly use --allow-unsigned for the core app.')
    log('Preparing an isolated Python environment for the missing signing dependency...')
    result=subprocess.run([sys.executable,'-m','venv',str(env_path)])
    if result.returncode:raise RuntimeError('Could not create the Python environment. On Debian/Ubuntu install python3-venv; otherwise repair the Python installation. Then run this launcher again.')
    log('Installing required packages into the application environment...')
    result=subprocess.run([str(env_python),'-m','pip','install','--disable-pip-version-check','--no-input','--only-binary=:all:','-r',str(root/'requirements-optional.txt')])
    if result.returncode or not has_signing(env_python):raise RuntimeError('Dependency installation failed. Check your internet connection and Python installation, then run the launcher again. The core app can run without signing with: python launch.py --allow-unsigned')
    return env_python,True

def free_port(start=8765,count=20):
    for port in range(start,min(65536,start+count)):
        with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as sock:
            try:sock.bind(('127.0.0.1',port));return port
            except OSError:continue
    raise RuntimeError('All suggested ports are in use. Run: python launch.py --port 8800')

def get_json(port,path,timeout=1):
    # This is a local application check. Never send localhost requests through a network proxy.
    with build_opener(ProxyHandler({})).open(Request('http://127.0.0.1:'+str(port)+path,headers={'Accept':'application/json'}),timeout=timeout) as response:
        data=response.read(4_000_001)
        if len(data)>4_000_000:raise ValueError('Local status response is unexpectedly large')
        return json.loads(data)

def app_ready(port,data_dir):
    h=get_json(port,'/api/health');b=get_json(port,'/api/bootstrap',timeout=2)
    valid=h.get('status')=='ok' and h.get('loopback_only') is True and 'tasks' in b and Path(b.get('runtime',{}).get('data_dir','')).resolve()==data_dir.resolve()
    if not valid:raise ValueError('Port responds, but it is not this application instance')
    return {'status':'READY','url':'http://127.0.0.1:'+str(port),'port':port,'version':h.get('version'),'documents':len(b['documents']),'scenarios':len(b['scenarios']),'signing_available':h['signing_available']}

def wait_ready(process,port,data_dir,timeout=60):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        if process.poll() is not None:raise RuntimeError('The application exited during startup (code '+str(process.returncode)+'). Read local_data/startup.log for the exact error.')
        try:return app_ready(port,data_dir)
        except (OSError,ValueError,KeyError):time.sleep(.2)
    raise RuntimeError('The app did not respond within '+str(timeout)+' seconds. Read local_data/startup.log; no browser was opened.')

def terminate(process):
    if process.poll() is None:
        process.terminate()
        try:process.wait(timeout=10)
        except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--no-browser',action='store_true');p.add_argument('--no-install',action='store_true');p.add_argument('--allow-unsigned',action='store_true');p.add_argument('--smoke-test',action='store_true',help='Start, check health, then stop without opening a browser');p.add_argument('--port',type=int,default=8765);p.add_argument('--data-dir',type=Path,default=ROOT/'local_data');p.add_argument('--diagnose',action='store_true');a=p.parse_args(argv)
    process=None;log_path=None
    try:
        if sys.version_info<(3,10):raise RuntimeError('Python 3.10 or newer is required. Run the operating-system launcher to locate or install Python.')
        if not 1024<=a.port<=65535:raise ValueError('Port must be between 1024 and 65535')
        check_files(ROOT);data_dir=a.data_dir.resolve();data_dir.mkdir(parents=True,exist_ok=True);log_path=data_dir/'startup.log'
        with log_path.open('a',encoding='utf-8') as f:f.write('\n=== ITDX startup '+time.strftime('%Y-%m-%d %H:%M:%S')+' ===\nPython: '+sys.version.split()[0]+'\nFolder: '+str(ROOT)+'\n')
        if a.diagnose:
            log(json.dumps({'python':sys.version.split()[0],'python_executable':sys.executable,'platform':sys.platform,'application_folder':str(ROOT),'data_folder':str(data_dir),'all_required_files_present':True,'base_python_signing_available':has_signing(sys.executable),'suggested_free_port':free_port(a.port),'log':str(log_path)},indent=2));return 0
        python,signing=choose_python(ROOT,a.allow_unsigned,a.no_install)
        log('Python: '+str(python));log('Signing: '+('available' if signing else 'UNSIGNED mode explicitly selected'))
        ready_file=data_dir/'ready.json'
        # Reuse a verified instance started from this same data folder; never open an arbitrary service.
        if ready_file.is_file() and not a.smoke_test:
            try:
                port=int(json.loads(ready_file.read_text(encoding='utf-8'))['port'])
                if not 1024<=port<=65535:raise ValueError('Invalid saved port')
                info=app_ready(port,data_dir);log('The app is already running: '+info['url'])
                if not a.no_browser and not webbrowser.open(info['url']):log('Open the URL above in your regular browser.')
                return 0
            except (OSError,ValueError,KeyError):pass
        port=free_port(a.port)
        if port!=a.port:log('Port '+str(a.port)+' is occupied. Using '+str(port)+'.')
        log('Starting the application. Waiting for it to respond...')
        child_env=dict(os.environ);child_env['PYTHONUTF8']='1';child_env['PYTHONUNBUFFERED']='1'
        with log_path.open('a',encoding='utf-8') as output:
            process=subprocess.Popen([str(python),'-X','utf8',str(ROOT/'run.py'),'--no-browser','--port',str(port),'--data-dir',str(data_dir)],cwd=ROOT,env=child_env,stdout=output,stderr=subprocess.STDOUT)
            info=wait_ready(process,port,data_dir)
            ready_file.write_text(json.dumps(info,indent=2)+'\n',encoding='utf-8')
            log('\nAPP IS READY: '+info['url']);log(str(info['documents'])+' documents | '+str(info['scenarios'])+' scenarios | signing '+('enabled' if info['signing_available'] else 'unavailable'))
            if a.smoke_test:log('Startup check passed. Stopping the test server.');terminate(process);ready_file.unlink(missing_ok=True);return 0
            if not a.no_browser:
                if not webbrowser.open(info['url']):log('Automatic browser opening was unavailable. Open the verified URL above in your regular browser.')
            log('Keep this window open while using the app. Press Ctrl+C to stop.');log('If anything fails, the diagnostic log is: '+str(log_path))
            result=process.wait()
            if result:raise RuntimeError('The application stopped with exit code '+str(result)+'. See '+str(log_path))
            return 0
    except KeyboardInterrupt:
        log('\nStopping the local application.');return 0
    except Exception as e:
        log('\nSTARTUP FAILED: '+str(e))
        if log_path:
            try:
                with log_path.open('a',encoding='utf-8') as f:traceback.print_exc(file=f)
                log('Error details saved to: '+str(log_path))
            except OSError:log('The startup log is not writable. Extract the app into a folder you can write to, such as Downloads or Documents.')
        return 1
    finally:
        if process is not None:
            terminate(process)
            try:ready_file.unlink(missing_ok=True)
            except OSError:pass
if __name__=='__main__':sys.exit(main())
