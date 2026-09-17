const fs = require('fs');
let html = fs.readFileSync('public/admin_approve_reports.html', 'utf8');

// replace the end of the script tag to add the logic
const scriptLogic = `
        import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
        const supabaseUrl = 'YOUR_SUPABASE_URL_HERE' // This will be injected if there's a config file, but we should use the same logic as other files
        
        let supabase;
        try {
            if (window.env && window.env.NEXT_PUBLIC_SUPABASE_URL) {
                supabase = createClient(window.env.NEXT_PUBLIC_SUPABASE_URL, window.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
            } else {
                console.error("Supabase config not found in window.env");
            }
        } catch(e) {}

        const loadReportsBtn = document.getElementById('loadReportsBtn');
        const filterClass = document.getElementById('filterClass');
        const reportsTableBody = document.getElementById('reportsTableBody');

        async function initFilters() {
            if(!supabase) return;
            const {data} = await supabase.from('classes').select('*').order('name');
            if(data) {
                data.forEach(c => {
                    filterClass.innerHTML += \`<option value="\${c.id}">\${c.name}</option>\`;
                });
            }
        }
        
        if(loadReportsBtn) {
            loadReportsBtn.addEventListener('click', async () => {
                reportsTableBody.innerHTML = '<tr><td colspan="10" class="text-center py-4"><i data-lucide="loader-2" class="lucide-spin text-success"></i> Loading...</td></tr>';
                lucide.createIcons();
                
                let query = supabase.from('term_results').select('*, students(surname, first_name, reg_number), classes(name), subjects(name)').eq('status', 'final');
                
                if(filterClass.value) query = query.eq('class_id', filterClass.value);
                
                const {data, error} = await query;
                
                if(error) {
                    reportsTableBody.innerHTML = \`<tr><td colspan="10" class="text-center text-danger py-4">Error loading reports: \${error.message}</td></tr>\`;
                    return;
                }
                
                if(!data || data.length === 0) {
                    reportsTableBody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-muted">No submitted reports found for this filter.</td></tr>';
                    return;
                }
                
                reportsTableBody.innerHTML = data.map(r => \`
                    <tr>
                        <td>
                            <div class="fw-bold">\${r.students?.surname} \${r.students?.first_name}</div>
                            <div class="small text-muted">\${r.students?.reg_number || '-'}</div>
                        </td>
                        <td>\${r.classes?.name || '-'}</td>
                        <td>\${r.subjects?.name || '-'}</td>
                        <td>Term \${r.term_id || '-'} / Sub \${r.sub_term_id || '-'}</td>
                        <td class="fw-bold text-secondary">\${r.first_cat ?? '-'}</td>
                        <td class="fw-bold text-secondary">\${r.second_cat ?? '-'}</td>
                        <td class="fw-bold text-secondary">\${r.exam ?? '-'}</td>
                        <td class="fw-bold text-success">\${r.total ?? '-'}</td>
                        <td><span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>Pending Review</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-success">View</button>
                        </td>
                    </tr>
                \`).join('');
            });
        }
        
        initFilters();
    </script>
</body>
</html>`;

html = html.replace('</script>\n</body>', scriptLogic);
fs.writeFileSync('public/admin_approve_reports.html', html);
