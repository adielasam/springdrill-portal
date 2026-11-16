// resultsEngine.js — shared results/collation logic for the SpringDrill results engine.
//
// Single source of truth for the Educare-verified rules (see
// educare-results-study.md): assessment maxima, grading bands, averages,
// competition-ranking positions, and cumulative averages. Every results
// page (Make Report, broadsheet, report cards, publish, student card)
// uses this module so a total, grade or position can never disagree
// between two pages.
//
// No dependencies, no network calls, no AI. Loaded as a classic script
// before the page's <script type="module"> block, like sd-confirm.js.
(function () {
    'use strict';

    // Assessment maxima — identical for Ember, Lent and Trinity and for all
    // levels (verified on Educare, study §13 item 5). Kept as constants:
    // no admin-editable settings table exists in the codebase.
    var CAT1_MAX = 20;
    var CAT2_MAX = 20;
    var EXAM_MAX = 60;
    var TOTAL_MAX = 100;

    // Term / sub-term value conventions. These exact strings are what the
    // existing approve/publish pages already store in term_results.term and
    // term_results.sub_term — every results page must use them verbatim or
    // rows written on one page become invisible on another.
    var TERMS = ['First Term', 'Second Term', 'Third Term', 'Ember Term', 'Lent Term', 'Trinity Term'];
    var SUB_TERMS = ['Half Term', 'Full Term'];

    // SSCE 9-band grading (used on printed report cards) — Educare study §3.
    var SSCE_BANDS = [
        { min: 80, letter: 'A1', point: 5, remark: 'EXCELLENT' },
        { min: 70, letter: 'B2', point: 4.5, remark: 'VERY GOOD' },
        { min: 65, letter: 'B3', point: 4, remark: 'GOOD' },
        { min: 60, letter: 'C4', point: 3.5, remark: 'CREDIT' },
        { min: 55, letter: 'C5', point: 3, remark: 'CREDIT' },
        { min: 50, letter: 'C6', point: 2.5, remark: 'CREDIT' },
        { min: 45, letter: 'D7', point: 2, remark: 'PASS' },
        { min: 40, letter: 'E8', point: 1.5, remark: 'PASS' },
        { min: 0, letter: 'F9', point: 1.25, remark: 'FAIL' }
    ];

    // JSCE 6-band grading (also configured on Educare) — note the letter B
    // is used twice, at 60-69 and 70-79, exactly as on Educare.
    var JSCE_BANDS = [
        { min: 80, letter: 'A', point: 6, remark: 'EXCELLENT' },
        { min: 70, letter: 'B', point: 5.5, remark: 'VERY GOOD' },
        { min: 60, letter: 'B', point: 4, remark: 'GOOD' },
        { min: 50, letter: 'C', point: 3, remark: 'CREDIT' },
        { min: 40, letter: 'P', point: 2, remark: 'PASS' },
        { min: 0, letter: 'F', point: 1, remark: 'FAIL' }
    ];

    // Affective keys — the 7 traits on the Educare card (study §5).
    var AFFECTIVE_TRAITS = [
        'Attentiveness', 'Neatness', 'Politeness', 'Punctuality',
        'Relationship with Others', 'Bible Memory', 'Pace work'
    ];
    var AFFECTIVE_KEYS = { 5: 'Excellent', 4: 'Good', 3: 'Satisfactory', 2: 'Fair', 1: 'Poor' };

    // Workflow statuses for term_results.status. 'final' is a legacy alias
    // of 'submitted' (older code writes it); reads treat both as pending
    // approval. New code writes 'submitted'.
    var STATUSES = ['draft', 'submitted', 'final', 'approved', 'rejected', 'published'];
    var STATUS_LABELS = {
        draft: 'Draft', submitted: 'Pending Approval', final: 'Pending Approval',
        approved: 'Approved', rejected: 'Rejected', published: 'Published'
    };

    function num(value) {
        var n = Number(value);
        return isFinite(n) ? n : 0;
    }

    function round2(value) {
        return Math.round(num(value) * 100) / 100;
    }

    // Subject total = 1st CAT + 2nd CAT + Exam, out of 100. Missing
    // components count as 0 (a Half Term row has no exam yet).
    function subjectTotal(row) {
        return round2(num(row.first_cat) + num(row.second_cat) + num(row.exam));
    }

    // True when the row carries at least one entered component (a row of
    // all-nulls is an empty slot, not a zero — it must not drag an average).
    function hasAnyScore(row) {
        return row.first_cat != null || row.second_cat != null || row.exam != null;
    }

    function gradeFor(total, bands) {
        var t = num(total);
        for (var i = 0; i < bands.length; i++) {
            if (t >= bands[i].min) return bands[i];
        }
        return bands[bands.length - 1];
    }

    function ssceGrade(total) { return gradeFor(total, SSCE_BANDS); }
    function jsceGrade(total) { return gradeFor(total, JSCE_BANDS); }

    function ordinal(n) {
        var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    // Average = sum of subject totals / number of subjects taken.
    // Subjects with no entered score are excluded (Educare's "--" rule).
    function averageOf(rows) {
        var scored = rows.filter(hasAnyScore);
        if (scored.length === 0) return null;
        var sum = 0;
        scored.forEach(function (r) { sum += subjectTotal(r); });
        return round2(sum / scored.length);
    }

    // Competition ranking (Educare-verified, study §13 item 1): tied
    // averages share the same position and the next position is skipped
    // (12th, 12th, 14th). Input: [{ key, average }]. Returns a map
    // key -> position (number), or null for rows with no average.
    // Averages are compared at 2 decimal places so float noise never
    // splits a genuine tie.
    function assignPositions(rows) {
        var ranked = rows
            .filter(function (r) { return r.average != null; })
            .slice()
            .sort(function (a, b) { return b.average - a.average; });
        var positions = {};
        var lastAvg = null;
        var lastPos = 0;
        ranked.forEach(function (r, i) {
            var avg = round2(r.average);
            if (lastAvg !== null && avg === lastAvg) {
                positions[r.key] = lastPos;
            } else {
                lastPos = i + 1;
                positions[r.key] = lastPos;
                lastAvg = avg;
            }
        });
        rows.forEach(function (r) {
            if (!(r.key in positions)) positions[r.key] = null;
        });
        return positions;
    }

    // Cumulative average across terms: plain mean of the per-term averages
    // that exist (2-Term Average = Ember+Lent, 3-Term = Ember+Lent+Trinity).
    // Never uses Educare's unlabelled P A / C P / P B F codes.
    function cumulativeAverage(termAverages) {
        var present = termAverages.filter(function (a) { return a != null; });
        if (present.length === 0) return null;
        var sum = 0;
        present.forEach(function (a) { sum += num(a); });
        return round2(sum / present.length);
    }

    function statusLabel(status) {
        return STATUS_LABELS[status] || status || 'Draft';
    }

    function isPendingApproval(status) {
        return status === 'submitted' || status === 'final';
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function csvCell(value) {
        var s = String(value == null ? '' : value);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    function toCsv(headers, rows) {
        var lines = [headers.map(csvCell).join(',')];
        rows.forEach(function (r) { lines.push(r.map(csvCell).join(',')); });
        return lines.join('\n');
    }

    function downloadCsv(filename, csvText) {
        var blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    window.ResultsEngine = {
        CAT1_MAX: CAT1_MAX,
        CAT2_MAX: CAT2_MAX,
        EXAM_MAX: EXAM_MAX,
        TOTAL_MAX: TOTAL_MAX,
        TERMS: TERMS,
        SUB_TERMS: SUB_TERMS,
        SSCE_BANDS: SSCE_BANDS,
        JSCE_BANDS: JSCE_BANDS,
        AFFECTIVE_TRAITS: AFFECTIVE_TRAITS,
        AFFECTIVE_KEYS: AFFECTIVE_KEYS,
        STATUSES: STATUSES,
        num: num,
        round2: round2,
        subjectTotal: subjectTotal,
        hasAnyScore: hasAnyScore,
        gradeFor: gradeFor,
        ssceGrade: ssceGrade,
        jsceGrade: jsceGrade,
        ordinal: ordinal,
        averageOf: averageOf,
        assignPositions: assignPositions,
        cumulativeAverage: cumulativeAverage,
        statusLabel: statusLabel,
        isPendingApproval: isPendingApproval,
        escapeHtml: escapeHtml,
        toCsv: toCsv,
        downloadCsv: downloadCsv
    };
})();
