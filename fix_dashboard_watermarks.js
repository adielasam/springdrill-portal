const fs = require('fs');

let html = fs.readFileSync('public/admin_dashboard.html', 'utf8');

const newCSS = `
        /* COLORED STAT BLOCKS */
        .stat-block {
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            justify-content: center;
            height: 100px;
            border-radius: 6px;
            color: #ffffff;
            cursor: pointer;
            transition: transform 0.2s, opacity 0.2s;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            position: relative;
            overflow: hidden;
        }
        .stat-block:hover { transform: translateY(-2px); opacity: 0.95; }
        .stat-val { font-size: 28px; font-weight: 700; line-height: 1; margin-bottom: 4px; z-index: 2; position: relative; }
        .stat-text { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0px; opacity: 0.9; text-align: right; z-index: 2; position: relative; }
        
        .stat-bg-icon {
            position: absolute;
            left: -10%;
            bottom: -20%;
            width: 70px;
            height: 70px;
            opacity: 0.25;
            z-index: 1;
        }
        
        .bg-blue { background: #3498db; }
        .bg-teal { background: #2ecc71; }
        .bg-yellow { background: #f1c40f; }
        .bg-coral { background: #1abc9c; } 
        .bg-purple { background: #9b59b6; }
        .bg-cyan { background: #00bcd4; }
        
        .bg-yellow .stat-val, .bg-yellow .stat-text { color: #ffffff; }
`;

html = html.replace(/\/\* COLORED STAT BLOCKS \*\/[\s\S]*?\.bg-yellow \.stat-text \{ opacity: 0\.8; color: #1f2937; \}/, newCSS);


const newCardsHTML = `<!-- STAT CARDS -->
          <div class="row g-3 mb-5 justify-content-center">
              <div class="col-12 col-md-4 col-xl-2">
                  <div class="stat-block bg-blue" onclick="window.location.href='class_list.html'" title="View all students">
                      <i data-lucide="users" class="stat-bg-icon"></i>
                      <div class="stat-val" id="statActiveStudents">0</div>
                      <div class="stat-text">Active Students</div>
                  </div>
              </div>
              <div class="col-12 col-md-4 col-xl-2">
                  <div class="stat-block bg-teal" onclick="window.location.href='class_list.html'">
                      <i data-lucide="user" class="stat-bg-icon"></i>
                      <div class="stat-val" id="statMale">0</div>
                      <div class="stat-text">Male Students</div>
                  </div>
              </div>
              <div class="col-12 col-md-4 col-xl-2">
                  <div class="stat-block bg-yellow" onclick="window.location.href='class_list.html'">
                      <i data-lucide="user" class="stat-bg-icon"></i>
                      <div class="stat-val" id="statFemale">0</div>
                      <div class="stat-text">Female Students</div>
                  </div>
              </div>
              <div class="col-12 col-md-4 col-xl-2">
                  <div class="stat-block bg-coral" onclick="window.location.href='class_list.html'">
                      <i data-lucide="monitor" class="stat-bg-icon"></i>
                      <div class="stat-val" id="statClasses">0</div>
                      <div class="stat-text">Classes</div>
                  </div>
              </div>
              <div class="col-12 col-md-4 col-xl-2">
                  <div class="stat-block bg-purple" onclick="window.location.href='teacher_list'">
                      <i data-lucide="globe" class="stat-bg-icon"></i>
                      <div class="stat-val" id="statTeachers">0</div>
                      <div class="stat-text">Teachers</div>
                  </div>
              </div>
              <div class="col-12 col-md-4 col-xl-2">
                  <div class="stat-block bg-cyan" onclick="window.location.href='class_list.html'">
                      <i data-lucide="calendar" class="stat-bg-icon"></i>
                      <div class="stat-val" id="statAttendance">0</div>
                      <div class="stat-text">Total Attendance</div>
                  </div>
              </div>
          </div>
  
          <!-- QUICK ACTIONS -->`;

const oldCardsRegex = /<!-- STAT CARDS -->[\s\S]*?<!-- QUICK ACTIONS -->/;
html = html.replace(oldCardsRegex, newCardsHTML);

fs.writeFileSync('public/admin_dashboard.html', html);
console.log('Fixed CSS and HTML for watermark icons');
