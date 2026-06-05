import re

with open('web/public/survey/dashboard/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add timestamp cache buster
content = re.sub(
    r"const response = await fetch\(apiUrl\);",
    r"const response = await fetch(apiUrl + (apiUrl.includes('?') ? '&' : '?') + 't=' + new Date().getTime());",
    content
)

with open('web/public/survey/dashboard/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

with open('web/public/survey/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Submit doesn't need cache buster as it's POST, but let's just make sure
content = re.sub(
    r"const res = await fetch\(apiUrl, \{",
    r"const res = await fetch(apiUrl + '?t=' + new Date().getTime(), {",
    content
)

with open('web/public/survey/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added cache buster to fetch URLs")
