import re

with open('web/public/survey/dashboard/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add new HTML blocks for the 4 charts
new_charts_html = """
      <!-- NEW ROW: Demographics & AI Experience -->
      <div class="grid-2col">
        <!-- Demographics Chart -->
        <section class="card-panel">
          <h2 class="card-title">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--primary)" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            就读阶段人群分布
          </h2>
          <div class="chart-container">
            <canvas id="demographicsChart"></canvas>
          </div>
        </section>

        <!-- AI Experience Chart -->
        <section class="card-panel">
          <h2 class="card-title">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--accent-emerald)" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            AI 心理沟通经验分布
          </h2>
          <div class="chart-container">
            <canvas id="aiExperienceChart"></canvas>
          </div>
        </section>
      </div>

      <!-- NEW ROW: Persona & Monetization -->
      <div class="grid-2col">
        <!-- Persona Chart -->
        <section class="card-panel">
          <h2 class="card-title">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--accent-blue)" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            期待的 AI 人设偏好
          </h2>
          <div class="chart-container">
            <canvas id="personaChart"></canvas>
          </div>
        </section>

        <!-- Willingness to Pay Chart -->
        <section class="card-panel">
          <h2 class="card-title">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            付费意愿调研
          </h2>
          <div class="chart-container">
            <canvas id="wtpChart"></canvas>
          </div>
        </section>
      </div>
"""

# Insert the new grid-2col blocks after the first grid-2col (which contains emoji and onboarding)
content = re.sub(r'(<div class="grid-2col">\s*<section class="card-panel">.*?<!-- 开场偏好 -->.*?</section>\s*</div>)', r'\1\n' + new_charts_html, content, flags=re.DOTALL)

with open('web/public/survey/dashboard/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added HTML blocks to dashboard.")
