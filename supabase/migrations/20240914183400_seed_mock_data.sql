-- Seed script for 2026/2027 testing
DO $$
DECLARE
    v_class_id INTEGER;
    v_subject_id INTEGER;
    v_teacher_id UUID;
    v_test_id INTEGER;
    v_student1_user UUID = gen_random_uuid();
    v_student2_user UUID = gen_random_uuid();
    v_student3_user UUID = gen_random_uuid();
    v_student4_user UUID = gen_random_uuid();
    v_student5_user UUID = gen_random_uuid();
BEGIN
    -- 1. Find Class YEAR 8
    SELECT id INTO v_class_id FROM public.classes WHERE name ILIKE '%YEAR 8%' LIMIT 1;
    IF v_class_id IS NULL THEN
        RAISE EXCEPTION 'Class YEAR 8 not found';
    END IF;

    -- 2. Find Subject Computer
    SELECT id INTO v_subject_id FROM public.subjects WHERE name ILIKE '%Computer%' OR name ILIKE '%ICT%' LIMIT 1;
    IF v_subject_id IS NULL THEN
        RAISE EXCEPTION 'Computer subject not found';
    END IF;

    -- 3. Get any teacher ID for the test owner
    SELECT id INTO v_teacher_id FROM auth.users WHERE email ILIKE '%@%' LIMIT 1;
    IF v_teacher_id IS NULL THEN
        v_teacher_id := gen_random_uuid();
    END IF;

    -- 4. Insert 5 mock users for students
    INSERT INTO auth.users (id, email) VALUES
        (v_student1_user, 'student1@mock.com'),
        (v_student2_user, 'student2@mock.com'),
        (v_student3_user, 'student3@mock.com'),
        (v_student4_user, 'student4@mock.com'),
        (v_student5_user, 'student5@mock.com')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.users (id, username, name, email, role) VALUES
        (v_student1_user, 'mock_s1', 'Test Student 1', 'student1@mock.com', 'student'),
        (v_student2_user, 'mock_s2', 'Test Student 2', 'student2@mock.com', 'student'),
        (v_student3_user, 'mock_s3', 'Test Student 3', 'student3@mock.com', 'student'),
        (v_student4_user, 'mock_s4', 'Test Student 4', 'student4@mock.com', 'student'),
        (v_student5_user, 'mock_s5', 'Test Student 5', 'student5@mock.com', 'student');

    -- 5. Map to public.students table
    INSERT INTO public.students (user_id, surname, first_name, reg_number, class_id, approved) VALUES
        (v_student1_user, 'Student 1', 'Test', 'REG-8001', v_class_id, true),
        (v_student2_user, 'Student 2', 'Test', 'REG-8002', v_class_id, true),
        (v_student3_user, 'Student 3', 'Test', 'REG-8003', v_class_id, true),
        (v_student4_user, 'Student 4', 'Test', 'REG-8004', v_class_id, true),
        (v_student5_user, 'Student 5', 'Test', 'REG-8005', v_class_id, true);

    -- 6. Insert a Mock Test
    INSERT INTO public.tests (teacher_id, title, code, class_id, subject_id, duration_minutes, marks_per_question, is_published, created_at)
    VALUES (v_teacher_id, 'Mock Computer Science Exam', 'COMP-MOCK', v_class_id, v_subject_id, 30, 1, true, now())
    RETURNING id INTO v_test_id;

    -- 7. Insert Mock Test Results (Scores)
    INSERT INTO public.test_results (student_id, test_id, score, total_questions, total_score) VALUES
        (v_student1_user, v_test_id, 14, 20, 20),
        (v_student2_user, v_test_id, 18, 20, 20),
        (v_student3_user, v_test_id, 16, 20, 20),
        (v_student4_user, v_test_id, 12, 20, 20),
        (v_student5_user, v_test_id, 19, 20, 20);

END $$;
