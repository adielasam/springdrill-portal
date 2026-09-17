
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Nigeria',
ADD COLUMN IF NOT EXISTS previous_school TEXT,
ADD COLUMN IF NOT EXISTS reason_for_leaving TEXT,
ADD COLUMN IF NOT EXISTS allergies JSONB;
