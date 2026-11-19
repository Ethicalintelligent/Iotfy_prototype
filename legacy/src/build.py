import json
t=open('template.html').read()
t=t.replace('/*SCHEMA*/',open('schema.json').read().strip()).replace('/*SEED*/',json.dumps(json.load(open('/home/claude/mig/merged11.json')))).replace('/*SHEETID*/','1cLX2qySnD1FBN-fbfQBoZor5T2BdWPZ5QMBN36xe278').replace('/*APP*/',open('app.js').read())
import sys,os
URLS={'platform':'https://claude.ai/artifact/CfVd2sjdpo3KKrpqxADhoP','dealer':'https://claude.ai/artifact/3xQ4nWvsvFb9npZ8wNXmrL','customer':'https://claude.ai/artifact/PZaaepdcvr5s1KiocxUYtm'}
open('index.html','w').write(t)   # 'all' build, used by the tests
for app in ['platform','dealer','customer']:
    os.makedirs(f'/home/claude/apps3/{app}',exist_ok=True)
    open(f'/home/claude/apps3/{app}/index.html','w').write(t.replace('<head>',f"<head><script>window.IOTIFY_APP='{app}';window.IOTIFY_URLS={json.dumps(URLS)}</script>",1))
