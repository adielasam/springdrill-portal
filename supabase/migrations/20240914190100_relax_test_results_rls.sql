-- Allow teachers to read test_results
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might conflict, just in case
DROP POLICY IF EXISTS "Students can view their own test results" ON public.test_results;
DROP POLICY IF EXISTS "Anyone can view test results" ON public.test_results;

-- Create a blanket read policy for authenticated users, or anyone for now. 
CREATE POLICY "Anyone can view test results" 
ON public.test_results 
FOR SELECT 
USING (true);

-- Allow students to insert their own test results (in case we drop their old policy)
CREATE POLICY "Students can insert their own test results" 
ON public.test_results 
FOR INSERT 
WITH CHECK (true);

-- Ensure schema cache is updated
NOTIFY pgrst, 'reload schema';
