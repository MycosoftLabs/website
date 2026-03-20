const {execSync} = require('child_process'); 
const lines = execSync('gh run list --repo MycosoftLabs/website --limit 200',{encoding:'utf8'}).split('\n'); 
const failed = lines.filter(l => l.includes('failure ') && l.includes('Merge pull request #'));  
let result = '';
failed.forEach(l => { 
  if(l.includes('#51') || l.includes('#49') || l.includes('#48')) {
    const id = l.match(/\b\d{10,}\b/)?.[0]; 
    if(id){ 
      result += '\n--- LOGS FOR RUN ' + id + ' ---\n'; 
      try { 
         result += execSync('gh run view ' + id + ' --log-failed', {maxBuffer: 1024*1024*10, encoding:'utf8'}).substring(0, 3000); 
      } catch(e){
         result += 'Error fetching logs.\n';
      } 
    } 
  }
});
require('fs').writeFileSync('pr_logs.txt', result);
