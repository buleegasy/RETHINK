import re

with open('web/public/survey/dashboard/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update SCENARIO_MAP
content = content.replace(
    "'relationship_dispute': '人际争吵 / 憋闷不想跟熟人说',",
    "'relationship_dispute': '人际争吵 / 憋闷不想跟熟人说',\n      'puppy_love': '恋爱困扰 / 失恋、感情问题',"
)

# 2. Add Privacy Chart HTML
privacy_chart_html = """
      <!-- NEW ROW: Onboarding & Privacy -->
      <div class="grid-2col">
        <!-- Onboarding Chart (moved here from Emoji row if we want, or just leave it and add a new row) -->
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
# Insert privacy chart before Feedbacks
content = content.replace('<!-- Feedbacks List (Full width) -->', privacy_chart_html + '\n      <!-- Feedbacks List (Full width) -->')

# 3. Add Raw Data Table HTML
table_html = """
      <!-- Raw Data Explorer -->
      <section class="card-panel" style="margin-top: 10px;">
        <div class="dashboard-header" style="border:none; padding-bottom:0;">
          <h2 class="card-title">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            原始数据流 & 导出 (Raw Data Explorer)
          </h2>
          <button class="btn btn-primary" id="exportCsvBtn">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            导出 CSV
          </button>
        </div>
        
        <div style="overflow-x: auto; margin-top: 16px; border: 1px solid var(--border); border-radius: var(--radius-md);">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; min-width: 800px;">
            <thead>
              <tr style="background: rgba(255,255,255,0.05); border-bottom: 1px solid var(--border);">
                <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 500;">ID</th>
                <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 500;">提交时间</th>
                <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 500;">阶段</th>
                <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 500;">AI经验</th>
                <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 500;">付费意愿</th>
                <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 500;">开放反馈</th>
              </tr>
            </thead>
            <tbody id="rawDataTableBody">
              <!-- JS Injected -->
            </tbody>
          </table>
        </div>
      </section>
"""
# Append to dashboardContent
content = re.sub(r'(</section>\s*</div>\s*<!-- 隐藏层：空状态/加载中 -->)', table_html + r'\n    \1', content)

# 4. JS: Aggregate privacyPreference
agg_privacy = """
      const privacyVotes = { full_memory: 0, user_controlled: 0, burn_after_reading: 0, neutral: 0 };
"""
content = re.sub(r'const wtpVotes = \{.*?\};', r'\g<0>' + agg_privacy, content)

agg_privacy_loop = """
        const privacy = row.data?.answers?.privacyPreference;
        if (privacy && privacyVotes[privacy] !== undefined) privacyVotes[privacy]++;
"""
content = re.sub(r'const wtp = row.data\?\.answers\?\.willingnessToPay;.*?if \(wtp.*?\+\+;', r'\g<0>' + agg_privacy_loop, content, flags=re.DOTALL)

# 5. JS: Render privacy chart
render_privacy = """
      // Privacy Chart (Pie)
      if (window.privacyChartInstance) window.privacyChartInstance.destroy();
      const ctxPrivacy = document.getElementById('privacyChart').getContext('2d');
      window.privacyChartInstance = new Chart(ctxPrivacy, {
        type: 'pie',
        data: {
          labels: ['记住所有(老朋友)', '自己掌控清空', '绝对阅后即焚', '无所谓能懂就行'],
          datasets: [{
            data: [privacyVotes.full_memory, privacyVotes.user_controlled, privacyVotes.burn_after_reading, privacyVotes.neutral],
            backgroundColor: ['#6366f1', '#06b6d4', '#f43f5e', '#94a3b8'],
            borderColor: 'rgba(9, 9, 11, 0.9)', borderWidth: 2
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10, color: '#f4f4f5' } } } }
      });
"""
content = content.replace('// 6. Suggestions Feed', render_privacy + '\n      // 6. Suggestions Feed')

# 6. JS: Render Data Table
render_table = """
      // 7. Render Data Table
      const tbody = document.getElementById('rawDataTableBody');
      tbody.innerHTML = '';
      results.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        
        const d = row.data?.answers || {};
        const timeStr = row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '-';
        
        // Truncate feedback
        let feedback = (row.openFeedback || '').replace(/\\n/g, ' ');
        if (feedback.length > 20) feedback = feedback.substring(0, 20) + '...';

        tr.innerHTML = `
          <td style="padding: 12px 16px; color: var(--accent-blue); font-family: var(--font-display);">#${row.id.substring(0,8)}</td>
          <td style="padding: 12px 16px;">${timeStr}</td>
          <td style="padding: 12px 16px;">${d.demographics || '-'}</td>
          <td style="padding: 12px 16px;">${d.aiExperience || '-'}</td>
          <td style="padding: 12px 16px;">${d.willingnessToPay || '-'}</td>
          <td style="padding: 12px 16px; color: var(--text-muted);">${escapeHtml(feedback)}</td>
        `;
        tbody.appendChild(tr);
      });
      
      // Store raw results globally for CSV export
      window._rawResults = results;
"""
content = content.replace('// Hide loading, show content', render_table + '\n      // Hide loading, show content')

# 7. JS: CSV Export functionality
csv_export_js = """
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
      const results = window._rawResults;
      if (!results || results.length === 0) return alert('无数据可导出');
      
      let csvContent = "ID,提交时间,问卷版本,就读阶段,AI经验,情绪表情,求助场景,痛点,期待人设,付费意愿,开场偏好,隐私偏好,开放反馈\\n";
      
      results.forEach(row => {
        const d = row.data?.answers || {};
        const id = row.id;
        const time = row.createdAt || '';
        const version = row.data?.surveyVersion || 'v1';
        
        const demo = d.demographics || '';
        const aiexp = d.aiExperience || '';
        const emojis = (d.emojis || []).join('|');
        const scenarios = (d.scenarios || []).join('|');
        const pain = (d.painPoints || []).join('|');
        const persona = (d.preferredPersona || []).join('|');
        const wtp = d.willingnessToPay || '';
        const onboard = d.onboardingPreference || '';
        const privacy = d.privacyPreference || '';
        let feedback = (row.openFeedback || '').replace(/"/g, '""');
        if (feedback) feedback = `"${feedback}"`;
        
        csvContent += `${id},${time},${version},${demo},${aiexp},${emojis},${scenarios},${pain},${persona},${wtp},${onboard},${privacy},${feedback}\\n`;
      });
      
      const blob = new Blob(["\\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `survey_export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
"""
content = content.replace('// Initial Load', csv_export_js + '\n    // Initial Load')

with open('web/public/survey/dashboard/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard successfully updated with puppy_love, privacy chart, and CSV export!")
