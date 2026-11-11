/**
 * SPRINGDRILL — SHARED SIDEBAR (public/sidebar.js)
 * =================================================
 * Single source of truth for the admin + teacher sidebars.
 *
 * Every admin/teacher page in public/ carries an empty
 *   <div class="sidebar" id="sidebar" data-role="admin|teacher"></div>
 * followed by <script src="sidebar.js"></script>. This file renders the
 * full menu for that role into the div, marks the current page active
 * (and opens its parent collapse), and wires the Secure Logout link.
 *
 * DESIGN NOTES
 * - The menu for each role is the UNION of every live link any page's
 *   old sidebar had, so no existing page becomes unreachable:
 *   admin gains Teachers (teacher_list.html) and Announcements
 *   (admin_announcements.html, previously linked from nowhere);
 *   teacher gains My Students, Class Roster, Assignments, Create New
 *   Test, Manage Questions, JAMB Q-Bank, Report Scores and Print
 *   Report Cards, which were only reachable from dashboard cards or
 *   from one-off variant menus.
 * - Links are written with the .html extension (explicit; does not
 *   depend on the Next.js /:path* -> /:path*.html rewrite).
 * - Icons are Font Awesome (CSS only). The old admin sidebar used
 *   Lucide icons, which need a createIcons() call after injection;
 *   FA icons render with no JS timing dependency. Every admin/teacher
 *   page already loads Font Awesome CSS.
 * - Brand is the SpringDrill text wordmark (inline-styled so it looks
 *   the same on every page). The old sidebars used dorvas-logo.png —
 *   Dorvas's logo — as the "SpringDrill logo"; dropped with the PR #3
 *   de-slop (landing page uses the same text wordmark).
 * - Logout uses its own id (sidebarLogoutBtn), NOT logoutBtn: several
 *   pages already have a topbar #logoutBtn with their own handler,
 *   and duplicate ids would leave one of the two buttons dead.
 *   This handler signs out through the shared Supabase client and
 *   returns to the landing page, exactly like the per-page handlers.
 *
 * DELIBERATELY REMOVED (dead links — no page exists for them yet).
 * These return when the feature is built; do NOT re-add them as
 * href="#" — the repo rule is "no dead links".
 * - Admin Reports: Report Setup, Reports View, Process Reports,
 *   Report Entry, Promotion Manager, Transfer Manager (both Junior
 *   and High School sections). Only Approve Reports and Publish
 *   Report have pages today. The rest arrive with the results
 *   engine (Phase 1 of the Spring Drill additions proposal).
 * - Teacher: Make Report (pointed at /high/result/make — an Educare
 *   path that does not exist on Spring Drill), Teacher Reports,
 *   Teacher Comments, BehaviourTracker, TimeTable, Photo Journals.
 *   These were onclick="alert('... coming soon')" placeholders.
 * - Student sidebar is NOT touched by this file (it is already
 *   consistent across student pages). Pages with no sidebar at all
 *   (report/print/exam flows such as take_test.html,
 *   admin_view_result.html, generate_report_card.html) are out of
 *   scope for this change.
 */
