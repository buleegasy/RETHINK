import re

with open('web/public/survey/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"const apiUrl = isLocalhost\s*\?\s*'http://localhost:8787/api/survey/submit'\s*:\s*'.*?';",
    "const apiUrl = isLocalhost ? 'http://localhost:8787/api/survey/submit' : '/api/survey/submit';",
    content
)

with open('web/public/survey/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

with open('web/public/survey/dashboard/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"const apiUrl = isLocalhost\s*\?\s*'http://localhost:8787/api/survey/results'\s*:\s*'.*?';",
    "const apiUrl = isLocalhost ? 'http://localhost:8787/api/survey/results' : '/api/survey/results';",
    content
)

with open('web/public/survey/dashboard/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated API URLs to relative paths!")
