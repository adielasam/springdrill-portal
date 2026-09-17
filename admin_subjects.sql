-- 1. Schools
CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Subject Groups
CREATE TABLE IF NOT EXISTS subject_groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Subject Departments
CREATE TABLE IF NOT EXISTS subject_departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Subject Categories (from previous)
CREATE TABLE IF NOT EXISTS subject_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Subjects Table (Full schema)
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
    group_id INTEGER REFERENCES subject_groups(id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES subject_departments(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES subject_categories(id) ON DELETE SET NULL,
    credit_unit INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, school_id) -- A subject name must be unique within a school
);

-- Safely add missing columns to existing subjects table if it already exists
DO $$ 
BEGIN 
    BEGIN ALTER TABLE subjects ADD COLUMN code TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE subjects ADD COLUMN school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE subjects ADD COLUMN group_id INTEGER REFERENCES subject_groups(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE subjects ADD COLUMN department_id INTEGER REFERENCES subject_departments(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE subjects ADD COLUMN category_id INTEGER REFERENCES subject_categories(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE subjects ADD COLUMN credit_unit INTEGER DEFAULT 1; EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- 6. Academic Sessions
CREATE TABLE IF NOT EXISTS academic_sessions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Assign Subjects to Classes
CREATE TABLE IF NOT EXISTS class_subjects (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE(class_id, subject_id)
);

-- 8. Assign Teachers to Class Subjects
CREATE TABLE IF NOT EXISTS teacher_class_subjects (
    id SERIAL PRIMARY KEY,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES academic_sessions(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, class_id, subject_id, session_id)
);

-- Safely add missing columns to teacher_class_subjects
DO $$ 
BEGIN 
    BEGIN ALTER TABLE teacher_class_subjects ADD COLUMN session_id INTEGER REFERENCES academic_sessions(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- 9. Subject Heads
CREATE TABLE IF NOT EXISTS subject_heads (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    head_teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(subject_id, head_teacher_id)
);

-- 9. Assign Subjects to Students
CREATE TABLE IF NOT EXISTS student_subjects (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE(student_id, subject_id)
);

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for admin access)
CREATE POLICY "Enable all for authenticated users" ON schools FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON subject_groups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON subject_departments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON subject_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON subjects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON academic_sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON class_subjects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON teacher_class_subjects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON subject_heads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON student_subjects FOR ALL USING (auth.role() = 'authenticated');

-- Insert default schools if empty
INSERT INTO schools (name) VALUES ('SpringDrill Nursery School'), ('SpringDrill Primary School'), ('SpringDrill High School') ON CONFLICT DO NOTHING;

-- Insert default sessions
INSERT INTO academic_sessions (name, is_active) VALUES ('2023/2024', false), ('2024/2025', false), ('2025/2026', false), ('2026/2027', true) ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
