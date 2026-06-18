import sys

file_path = "public/survey/dashboard/index.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Insert HTML structural blocks
html_insert = """
      <!-- NEW ROW: Demographics & AI Experience -->
      <div class="grid-2col" style="margin-bottom: 32px;">
        <section class="card-panel">
          <h2 class="card-title">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--primary)" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            <span>受访者群体就读阶段</span>
          </h2>
          <div class="chart-container">
            <canvas id="demographicsChart"></canvas>
          </div>
        </section>

        <section class="card-panel">
          <h2 class="card-title">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--primary)" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            <span>AI 产品使用经验分布</span>
          </h2>
          <div class="chart-container">
            <canvas id="aiExperienceChart"></canvas>
          </div>
        </section>
      </div>

      <!-- NEW ROW: Persona & WTP -->
      <div class="grid-2col" style="margin-bottom: 32px;">
        <section class="card-panel">
          <h2 class="card-title">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--primary)" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            <span>期待的 AI 人设 (最多选2项)</span>
          </h2>
          <div class="chart-container">
            <canvas id="personaChart"></canvas>
          </div>
        </section>

        <section class="card-panel">
          <h2 class="card-title">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--primary)" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>专业心理 AI 付费意愿分布</span>
          </h2>
          <div class="chart-container">
            <canvas id="wtpChart"></canvas>
          </div>
        </section>
      </div>

      <!-- Row 2: Emoji & Onboarding -->"""

content = content.replace("<!-- Row 2: Emoji & Onboarding -->", html_insert)

# 2. Insert JS logic blocks
js_insert = """
      // 6. Demographics
      const ctxDemo = document.getElementById('demographicsChart').getContext('2d');
      const demoLabelsMap = {
        'middle_school': '初中生',
        'high_school': '高中生',
        'college': '大学生及以上',
        'other': '其他/已工作'
      };
      window.demographicsChartInstance = new Chart(ctxDemo, {
        type: 'doughnut',
        data: {
          labels: Object.keys(demoVotes).map(k => demoLabelsMap[k] || k),
          datasets: [{
            data: Object.values(demoVotes),
            backgroundColor: ['#60a5fa', '#34d399', '#f472b6', '#a78bfa'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#e4e4e7' } } } }
      });

      // 7. AI Experience
      const ctxAiExp = document.getElementById('aiExperienceChart').getContext('2d');
      const expLabelsMap = {
        'never': '从未用过',
        'general_ai': '偶尔用大模型',
        'specialized_ai': '用过专属AI',
        'heavy_user': 'AI重度依赖者'
      };
      window.aiExperienceChartInstance = new Chart(ctxAiExp, {
        type: 'bar',
        data: {
          labels: Object.keys(aiExpVotes).map(k => expLabelsMap[k] || k),
          datasets: [{
            label: '选择人数',
            data: Object.values(aiExpVotes),
            backgroundColor: '#fbbf24',
            borderRadius: 6
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a1a1aa' } }, x: { grid: { display: false }, ticks: { color: '#a1a1aa' } } } }
      });

      // 8. Persona
      const ctxPersona = document.getElementById('personaChart').getContext('2d');
      const personaLabelsMap = {
        'listener': '温柔树洞',
        'analyst': '客观分析师',
        'mentor': '严厉导师',
        'professional': '心理医生',
        'joker': '幽默乐子人'
      };
      window.personaChartInstance = new Chart(ctxPersona, {
        type: 'radar',
        data: {
          labels: Object.keys(personaVotes).map(k => personaLabelsMap[k] || k),
          datasets: [{
            label: '得票数',
            data: Object.values(personaVotes),
            backgroundColor: 'rgba(167, 139, 250, 0.4)',
            borderColor: '#a78bfa',
            pointBackgroundColor: '#a78bfa'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, angleLines: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#e4e4e7', font: { size: 13 } } } } }
      });

      // 9. Willingness To Pay
      const ctxWtp = document.getElementById('wtpChart').getContext('2d');
      const wtpLabelsMap = {
        'free': '白嫖免费',
        'coffee': '一杯奶茶(10-20元)',
        'fastfood': '一顿快餐(20-50元)',
        'premium': '高客单价(>50元)'
      };
      window.wtpChartInstance = new Chart(ctxWtp, {
        type: 'pie',
        data: {
          labels: Object.keys(wtpVotes).map(k => wtpLabelsMap[k] || k),
          datasets: [{
            data: Object.values(wtpVotes),
            backgroundColor: ['#9ca3af', '#60a5fa', '#f59e0b', '#ef4444'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#e4e4e7' } } } }
      });

      // ── Traffic & Region Analysis ──"""

content = content.replace("// ── Traffic & Region Analysis ──", js_insert)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected the 4 missing charts successfully.")
