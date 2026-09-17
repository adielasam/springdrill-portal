-- Subject Categories
CREATE TABLE IF NOT EXISTS subject_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure Subjects table exists and has category_id
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category_id INTEGER REFERENCES subject_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assign Subjects to Classes
CREATE TABLE IF NOT EXISTS class_subjects (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE(class_id, subject_id)
);

-- Assign Teachers to Subjects for a Class
CREATE TABLE IF NOT EXISTS teacher_class_subjects (
    id SERIAL PRIMARY KEY,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, class_id, subject_id)
);

-- Subject Heads (HODs)
CREATE TABLE IF NOT EXISTS subject_heads (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    head_teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(subject_id, head_teacher_id)
);

-- Add missing foreign key constraints to subjects if they don't exist yet
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE subjects ADD COLUMN category_id INTEGER REFERENCES subject_categories(id) ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column category_id already exists in subjects.';
    END;
END $$;

-- Enable RLS
ALTER TABLE subject_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_heads ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for admin access)
CREATE POLICY "Enable all for authenticated users" ON subject_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON subjects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON class_subjects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON teacher_class_subjects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON subject_heads FOR ALL USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
