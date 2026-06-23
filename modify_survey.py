import re

with open('web/public/survey/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_slides_1_2 = """
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
            <div class="pill-label">🤖 用过通用大模型 (如豆包, Kimi, ChatGPT 等)</div>
          </div>
          <div class="option-pill radio" data-value="specialized_ai" data-field="aiExperience">
            <div class="pill-indicator"></div>
            <div class="pill-label">📱 用过专门的心理/陪伴类 AI (如星野, Pi 等)</div>
          </div>
          <div class="option-pill radio" data-value="heavy_user" data-field="aiExperience">
            <div class="pill-indicator"></div>
            <div class="pill-label">💬 我是重度用户，经常找 AI 倾诉</div>
          </div>
        </div>
      </section>
"""

new_slides_6_7 = """
      <!-- SLIDE 6: Preferred AI Persona -->
      <section class="slide" id="slide-6" data-min-selections="1" data-max-selections="2">
        <h2 class="slide-title">6. 当你遇到困惑时，你更希望 AI 扮演什么样的角色？</h2>
        <p class="slide-desc">最多选 2 项。</p>
        <div class="options-grid">
          <div class="option-pill checkbox" data-value="listener" data-field="preferredPersona">
            <div class="pill-indicator"></div>
            <div class="pill-label">🫂 温柔倾听的“树洞” (无条件共情，给我安慰)</div>
          </div>
          <div class="option-pill checkbox" data-value="analyst" data-field="preferredPersona">
            <div class="pill-indicator"></div>
            <div class="pill-label">🧠 理性客观的“分析师” (帮我梳理逻辑，分析利弊)</div>
          </div>
          <div class="option-pill checkbox" data-value="mentor" data-field="preferredPersona">
            <div class="pill-indicator"></div>
            <div class="pill-label">🧙‍♂️ 经验丰富的“严厉导师” (一针见血，甚至骂醒我)</div>
          </div>
          <div class="option-pill checkbox" data-value="professional" data-field="preferredPersona">
            <div class="pill-indicator"></div>
            <div class="pill-label">🏥 专业的“心理医生” (使用专业的心理疏导方法)</div>
          </div>
          <div class="option-pill checkbox" data-value="joker" data-field="preferredPersona">
            <div class="pill-indicator"></div>
            <div class="pill-label">🤡 幽默风趣的“乐子人” (用玩笑化解我的焦虑)</div>
          </div>
        </div>
      </section>

      <!-- SLIDE 7: Willingness to Pay -->
      <section class="slide" id="slide-7" data-min-selections="1">
        <h2 class="slide-title">7. 如果有一款能真正懂你、并提供深度专业心理疏导的 AI 产品，你的付费意愿是？</h2>
        <p class="slide-desc">单选。</p>
        <div class="options-grid">
          <div class="option-pill radio" data-value="free" data-field="willingnessToPay">
            <div class="pill-indicator"></div>
            <div class="pill-label">🆓 只接受免费使用</div>
          </div>
          <div class="option-pill radio" data-value="coffee" data-field="willingnessToPay">
            <div class="pill-indicator"></div>
            <div class="pill-label">☕️ 愿意支付一杯奶茶钱 (约 10-20元/月)</div>
          </div>
          <div class="option-pill radio" data-value="fastfood" data-field="willingnessToPay">
            <div class="pill-indicator"></div>
            <div class="pill-label">🍔 愿意支付一顿快餐钱 (约 20-50元/月)</div>
          </div>
          <div class="option-pill radio" data-value="premium" data-field="willingnessToPay">
            <div class="pill-indicator"></div>
            <div class="pill-label">💎 愿意支付更高价格，只要真的有帮助 (> 50元/月)</div>
          </div>
        </div>
      </section>
"""

# Insert slides 1 & 2
content = content.replace('<!-- SLIDE 1: Emoji Voting -->', new_slides_1_2 + '\n      <!-- SLIDE 3: Emoji Voting -->')
content = re.sub(r'<section class="slide" id="slide-1" data-min-selections="1" data-max-selections="3">', r'<section class="slide" id="slide-3" data-min-selections="1" data-max-selections="3">', content)
content = content.replace('1. 哪个表情包最能代表你当下的负面/低谷情绪？', '3. 哪个表情包最能代表你当下的负面/低谷情绪？')

# Slide 4: Scenarios (was Slide 2)
content = content.replace('<!-- SLIDE 2: Counseling Scenarios -->', '<!-- SLIDE 4: Counseling Scenarios -->')
content = re.sub(r'<section class="slide" id="slide-2"', r'<section class="slide" id="slide-4"', content)
content = content.replace('2. 什么场景下，你更倾向于求助 AI 心理伙伴，而非家长/老师？', '4. 什么场景下，你更倾向于求助 AI 心理伙伴，而非家长/老师？')

# Slide 5: Pain points (was Slide 3)
content = content.replace('<!-- SLIDE 3: Counseling Pain Points -->', '<!-- SLIDE 5: Counseling Pain Points -->')
content = re.sub(r'<section class="slide" id="slide-3"', r'<section class="slide" id="slide-5"', content)
content = content.replace('3. 你觉得目前 AI 心理对话最让人反感的“痛点”是什么？', '5. 你觉得目前 AI 心理对话最让人反感的“痛点”是什么？')

# Insert slides 6 & 7 before Onboarding
content = content.replace('<!-- SLIDE 4: Onboarding Interface Preference -->', new_slides_6_7 + '\n      <!-- SLIDE 8: Onboarding Interface Preference -->')

# Slide 8: Onboarding (was Slide 4)
content = re.sub(r'<section class="slide" id="slide-4"', r'<section class="slide" id="slide-8"', content)
content = content.replace('4. 以下三种心理 AI 开场界面，哪种更容易让你卸下心理防线？', '8. 以下三种心理 AI 开场界面，哪种更容易让你卸下心理防线？')

# Slide 9: Open suggestion (was Slide 5)
content = content.replace('<!-- SLIDE 5: Open suggestion -->', '<!-- SLIDE 9: Open suggestion -->')
content = re.sub(r'<section class="slide" id="slide-5"', r'<section class="slide" id="slide-9"', content)
content = content.replace('5. 你对未来的 AI 心理辅导有任何建议、期待或吐槽吗？', '9. 你对未来的 AI 心理辅导有任何建议、期待或吐槽吗？')

# Slide 10: Success (was Slide 6)
content = content.replace('<!-- SLIDE 6: Success Page -->', '<!-- SLIDE 10: Success Page -->')
content = re.sub(r'<section class="slide" id="slide-6"', r'<section class="slide" id="slide-10"', content)

# Modify total slides in JS
content = re.sub(r'totalSlides: \d+,', 'totalSlides: 11,', content)

# Modify JS answers initial state
js_answers = """      answers: {
        demographics: '',
        aiExperience: '',
        emojis: [],
        scenarios: [],
        painPoints: [],
        preferredPersona: [],
        willingnessToPay: '',
        onboardingPreference: '',
        openFeedback: ''
      }"""
content = re.sub(r'answers: \{\s*emojis: \[\],\s*scenarios: \[\],\s*painPoints: \[\],\s*onboardingPreference: \'\',\s*openFeedback: \'\'\s*\}', js_answers, content)

# Need to update `handleOptionSelect` and `validateSlideState`.
# We'll just replace the entire handleOptionSelect block with a robust dynamic version.
new_handle_option = """
    // Handle option pills (Checkboxes & Radio buttons) dynamically
    function handleOptionSelect(pill) {
      const isCheckbox = pill.classList.contains('checkbox');
      const val = pill.dataset.value;
      const currentSlide = slides[state.currentSlideIndex];
      
      // Determine which field this option belongs to based on the current slide or data-field
      let field = pill.dataset.field;
      if (!field) {
        // Fallback for old mapping
        if (state.currentSlideIndex === 4) field = 'scenarios';
        else if (state.currentSlideIndex === 5) field = 'painPoints';
        else if (state.currentSlideIndex === 8) field = 'onboardingPreference';
      }
      
      if (!field) return;

      if (isCheckbox) {
        // Multi-select Checkbox
        const isSelected = pill.classList.contains('selected');
        const maxSelections = parseInt(currentSlide.dataset.maxSelections, 10) || 999;
        
        if (isSelected) {
          pill.classList.remove('selected');
          state.answers[field] = state.answers[field].filter(item => item !== val);
        } else {
          if (state.answers[field].length >= maxSelections) {
             const firstSelectedVal = state.answers[field].shift();
             const firstSelectedCard = currentSlide.querySelector(`.option-pill[data-value="${firstSelectedVal}"]`);
             if (firstSelectedCard) firstSelectedCard.classList.remove('selected');
          }
          pill.classList.add('selected');
          state.answers[field].push(val);
        }
      } else {
        // Single-select Radio
        const siblingPills = pill.parentNode.querySelectorAll('.option-pill');
        siblingPills.forEach(sib => sib.classList.remove('selected'));
        pill.classList.add('selected');
        state.answers[field] = val;
      }
      
      validateSlideState();
    }

    // Check if the current slide is valid to proceed
    function validateSlideState() {
      const currentSlide = slides[state.currentSlideIndex];
      const minSelections = parseInt(currentSlide.dataset.minSelections, 10) || 0;
      
      if (minSelections === 0) {
        nextBtn.disabled = false;
        return true;
      }
      
      let currentSelectionCount = 0;
      if (state.currentSlideIndex === 1) {
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
      }
      
      const isValid = currentSelectionCount >= minSelections;
      nextBtn.disabled = !isValid;
      return isValid;
    }
"""

content = re.sub(r'    // Handle option pills \(\s*Checkboxes & Radio buttons\).*?    // Navigation Controls', new_handle_option + '\n    // Navigation Controls', content, flags=re.DOTALL)

with open('web/public/survey/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating index.html")
