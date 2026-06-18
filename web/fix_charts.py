import re

with open('public/survey/dashboard/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the JS for the missing charts
content = re.sub(
    r"// --- NEW CHARTS ---.*?// Willingness to Pay Chart \(Doughnut\).*?\}\);",
    "",
    content,
    flags=re.DOTALL
)

with open('public/survey/dashboard/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed missing charts JS")
