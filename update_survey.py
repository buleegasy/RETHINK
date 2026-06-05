import re

with open('web/public/survey/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add new slides
new_slides = """
      <!-- SLIDE 1: Demographics -->
      <section class="slide" id="slide-1" data-min-selections="1">
        <h2 class="slide-title">1. 你的就读阶段是？</h2>
        <p class="slide-desc">单选。</p>
        <div class="options-grid">
          <div class="option-pill radio" data-value="middle_school" data-field="demographics">
            <div class="pill-indicator"></div>
            <div class="pill-label">🎒 初中生</div>
          </div>
          <div class="option-pill radio" data-value="high_school" data-field="demographics">
            <div class="pill-indicator"></div>
            <div class="pill-label">🏫 高中生 (含中职等)</div>
          </div>
          <div class="option-pill radio" data-value="college" data-field="demographics">
            <div class="pill-indicator"></div>
            <div class="pill-label">🎓 大学生及以上</div>
          </div>
          <div class="option-pill radio" data-value="other" data-field="demographics">
            <div class="pill-indicator"></div>
            <div class="pill-label">✨ 其他</div>
          </div>
        </div>
      </section>

      <!-- SLIDE 2: AI Experience -->
      <section class="slide" id="slide-2" data-min-selections="1">
        <h2 class="slide-title">2. 你之前尝试过用 AI 聊天来缓解情绪或解决心理困扰吗？</h2>
        <p class="slide-desc">单选。</p>
        <div class="options-grid">
          <div class="option-pill radio" data-value="never" data-field="aiExperience">
            <div class="pill-indicator"></div>
            <div class="pill-label">🤔 从来没有，这是第一次听说</div>
          </div>
          <div class="option-pill radio" data-value="general_ai" data-field="aiExperience">
            <div class="pill-indicator"></div>
            <div class="pill-label">🤖 用过通用大模型 (如 ChatGPT, 豆包, Kimi 等) 聊过</div>
          </div>
          <div class="option-pill radio" data-value="specialized_ai" data-field="aiExperience">
            <div class="pill-indicator"></div>
            <div class="pill-label">📱 用过专门的心理/陪伴类 AI (如 Pi, 星野 等)</div>
          </div>
          <div class="option-pill radio" data-value="heavy_user" data-field="aiExperience">
            <div class="pill-indicator"></div>
            <div class="pill-label">💬 我是重度用户，经常找 AI 倾诉</div>
          </div>
        </div>
      </section>
"""

# Insert new slides 1 and 2 before the Emoji slide
content = content.replace('<!-- SLIDE 1: Emoji Voting -->', new_slides + '\n      <!-- SLIDE 3: Emoji Voting -->')
# Update id="slide-1" to id="slide-3" for Emoji
content = re.sub(r'<section class="slide" id="slide-1" data-min-selections="1" data-max-selections="3">', r'<section class="slide" id="slide-3" data-min-selections="1" data-max-selections="3">', content)
content = content.replace('1. 哪个表情包最能代表你当下的负面/低谷情绪？', '3. 哪个表情包最能代表你当下的负面/低谷情绪？')

# Update Scenarios
content = content.replace('<!-- SLIDE 2: Counseling Scenarios -->', '<!-- SLIDE 4: Counseling Scenarios -->')
content = re.sub(r'<section class="slide" id="slide-2"', r'<section class="slide" id="slide-4"', content)
content = content.replace('2. 什么场景下，你更倾向于求助 AI 心理伙伴，而非家长/老师？', '4. 什么场景下，你更倾向于求助 AI 心理伙伴，而非家长/老师？')
# Add data-field to checkboxes
content = re.sub(r'class="option-pill checkbox" data-value="([^"]+)"', r'class="option-pill checkbox" data-value="\1" data-field="scenarios"', content)

# Update Pain Points
content = content.replace('<!-- SLIDE 3: Counseling Pain Points -->', '<!-- SLIDE 5: Counseling Pain Points -->')
content = re.sub(r'<section class="slide" id="slide-3"', r'<section class="slide" id="slide-5"', content)
content = content.replace('3. 你觉得目前 AI 心理对话最让人反感的“痛点”是什么？', '5. 你觉得目前 AI 心理对话最让人反感的“痛点”是什么？')
content = re.sub(r'class="option-pill checkbox" data-value="([^"]+)"', r'class="option-pill checkbox" data-value="\1" data-field="painPoints"', content) # Won't affect scenarios because they are already replaced? Wait, it WILL affect.
# Actually I'll use regex carefully later.

