import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://jmxyopohngslqvzknjnt.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_yGvqUxGlwiJuSkFN4VOpWw_nKYmo-vl');

async function seedData() {
    try {
        console.log("Fetching class and subject...");
        
        // Find Year 8
        const { data: classData } = await supabase.from('classes').select('*').ilike('name', '%YEAR 8%').limit(1);
        const classId = classData?.[0]?.id;
        
        // Find Computer Studies
        const { data: subjectData } = await supabase.from('subjects').select('*').ilike('name', '%Computer%').limit(1);
        const subjectId = subjectData?.[0]?.id;
        
        if (!classId || !subjectId) {
            console.log("Could not find class or subject.", classData, subjectData);
            return;
        }
        
        console.log(`Class ID: ${classId}, Subject ID: ${subjectId}`);
        
        console.log("Creating 5 students...");
        const newUsers = Array.from({ length: 5 }).map((_, i) => ({
            username: `mock_student_${Date.now()}_${i}`,
            name: `Test Student ${i+1}`,
            email: `mock${Date.now()}_${i}@test.com`,
            role: 'student'
        }));
        
        const { data: insertedUsers, error: userErr } = await supabase.from('users').insert(newUsers).select();
        if (userErr) throw userErr;
        
        const studentsToInsert = insertedUsers.map(u => ({
            user_id: u.id,
            surname: 'Student',
            first_name: u.name.replace('Test ', ''),
            reg_number: `REG${Math.floor(Math.random() * 10000)}`,
            class_id: classId,
            approved: true
        }));
        
        const { error: studErr } = await supabase.from('students').insert(studentsToInsert);
        if (studErr) throw studErr;
        
        console.log("Creating a Test...");
        
        // We just need a test in 'tests'
        const { data: testIns, error: testErr } = await supabase.from('tests').insert([{
            teacher_id: insertedUsers[0].id, // dummy
            title: 'Mock Computer Science Exam',
            code: `COMP${Date.now()}`,
            class_id: classId,
            subject_id: subjectId,
            duration_minutes: 30,
            marks_per_question: 1,
            is_published: true
        }]).select();
        if (testErr) throw testErr;
        
        const testId = testIns[0].id;
        
        console.log("Creating mock test_results...");
        const testResults = insertedUsers.map(u => ({
            student_id: u.id,
            test_id: testId,
            score: Math.floor(Math.random() * 10) + 10, // Score between 10 and 19
            total_questions: 20,
            total_score: 20
        }));
        
        const { error: trErr } = await supabase.from('test_results').insert(testResults);
        if (trErr) throw trErr;
        
        console.log("Successfully seeded database for testing CBT Import!");
        
    } catch(err) {
        console.error("Error:", err);
    }
}

seedData();
