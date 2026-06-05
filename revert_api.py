import re

with open('web/public/survey/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"const apiUrl = isLocalhost \? 'http://localhost:8787/api/survey/submit' : '/api/survey/submit';",
    "const apiUrl = isLocalhost ? 'http://localhost:8787/api/survey/submit' : 'https://api-proxy-9mv.pages.dev/api/survey/submit';",
    content
)

with open('web/public/survey/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

with open('web/public/survey/dashboard/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"const apiUrl = isLocalhost \? 'http://localhost:8787/api/survey/results' : '/api/survey/results';",
    "const apiUrl = isLocalhost ? 'http://localhost:8787/api/survey/results' : 'https://api-proxy-9mv.pages.dev/api/survey/results';",
    content
)

with open('web/public/survey/dashboard/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Reverted API URLs")
