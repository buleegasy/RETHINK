import re

with open('web/public/survey/dashboard/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

aggregation_code = """
      // New Aggregations
      const demoVotes = { middle_school: 0, high_school: 0, college: 0, other: 0 };
      const aiExpVotes = { never: 0, general_ai: 0, specialized_ai: 0, heavy_user: 0 };
      const personaVotes = { listener: 0, analyst: 0, mentor: 0, professional: 0, joker: 0 };
      const wtpVotes = { free: 0, coffee: 0, fastfood: 0, premium: 0 };

      results.forEach(row => {
        const demo = row.data?.answers?.demographics;
        if (demo && demoVotes[demo] !== undefined) demoVotes[demo]++;

        const exp = row.data?.answers?.aiExperience;
        if (exp && aiExpVotes[exp] !== undefined) aiExpVotes[exp]++;

        const personas = row.data?.answers?.preferredPersona || [];
        personas.forEach(p => {
          if (personaVotes[p] !== undefined) personaVotes[p]++;
        });

        const wtp = row.data?.answers?.willingnessToPay;
        if (wtp && wtpVotes[wtp] !== undefined) wtpVotes[wtp]++;
      });
"""

content = content.replace('      // 5. Aggregate Pain Points', aggregation_code + '\n      // 5. Aggregate Pain Points')

destroy_code = """
      if (window.demographicsChartInstance) window.demographicsChartInstance.destroy();
      if (window.aiExperienceChartInstance) window.aiExperienceChartInstance.destroy();
      if (window.personaChartInstance) window.personaChartInstance.destroy();
      if (window.wtpChartInstance) window.wtpChartInstance.destroy();
"""

content = content.replace('      if (window.painPointsChartInstance) window.painPointsChartInstance.destroy();', '      if (window.painPointsChartInstance) window.painPointsChartInstance.destroy();\n' + destroy_code)

render_charts_code = """
      // --- NEW CHARTS ---

      // Demographics Chart (Doughnut)
      const ctxDemo = document.getElementById('demographicsChart').getContext('2d');
      window.demographicsChartInstance = new Chart(ctxDemo, {
        type: 'doughnut',
        data: {
          labels: ['初中生', '高中生', '大学生及以上', '其他'],
          datasets: [{
            data: [demoVotes.middle_school, demoVotes.high_school, demoVotes.college, demoVotes.other],
            backgroundColor: ['#6366f1', '#06b6d4', '#10b981', '#8b5cf6'],
            borderColor: 'rgba(9, 9, 11, 0.9)', borderWidth: 2
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10, color: '#f4f4f5' } } } }
      });

      // AI Experience Chart (Bar)
      const ctxAiExp = document.getElementById('aiExperienceChart').getContext('2d');
      window.aiExperienceChartInstance = new Chart(ctxAiExp, {
        type: 'bar',
        data: {
          labels: ['从未使用', '通用大模型', '专门AI', '重度用户'],
          datasets: [{
            label: '人数',
            data: [aiExpVotes.never, aiExpVotes.general_ai, aiExpVotes.specialized_ai, aiExpVotes.heavy_user],
            backgroundColor: 'rgba(16, 185, 129, 0.7)',
            borderColor: '#10b981', borderWidth: 1.5, borderRadius: 6
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      });

      // Persona Chart (Bar)
      const ctxPersona = document.getElementById('personaChart').getContext('2d');
      window.personaChartInstance = new Chart(ctxPersona, {
        type: 'bar',
        data: {
          labels: ['温柔树洞', '理性分析师', '严厉导师', '专业医生', '幽默乐子人'],
          datasets: [{
            label: '票数',
            data: [personaVotes.listener, personaVotes.analyst, personaVotes.mentor, personaVotes.professional, personaVotes.joker],
            backgroundColor: 'rgba(6, 182, 212, 0.7)',
            borderColor: '#06b6d4', borderWidth: 1.5, borderRadius: 6
          }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      });

      // Willingness to Pay Chart (Doughnut)
      const ctxWtp = document.getElementById('wtpChart').getContext('2d');
      window.wtpChartInstance = new Chart(ctxWtp, {
        type: 'doughnut',
        data: {
          labels: ['免费白嫖', '一杯奶茶 (10-20元)', '一顿快餐 (20-50元)', '愿意高价 (>50元)'],
          datasets: [{
            data: [wtpVotes.free, wtpVotes.coffee, wtpVotes.fastfood, wtpVotes.premium],
            backgroundColor: ['#94a3b8', '#f59e0b', '#f97316', '#ef4444'],
            borderColor: 'rgba(9, 9, 11, 0.9)', borderWidth: 2
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, color: '#f4f4f5' } } } }
      });
"""

content = content.replace('      // 6. Suggestions Feed', render_charts_code + '\n      // 6. Suggestions Feed')

with open('web/public/survey/dashboard/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated JS in dashboard.")
