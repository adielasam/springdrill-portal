const fs = require('fs');

let html = fs.readFileSync('public/admin_dashboard.html', 'utf8');

const newCSS = `
        /* COLORED STAT BLOCKS */
        .stat-block {
            padding: 24px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            border-radius: 4px;
            color: #ffffff;
            cursor: pointer;
            transition: transform 0.2s, opacity 0.2s;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .stat-block:hover { transform: translateY(-2px); opacity: 0.95; }
        .stat-val { font-size: 38px; font-weight: 700; line-height: 1; margin-bottom: 8px; }
        .stat-text { font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; text-align: center; }
        
        .bg-blue { background: #3b82f6; }
        .bg-teal { background: #14b8a6; }
        .bg-yellow { background: #facc15; color: #1f2937 !important; }
        .bg-coral { background: #f43f5e; }
        .bg-purple { background: #a855f7; }
        .bg-green { background: #10b981; }
        
        .bg-yellow .stat-text { opacity: 0.8; color: #1f2937; }
`;

if (!html.includes('.stat-block {')) {
    html = html.replace('/* STAT CARDS */', newCSS + '\n        /* STAT CARDS */');
}

const oldCardsRegex = /<!-- STAT CARDS -->[\s\S]*?<!-- QUICK ACTIONS -->/;

const newCardsHTML = `<!-- STAT CARDS -->
          <div class="row g-3 mb-5 justify-content-center">
              <div class="col-6 col-md-4 col-xl">
                  <div class="stat-block bg-blue" onclick="window.location.href='class_list.html'" title="View all students">
                      <div class="stat-val" id="statActiveStudents">0</div>
                      <div class="stat-text">Active Students</div>
                  </div>
              </div>
              <div class="col-6 col-md-4 col-xl">
                  <div class="stat-block bg-teal" onclick="window.location.href='class_list.html'">
                      <div class="stat-val" id="statMale">0</div>
                      <div class="stat-text">Male Students</div>
                  </div>
              </div>
              <div class="col-6 col-md-4 col-xl">
                  <div class="stat-block bg-yellow" onclick="window.location.href='class_list.html'">
                      <div class="stat-val" id="statFemale">0</div>
                      <div class="stat-text">Female Students</div>
                  </div>
              </div>
              <div class="col-6 col-md-6 col-xl">
                  <div class="stat-block bg-coral" onclick="window.location.href='class_list.html'">
                      <div class="stat-val" id="statClasses">0</div>
                      <div class="stat-text">Classes</div>
                  </div>
              </div>
              <div class="col-6 col-md-6 col-xl">
                  <div class="stat-block bg-purple" onclick="window.location.href='teacher_list'">
                      <div class="stat-val" id="statTeachers">0</div>
                      <div class="stat-text">Teachers</div>
                  </div>
              </div>
          </div>
  
          <!-- QUICK ACTIONS -->`;

html = html.replace(oldCardsRegex, newCardsHTML);

// Chart Colors
const chartJSColorsOld = `const bgColors = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#0d9488', '#14b8a6', '#2dd4bf'];`;
const chartJSColorsOldAlt = `const bgColors = ['#2563eb', '#0d9488', '#f43f5e', '#7c3aed', '#059669', '#f59e0b', '#3b82f6', '#14b8a6', '#e11d48', '#8b5cf6', '#10b981', '#d97706'];`;
const chartJSColorsNew = `const bgColors = ['#3b82f6', '#14b8a6', '#facc15', '#f43f5e', '#a855f7', '#10b981', '#3b82f6', '#14b8a6', '#facc15', '#f43f5e', '#a855f7', '#10b981'];`;

if(html.includes(chartJSColorsOld)) html = html.replace(chartJSColorsOld, chartJSColorsNew);
if(html.includes(chartJSColorsOldAlt)) html = html.replace(chartJSColorsOldAlt, chartJSColorsNew);

// Fix Classes count bug if not fixed already
const brokenClassCount = `document.getElementById('statClasses').innerText = classCount || 0;`;
if (html.includes(brokenClassCount)) {
    html = html.replace(brokenClassCount, `// statClasses is now set by renderClassChart()`);
}

fs.writeFileSync('public/admin_dashboard.html', html);
console.log('Force applied solid blocks UI');
