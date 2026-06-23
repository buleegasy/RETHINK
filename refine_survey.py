import re

with open('web/public/survey/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add puppy_love to scenarios
puppy_love_html = """          <div class="option-pill checkbox" data-value="puppy_love" data-field="scenarios">
            <div class="pill-indicator"></div>
            <div class="pill-label">💔 恋爱困扰 / 失恋、暗恋等感情问题，觉得跟熟人说很尴尬</div>
          </div>"""

# Find the end of scenarios options grid and insert puppy_love
content = re.sub(
    r'(<div class="option-pill checkbox" data-value="highly_private" data-field="scenarios">.*?</div>\s*)(</div>\s*</section>)',
    r'\1' + puppy_love_html + r'\n        \2',
    content,
    flags=re.DOTALL
)

# 2. Add Privacy Slide after Pain Points
privacy_slide_html = """
      <!-- SLIDE 6: Privacy Preference -->
      <section class="slide" id="slide-6" data-min-selections="1">
        <h2 class="slide-title">6. 针对 AI 的“记忆能力”，你更倾向于哪种隐私边界？</h2>
        <p class="slide-desc">单选。</p>
        <div class="options-grid">
          <div class="option-pill radio" data-value="full_memory" data-field="privacyPreference">
            <div class="pill-indicator"></div>
            <div class="pill-label">🧠 希望它像老朋友一样记住我所有的过往和喜好</div>
          </div>
          <div class="option-pill radio" data-value="user_controlled" data-field="privacyPreference">
            <div class="pill-indicator"></div>
            <div class="pill-label">🧹 希望提供“一键清空记忆”按钮，把控权在我自己</div>
          </div>
          <div class="option-pill radio" data-value="burn_after_reading" data-field="privacyPreference">
            <div class="pill-indicator"></div>
            <div class="pill-label">🔥 绝对的“阅后即焚”，关掉界面后不要留下任何痕迹</div>
          </div>
          <div class="option-pill radio" data-value="neutral" data-field="privacyPreference">
            <div class="pill-indicator"></div>
            <div class="pill-label">🤷 无所谓，只要它当前聊得懂我就行</div>
          </div>
        </div>
      </section>
"""

# Insert privacy slide after Slide 5 (Pain Points)
content = content.replace('<!-- SLIDE 6: Preferred AI Persona -->', privacy_slide_html + '\n      <!-- SLIDE 7: Preferred AI Persona -->')

# Update Slide 6 -> 7
content = re.sub(r'<section class="slide" id="slide-6" data-min-selections="1" data-max-selections="2">', r'<section class="slide" id="slide-7" data-min-selections="1" data-max-selections="2">', content)
content = content.replace('6. 当你遇到困惑时，你更希望 AI 扮演什么样的角色？', '7. 当你遇到困惑时，你更希望 AI 扮演什么样的角色？')

# Slide 7 -> 8 (WTP)
content = content.replace('<!-- SLIDE 7: Willingness to Pay -->', '<!-- SLIDE 8: Willingness to Pay -->')
content = re.sub(r'<section class="slide" id="slide-7" data-min-selections="1">', r'<section class="slide" id="slide-8" data-min-selections="1">', content)
content = content.replace('7. 如果有一款能真正懂你、并提供深度专业心理疏导的 AI 产品，你的付费意愿是？', '8. 如果有一款能真正懂你、并提供深度专业心理疏导的 AI 产品，你的付费意愿是？')

# Slide 8 -> 9 (Onboarding)
content = content.replace('<!-- SLIDE 8: Onboarding Interface Preference -->', '<!-- SLIDE 9: Onboarding Interface Preference -->')
content = re.sub(r'<section class="slide" id="slide-8"', r'<section class="slide" id="slide-9"', content)
content = content.replace('8. 以下三种心理 AI 开场界面，哪种更容易让你卸下心理防线？', '9. 以下三种心理 AI 开场界面，哪种更容易让你卸下心理防线？')

# Slide 9 -> 10 (Open suggestion)
content = content.replace('<!-- SLIDE 9: Open suggestion -->', '<!-- SLIDE 10: Open suggestion -->')
content = re.sub(r'<section class="slide" id="slide-9"', r'<section class="slide" id="slide-10"', content)
content = content.replace('9. 你对未来的 AI 心理辅导有任何建议、期待或吐槽吗？', '10. 你对未来的 AI 心理辅导有任何建议、期待或吐槽吗？')

# Slide 10 -> 11 (Success)
content = content.replace('<!-- SLIDE 10: Success Page -->', '<!-- SLIDE 11: Success Page -->')
content = re.sub(r'<section class="slide" id="slide-10"', r'<section class="slide" id="slide-11"', content)

# Update totalSlides to 12
content = re.sub(r'totalSlides: 11,', 'totalSlides: 12,', content)

# Update js answers state
content = re.sub(
    r'onboardingPreference: \'\',',
    r"privacyPreference: '',\n        onboardingPreference: '',",
    content
)

# Update validateSlideState logic to account for shifting
old_validation_logic = """      if (state.currentSlideIndex === 1) {
        currentSelectionCount = state.answers.demographics ? 1 : 0;
      } else if (state.currentSlideIndex === 2) {
        currentSelectionCount = state.answers.aiExperience ? 1 : 0;
      } else if (state.currentSlideIndex === 3) {
        currentSelectionCount = state.answers.emojis.length;
      } else if (state.currentSlideIndex === 4) {
        currentSelectionCount = state.answers.scenarios.length;
      } else if (state.currentSlideIndex === 5) {
        currentSelectionCount = state.answers.painPoints.length;
      } else if (state.currentSlideIndex === 6) {
        currentSelectionCount = state.answers.preferredPersona.length;
      } else if (state.currentSlideIndex === 7) {
        currentSelectionCount = state.answers.willingnessToPay ? 1 : 0;
      } else if (state.currentSlideIndex === 8) {
        currentSelectionCount = state.answers.onboardingPreference ? 1 : 0;
      }"""

new_validation_logic = """      if (state.currentSlideIndex === 1) {
        currentSelectionCount = state.answers.demographics ? 1 : 0;
      } else if (state.currentSlideIndex === 2) {
        currentSelectionCount = state.answers.aiExperience ? 1 : 0;
      } else if (state.currentSlideIndex === 3) {
        currentSelectionCount = state.answers.emojis.length;
      } else if (state.currentSlideIndex === 4) {
        currentSelectionCount = state.answers.scenarios.length;
      } else if (state.currentSlideIndex === 5) {
        currentSelectionCount = state.answers.painPoints.length;
      } else if (state.currentSlideIndex === 6) {
        currentSelectionCount = state.answers.privacyPreference ? 1 : 0;
      } else if (state.currentSlideIndex === 7) {
        currentSelectionCount = state.answers.preferredPersona.length;
      } else if (state.currentSlideIndex === 8) {
        currentSelectionCount = state.answers.willingnessToPay ? 1 : 0;
      } else if (state.currentSlideIndex === 9) {
        currentSelectionCount = state.answers.onboardingPreference ? 1 : 0;
      }"""

content = content.replace(old_validation_logic, new_validation_logic)

with open('web/public/survey/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Survey frontend updated successfully!")