(function () {
    'use strict';

    var BRAND_STYLE = 'margin:0;font-weight:800;font-size:20px;letter-spacing:-.5px;color:var(--brand-600,#0d7a4d)';

    // item: { label, href, icon }   group: { heading } / { label, icon, id, children:[item] }
    var MENUS = {
        admin: [
            { heading: 'Overview' },
            { label: 'Dashboard', href: 'admin_dashboard.html', icon: 'fas fa-th-large' },
            { heading: 'Academics' },
            { label: 'Subjects', icon: 'fas fa-book-open', id: 'subjectsMenu', children: [
                { label: 'Create Subjects', href: 'admin_subjects.html#subjectsTab' },
                { label: 'Manage Subjects', href: 'admin_subjects.html#subjectsTab' },
                { label: 'Assign to Classes', href: 'admin_subjects.html#classesTab' },
                { label: 'Manage Credit Units', href: 'admin_subjects.html#creditsTab' },
                { label: 'Manage Subject Categories', href: 'admin_subjects.html#categoriesTab' },
                { label: 'Assign to Teachers', href: 'admin_subjects.html#teachersTab' },
                { label: 'Assign to Subject Heads', href: 'admin_subjects.html#headsTab' }
            ]},
            { label: 'Classes &amp; Students', href: 'class_list.html', icon: 'fas fa-users' },
            { label: 'Teachers', href: 'teacher_list.html', icon: 'fas fa-chalkboard-teacher' },
            { label: 'Attendance', href: 'admin_attendance.html', icon: 'fas fa-calendar-check' },
            { label: 'League Table', href: 'admin_league_table.html', icon: 'fas fa-trophy' },
            { heading: 'Reports' },
            { label: 'Junior School Report', icon: 'fas fa-file-alt', id: 'juniorReportMenu', children: [
                { label: 'Approve Reports', href: 'admin_approve_reports.html' },
                { label: 'Publish Report', href: 'admin_publish_reports.html' }
            ]},
            { label: 'High School Report', icon: 'fas fa-file-alt', id: 'highReportMenu', children: [
                { label: 'Approve Reports', href: 'admin_approve_reports.html' },
                { label: 'Publish Report', href: 'admin_publish_reports.html' }
            ]},
            { heading: 'Operations' },
            { label: 'Admissions', href: 'admin_admissions.html', icon: 'fas fa-graduation-cap' },
            { label: 'Fees', href: 'admin_fees.html', icon: 'fas fa-wallet' },
            { label: 'Payments', href: 'admin_payments.html', icon: 'fas fa-credit-card' },
            { label: 'Invoices', href: 'admin_invoices.html', icon: 'fas fa-file-text' },
            { heading: 'Administration' },
            { label: 'Accounts', href: 'admin_create_user.html', icon: 'fas fa-user-plus' },
            { label: 'Approvals', href: 'manage_users.html', icon: 'fas fa-user-check' },
            { label: 'Messages', href: 'admin_messages.html', icon: 'fas fa-envelope' },
            { label: 'Announcements', href: 'admin_announcements.html', icon: 'fas fa-bullhorn' },
            { label: 'Settings', href: 'admin_settings.html', icon: 'fas fa-cog' }
        ],
        teacher: [
            { label: 'Dashboard', href: 'teacher_dashboard.html', icon: 'fas fa-home' },
            { label: 'My Students', href: 'teacher_my_students.html', icon: 'fas fa-users' },
            { label: 'Class Roster', href: 'teacher_class_list.html', icon: 'fas fa-list' },
            { label: 'Assignments', href: 'teacher_assignments.html', icon: 'fas fa-tasks' },
            { label: 'eClassroom', href: 'teacher_eclassroom.html', icon: 'fas fa-laptop-house' },
            { label: 'Feedback / Messages', href: 'teacher_messages.html', icon: 'fas fa-comments' },
            { label: 'Subjects', icon: 'fas fa-book', id: 'subjectsMenu', children: [
                { label: 'Subjects Overview', href: 'teacher_subjects.html', icon: 'fas fa-edit' },
                { label: 'Subjects Enrollment', href: 'teacher_subject_enrollment.html', icon: 'fas fa-users' }
            ]},
            { label: 'Lesson Planner', href: 'teacher_subjects_ai.html#aiTab', icon: 'fas fa-chalkboard' },
            { label: 'CBT', icon: 'fas fa-desktop', id: 'cbtMenu', children: [
                { label: 'Question Bank', href: 'question_bank.html', icon: 'fas fa-database' },
                { label: 'Manage Questions', href: 'manage_questions.html', icon: 'fas fa-list-ul' },
                { label: 'Create New Test', href: 'create_test.html', icon: 'fas fa-plus-circle' },
                { label: 'Manage CBT', href: 'manage_cbt.html', icon: 'fas fa-cog' },
                { label: 'Result Manager', href: 'test_results.html', icon: 'fas fa-chart-line' },
                { label: 'JAMB Uploader', href: 'teacher_bulk_upload.html', icon: 'fas fa-upload' },
                { label: 'JAMB Q-Bank', href: 'jamb_question_bank.html', icon: 'fas fa-book' }
            ]},
            { label: 'Reports', icon: 'fas fa-file-alt', id: 'reportsMenu', children: [
                { label: 'Report Scores', href: 'report_scores.html', icon: 'fas fa-chart-bar' },
                { label: 'Print Report Cards', href: 'report_card.html', icon: 'fas fa-print' }
            ]},
            { label: 'Calendar', icon: 'fas fa-calendar-day', id: 'calendarMenu', children: [
                { label: 'View Calendar', href: 'view_calendar.html', icon: 'fas fa-calendar-alt' },
                { label: 'Manage Calendar', href: 'manage_calendar.html', icon: 'fas fa-cog' }
            ]},
            { label: 'Attendance', icon: 'fas fa-clipboard-list', id: 'attendanceMenu', children: [
                { label: 'Add Attendance', href: 'teacher_attendance.html', icon: 'fas fa-plus' },
                { label: 'View Attendance', href: 'teacher_view_attendance.html', icon: 'fas fa-list' }
            ]}
        ]
    };

    function renderMenu(role) {
        var items = MENUS[role] || MENUS.teacher;
        var isAdmin = (role === 'admin');
        var html = '<div class="sidebar-brand"><h4 style="' + BRAND_STYLE + '">SpringDrill</h4></div>';
        html += isAdmin ? '<nav class="nav flex-column">' : '<nav class="d-flex flex-column mb-5">';
        items.forEach(function (it) {
            if (it.heading) {
                html += '<div class="sidebar-heading">' + it.heading + '</div>';
                return;
            }
            if (it.children) {
                if (isAdmin) {
                    html += '<a class="nav-link" data-bs-toggle="collapse" href="#' + it.id + '" role="button" aria-expanded="false" aria-controls="' + it.id + '">'
                        + '<i class="' + it.icon + '"></i> ' + it.label
                        + '<i class="fas fa-chevron-down ms-auto" style="font-size: 10px;"></i></a>';
                    html += '<div class="collapse" id="' + it.id + '">'
                        + '<nav class="nav flex-column ms-4 mb-2" style="border-left: 2px solid var(--brand-100);">';
                    it.children.forEach(function (c) {
                        html += '<a href="' + c.href + '" class="nav-link py-1" style="font-size: 13px;">' + c.label + '</a>';
                    });
                    html += '</nav></div>';
                } else {
                    html += '<a href="#' + it.id + '" data-bs-toggle="collapse" class="nav-link d-flex justify-content-between align-items-center">'
                        + '<span><i class="' + it.icon + '"></i> ' + it.label + '</span>'
                        + '<i class="fas fa-caret-down me-2"></i></a>';
                    html += '<div class="collapse" id="' + it.id + '">';
                    it.children.forEach(function (c) {
                        html += '<a href="' + c.href + '" class="nav-link"><i class="' + (c.icon || 'fas fa-angle-right') + '"></i> ' + c.label + '</a>';
                    });
                    html += '</div>';
                }
                return;
            }
            var icon = it.icon ? '<i class="' + it.icon + '"></i> ' : '';
            html += '<a href="' + it.href + '" class="nav-link">' + icon + it.label + '</a>';
        });
        // Secure Logout — own id on purpose (see header note about #logoutBtn).
        if (isAdmin) {
            html += '<a href="#" id="sidebarLogoutBtn" class="nav-link text-danger mt-3"><i class="fas fa-power-off"></i> Secure Logout</a>';
        } else {
            html += '<a href="#" id="sidebarLogoutBtn" class="nav-link text-danger mt-3 border-top border-secondary pt-3"><i class="fas fa-power-off"></i> Secure Logout</a>';
        }
        html += '</nav>';
        return html;
    }

    function markActive() {
        var page = window.location.pathname.split('/').pop().split('?')[0].split('#')[0] || '';
        if (!page) return;
        var links = document.querySelectorAll('#sidebar a.nav-link[href]');
        links.forEach(function (a) {
            var href = a.getAttribute('href') || '';
            if (href.charAt(0) === '#') return;
            var file = href.split('#')[0].split('?')[0].split('/').pop();
            if (file && file === page) {
                a.classList.add('active');
                var collapse = a.closest('.collapse');
                if (collapse) {
                    collapse.classList.add('show');
                    var toggle = document.querySelector('[data-bs-toggle="collapse"][href="#' + collapse.id + '"]');
                    if (toggle) toggle.setAttribute('aria-expanded', 'true');
                }
            }
        });
    }

    function wireLogout() {
        var btn = document.getElementById('sidebarLogoutBtn');
        if (!btn) return;
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.6';
            import('/supabaseClient.js').then(function (m) {
                return m.supabase.auth.signOut();
            }).catch(function (err) {
                console.error('Sidebar logout failed:', err);
            }).then(function () {
                window.location.href = '/';
            });
        });
    }

    function init() {
        var sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        var role = sidebar.getAttribute('data-role');
        if (role !== 'admin' && role !== 'teacher') {
            // Fallback: infer from the current page when data-role is missing.
            var page = window.location.pathname.split('/').pop() || '';
            role = (/^admin_/.test(page) || page === 'manage_users.html' || page === 'class_list.html' || page === 'teacher_list.html')
                ? 'admin' : 'teacher';
        }
        sidebar.innerHTML = renderMenu(role);
        markActive();
        wireLogout();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
