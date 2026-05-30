#!/usr/bin/env bash
set -e

BASE_HREF="/gravity-swipe/"
DIST="dist/gravity-swipe"

echo "==> Building with base-href $BASE_HREF"
npm run build -- --configuration production --base-href "$BASE_HREF"

echo "==> Patching index.html with absolute asset paths"
python3 - << 'EOF'
import re
with open('dist/gravity-swipe/index.html', 'r') as f:
    html = f.read()
base = '/gravity-swipe/'
patterns = [
    (r'href="(styles\.[a-f0-9]+\.css)"', f'href="{base}\\1"'),
    (r'src="(runtime\.[a-f0-9]+\.js)"',  f'src="{base}\\1"'),
    (r'src="(polyfills\.[a-f0-9]+\.js)"',f'src="{base}\\1"'),
    (r'src="(main\.[a-f0-9]+\.js)"',     f'src="{base}\\1"'),
]
for pat, rep in patterns:
    html = re.sub(pat, rep, html)
with open('dist/gravity-swipe/index.html', 'w') as f:
    f.write(html)
print("Patch complete")
EOF

echo "==> Deploying to gh-pages"
D="/tmp/gs-deploy-$(date +%s)"
git clone --branch gh-pages https://github.com/flakorchkdsk1984/gravity-swipe.git "$D" -q
cd "$D"
git rm -rf . -q
cp -r "/home/chkdsk/gravity-swipe/$DIST/." .
git config user.email "flakorchkdsk1984@users.noreply.github.com"
git config user.name "flakorchkdsk1984"
git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')"
git push origin gh-pages -q
echo "==> DEPLOYED OK"
