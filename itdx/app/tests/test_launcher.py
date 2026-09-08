import sys,tempfile,socket,subprocess,unittest,json,io,contextlib
from pathlib import Path
from unittest.mock import patch,Mock
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import launch
EXPECTED_DOCUMENTS=len({d["id"] for d in json.loads((ROOT/"bundled_documents/index.json").read_text())}|{d["id"] for p in (ROOT/"exercise_packs").glob("*/manifest.json") for d in json.loads(p.read_text())["documents"]})

class LauncherTests(unittest.TestCase):
 def test_incomplete_extraction_has_actionable_error(self):
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaisesRegex(RuntimeError,'Extract the ENTIRE ZIP'):launch.check_files(Path(d))
 def test_complete_package_recognized(self):launch.check_files(ROOT)
 def test_busy_port_selects_a_different_free_port(self):
  with socket.socket() as occupied:
   occupied.bind(('127.0.0.1',0));port=occupied.getsockname()[1]
   if port>65510:self.skipTest('Ephemeral port near range boundary')
   selected=launch.free_port(port);self.assertGreater(selected,port)
   with socket.socket() as available:available.bind(('127.0.0.1',selected))
 def test_missing_dependency_is_not_silently_reported_ready(self):
  with patch.object(launch,'has_signing',return_value=False):
   with self.assertRaisesRegex(RuntimeError,'Ed25519 support is missing'):launch.choose_python(ROOT,no_install=True)
 def test_unsigned_mode_requires_explicit_flag(self):
  with patch.object(launch,'has_signing',return_value=False):self.assertFalse(launch.choose_python(ROOT,allow_unsigned=True)[1])
 def test_unrelated_http_service_rejected(self):
  with patch.object(launch,'get_json',side_effect=[{'status':'ok','loopback_only':True},{'tasks':[],'runtime':{'data_dir':'/unrelated-app'}}]):
   with self.assertRaisesRegex(ValueError,'not this application'):launch.app_ready(8765,ROOT/'local_data')
 def test_exited_process_does_not_open_browser(self):
  proc=Mock();proc.poll.return_value=1
  with tempfile.TemporaryDirectory() as d,patch.object(launch,'choose_python',return_value=(Path(sys.executable),True)),patch.object(launch.subprocess,'Popen',return_value=proc),patch.object(launch.webbrowser,'open') as opened,contextlib.redirect_stdout(io.StringIO()) as output:
   code=launch.main(['--no-install','--data-dir',d]);self.assertEqual(code,1);self.assertIn('STARTUP FAILED',output.getvalue());opened.assert_not_called();self.assertFalse((Path(d)/'ready.json').exists())
 def test_browser_dispatch_waits_for_verified_server(self):
  calls=[]
  with tempfile.TemporaryDirectory() as d:
   def inspect_ready_url(url):
    from urllib.parse import urlparse
    info=launch.app_ready(urlparse(url).port,Path(d));calls.append(info);raise KeyboardInterrupt()
   with patch.object(launch.webbrowser,'open',side_effect=inspect_ready_url),contextlib.redirect_stdout(io.StringIO()):
    code=launch.main(['--no-install','--data-dir',d])
   self.assertEqual(code,0);self.assertEqual(len(calls),1);self.assertEqual(calls[0]['documents'],EXPECTED_DOCUMENTS);self.assertFalse((Path(d)/'ready.json').exists())
 def test_diagnostic_command_explains_actual_environment(self):
  with tempfile.TemporaryDirectory() as d:
   p=subprocess.run([sys.executable,str(ROOT/'launch.py'),'--diagnose','--data-dir',d],capture_output=True,text=True,timeout=30)
   self.assertEqual(p.returncode,0,p.stdout+p.stderr);r=json.loads(p.stdout);self.assertTrue(r['all_required_files_present']);self.assertTrue(Path(r['log']).is_file())
 def test_real_launcher_starts_and_stops_healthy_app_on_fallback_port(self):
  with socket.socket() as occupied,tempfile.TemporaryDirectory() as d:
   occupied.bind(('127.0.0.1',0));occupied.listen();port=occupied.getsockname()[1]
   if port>65510:self.skipTest('Ephemeral port near range boundary')
   p=subprocess.run([sys.executable,str(ROOT/'launch.py'),'--smoke-test','--no-install','--port',str(port),'--data-dir',d],capture_output=True,text=True,timeout=40)
   self.assertEqual(p.returncode,0,p.stdout+p.stderr);self.assertIn('APP IS READY:',p.stdout);self.assertIn(f'{EXPECTED_DOCUMENTS} documents | 41 scenarios',p.stdout);self.assertIn('is occupied. Using',p.stdout);self.assertIn('Startup check passed',p.stdout);self.assertFalse((Path(d)/'ready.json').exists())
   log=(Path(d)/'startup.log').read_text(encoding='utf-8');self.assertIn('Mycosoft ITDX26 Algorithm Lab',log);self.assertNotIn('Traceback',log)
 def test_legacy_linux_launcher_forwards_arguments(self):
  with tempfile.TemporaryDirectory() as d:
   p=subprocess.run(['bash',str(ROOT/'start_linux.sh'),'--smoke-test','--no-install','--data-dir',d],capture_output=True,text=True,timeout=40)
   self.assertEqual(p.returncode,0,p.stdout+p.stderr);self.assertIn('Startup check passed',p.stdout)
if __name__=='__main__':unittest.main(verbosity=2)
