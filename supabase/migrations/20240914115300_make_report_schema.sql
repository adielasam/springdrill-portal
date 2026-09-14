-- Migration for Make Report feature
-- Note: Re-running these IF NOT EXISTS ensures safety

-- Ensure sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure terms table
CREATE TABLE IF NOT EXISTS terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id),
    label TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure sub_terms table
CREATE TABLE IF NOT EXISTS sub_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID REFERENCES terms(id),
    label TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure classes table
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    session_id UUID REFERENCES sessions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure subjects table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure students table (missing from prompt but needed)
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    class_id UUID REFERENCES classes(id),
    approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure teacher_class_subjects mapping
CREATE TABLE IF NOT EXISTS teacher_class_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users(id),
    class_id UUID REFERENCES classes(id),
    subject_id UUID REFERENCES subjects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, class_id, subject_id)
);

-- Ensure cbt_tests
CREATE TABLE IF NOT EXISTS cbt_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    class_id UUID REFERENCES classes(id),
    subject_id UUID REFERENCES subjects(id),
    term_id UUID REFERENCES terms(id),
    sub_term_id UUID REFERENCES sub_terms(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure cbt_scores
CREATE TABLE IF NOT EXISTS cbt_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cbt_test_id UUID REFERENCES cbt_tests(id),
    student_id UUID REFERENCES students(id),
    score NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cbt_test_id, student_id)
);

-- Term Results table
CREATE TABLE IF NOT EXISTS term_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) NOT NULL,
    class_id UUID REFERENCES classes(id) NOT NULL,
    subject_id UUID REFERENCES subjects(id) NOT NULL,
    term_id UUID REFERENCES terms(id) NOT NULL,
    sub_term_id UUID REFERENCES sub_terms(id) NOT NULL,
    first_cat NUMERIC DEFAULT 0,
    second_cat NUMERIC DEFAULT 0,
    exam NUMERIC DEFAULT 0,
    total NUMERIC GENERATED ALWAYS AS (COALESCE(first_cat, 0) + COALESCE(second_cat, 0) + COALESCE(exam, 0)) STORED,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
    submitted_by UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, class_id, subject_id, term_id, sub_term_id)
);

-- Enable RLS on term_results
ALTER TABLE term_results ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can read results for their mapped class+subject
CREATE POLICY "Teachers can read term_results"
ON term_results FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM teacher_class_subjects tcs
        WHERE tcs.teacher_id = auth.uid()
        AND tcs.class_id = term_results.class_id
        AND tcs.subject_id = term_results.subject_id
    )
);

-- Policy: Teachers can insert/update results for their mapped class+subject
-- But ONLY if the current status is NOT 'final'
CREATE POLICY "Teachers can update draft term_results"
ON term_results FOR UPDATE
USING (
    status != 'final' AND
    EXISTS (
        SELECT 1 FROM teacher_class_subjects tcs
        WHERE tcs.teacher_id = auth.uid()
        AND tcs.class_id = term_results.class_id
        AND tcs.subject_id = term_results.subject_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM teacher_class_subjects tcs
        WHERE tcs.teacher_id = auth.uid()
        AND tcs.class_id = term_results.class_id
        AND tcs.subject_id = term_results.subject_id
    )
);

-- Policy: Teachers can insert
CREATE POLICY "Teachers can insert term_results"
ON term_results FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM teacher_class_subjects tcs
        WHERE tcs.teacher_id = auth.uid()
        AND tcs.class_id = term_results.class_id
        AND tcs.subject_id = term_results.subject_id
    )
);
