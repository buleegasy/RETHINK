import os

assets = [
    # Self / Person
    {'path': 'web/public/sandplay/self/person_child.svg', 'emoji': '🧍', 'color': '#A7C7E7'},
    {'path': 'web/public/sandplay/self/shadow.svg', 'emoji': '👤', 'color': '#757575'},
    {'path': 'web/public/sandplay/self/guardian.svg', 'emoji': '🛡️', 'color': '#B3E5FC'},
    {'path': 'web/public/sandplay/self/giant.svg', 'emoji': '👑', 'color': '#FFD54F'},
    
    # Emotion / Nature
    {'path': 'web/public/sandplay/emotion/dark_cloud.svg', 'emoji': '☁️', 'color': '#90A4AE'},
    {'path': 'web/public/sandplay/emotion/sun.svg', 'emoji': '☀️', 'color': '#FFF59D'},
    {'path': 'web/public/sandplay/emotion/rainbow.svg', 'emoji': '🌈', 'color': '#F8BBD0'},
    {'path': 'web/public/sandplay/emotion/fire.svg', 'emoji': '🔥', 'color': '#FFAB91'},

    # Obstacle / Pressure
    {'path': 'web/public/sandplay/obstacle/wall_brick.svg', 'emoji': '🧱', 'color': '#D7CCC8'},
    {'path': 'web/public/sandplay/obstacle/chain.svg', 'emoji': '⛓️', 'color': '#B0BEC5'},
    {'path': 'web/public/sandplay/obstacle/abyss.svg', 'emoji': '🕳️', 'color': '#212121'},
    {'path': 'web/public/sandplay/obstacle/giant_wave.svg', 'emoji': '🌊', 'color': '#81D4FA'},

    # Resource / Hope
    {'path': 'web/public/sandplay/resource/key.svg', 'emoji': '🔑', 'color': '#FFE082'},
    {'path': 'web/public/sandplay/resource/bridge.svg', 'emoji': '🌉', 'color': '#BCAAA4'},
    {'path': 'web/public/sandplay/resource/cabin.svg', 'emoji': '🏠', 'color': '#A5D6A7'},
    {'path': 'web/public/sandplay/resource/flower.svg', 'emoji': '🌸', 'color': '#F48FB1'},
]

svg_template = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80">
  <defs>
    <filter id="neumorphism" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="4" dy="4" stdDeviation="4" flood-opacity="0.2" />
      <feDropShadow dx="-2" dy="-2" stdDeviation="4" flood-color="#ffffff" flood-opacity="0.6" />
    </filter>
  </defs>
  <rect x="10" y="10" width="80" height="80" rx="40" fill="{color}" filter="url(#neumorphism)" />
  <text x="50" y="60" font-size="40" text-anchor="middle" dominant-baseline="central">{emoji}</text>
</svg>"""

base_dir = '/Users/chenhaoran/工程文件/心理大赛'

for asset in assets:
    full_path = os.path.join(base_dir, asset['path'])
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(svg_template.format(color=asset['color'], emoji=asset['emoji']))

print("Generated 16 SVGs.")
