import re

with open('public/survey/dashboard/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

privacy_chart_html = """
      <!-- NEW ROW: Onboarding & Privacy -->
      <div class="grid-2col" style="margin-top: 16px;">
        <section class="card-panel">
          <h2 class="card-title">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--primary)" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            隐私边界与记忆机制
          </h2>
          <div class="chart-container">
            <canvas id="privacyChart"></canvas>
          </div>
        </section>
      </div>
"""

# Insert privacy chart before Feedbacks Panel
if 'id="privacyChart"' not in content:
    content = content.replace('<!-- Feedbacks Panel -->', privacy_chart_html + '\n      <!-- Feedbacks Panel -->')
    with open('public/survey/dashboard/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed HTML")
else:
    print("Already fixed")

