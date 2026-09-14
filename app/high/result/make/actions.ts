'use server'

import { createClient } from '../../../../utils/supabase/server'

export async function fetchMetadata() {
  const supabase = await createClient()

  const { data: sessionData } = await supabase.from('sessions').select('*').eq('is_active', true).single()
  
  if (!sessionData) {
    return { error: 'No active session found.' }
  }

  const { data: terms } = await supabase.from('terms').select('*').eq('session_id', sessionData.id)
  const { data: subTerms } = await supabase.from('sub_terms').select('*').in('term_id', (terms || []).map(t => t.id))

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  if (!userId) return { error: 'Not authenticated' }

  const { data: mappings } = await supabase.from('teacher_class_subjects').select(`
    class_id,
    classes (id, name),
    subject_id,
    subjects (id, name)
  `).eq('teacher_id', userId)

  const classes: any[] = []
  const subjectsByClass: Record<string, any[]> = {}

  mappings?.forEach((m: any) => {
    if (!classes.find(c => c.id === m.class_id)) {
      classes.push(m.classes)
    }
    if (!subjectsByClass[m.class_id]) {
      subjectsByClass[m.class_id] = []
    }
    if (!subjectsByClass[m.class_id].find(s => s.id === m.subject_id)) {
        subjectsByClass[m.class_id].push(m.subjects)
    }
  })

  return {
    session: sessionData,
    terms: terms || [],
    subTerms: subTerms || [],
    classes,
    subjectsByClass
  }
}

export async function fetchRosterAndScores(classId: string, subjectId: string, termId: string, subTermId: string) {
  const supabase = await createClient()
  
  // 1. Get all students in the class
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .order('name', { ascending: true })

  if (studentError) throw studentError

  // 2. Get existing results if any
  const { data: results, error: resultsError } = await supabase
    .from('term_results')
    .select('*')
    .eq('class_id', classId)
    .eq('subject_id', subjectId)
    .eq('term_id', termId)
    .eq('sub_term_id', subTermId)

  if (resultsError) throw resultsError

  // Combine
  const merged = students?.map(student => {
    const existing = results?.find(r => r.student_id === student.id)
    return {
      student_id: student.id,
      student_name: student.name,
      first_cat: existing?.first_cat ?? '',
      second_cat: existing?.second_cat ?? '',
      exam: existing?.exam ?? '',
      status: existing?.status ?? 'draft'
    }
  }) || []

  const isFinal = results?.some(r => r.status === 'final') ?? false

  return { roster: merged, isFinal }
}

export async function fetchCBTScores(classId: string, subjectId: string, termId: string, subTermId: string) {
  const supabase = await createClient()

  // Assuming CBT tests might map 1st CAT, etc. Usually one test might be the first CAT.
  // We'll just fetch all cbt_scores for matching tests. 
  // In reality, maybe we sum them or they are specific.
  // We'll fetch the most recent test for this combo.
  const { data: cbtTests } = await supabase
    .from('cbt_tests')
    .select('id')
    .eq('class_id', classId)
    .eq('subject_id', subjectId)
    .eq('term_id', termId)
    .eq('sub_term_id', subTermId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!cbtTests || cbtTests.length === 0) {
    return { error: 'No CBT found for this class/subject/term' }
  }

  const { data: cbtScores } = await supabase
    .from('cbt_scores')
    .select('student_id, score')
    .eq('cbt_test_id', cbtTests[0].id)

  return { scores: cbtScores || [] }
}

export async function saveScores(
    classId: string | number, 
    subjectId: string | number, 
    termId: string | number, 
    subTermId: string | number, 
    results: any[], 
    isFinal: boolean
) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  if (!userId) throw new Error('Not authenticated')

  // SERVER-SIDE VALIDATION
  for (const r of results) {
    if (r.first_cat !== '' && (Number(r.first_cat) < 0 || Number(r.first_cat) > 20)) throw new Error(`Invalid 1st CAT for ${r.student_name}`)
    if (r.second_cat !== '' && (Number(r.second_cat) < 0 || Number(r.second_cat) > 20)) throw new Error(`Invalid 2nd CAT for ${r.student_name}`)
    if (r.exam !== '' && (Number(r.exam) < 0 || Number(r.exam) > 60)) throw new Error(`Invalid Exam score for ${r.student_name}`)
  }

  // 1. Save Drafts first using upsert (RLS ensures status='draft' if not admin)
  const upsertData = results.map(r => ({
    student_id: r.student_id,
    class_id: classId,
    subject_id: subjectId,
    term_id: termId,
    sub_term_id: subTermId,
    first_cat: r.first_cat === '' ? null : Number(r.first_cat),
    second_cat: r.second_cat === '' ? null : Number(r.second_cat),
    exam: r.exam === '' ? null : Number(r.exam),
    status: 'draft', // Always draft during upsert
    created_by: userId
  }))

  const { error } = await supabase
    .from('term_results')
    .upsert(upsertData, { 
      onConflict: 'student_id, class_id, subject_id, term_id, sub_term_id'
    })

  if (error) {
    console.error(error)
    return { error: error.message }
  }

  // 2. If it's a final submission, lock via RPC
  if (isFinal) {
    const { error: rpcError } = await supabase.rpc('submit_final_term_results', {
      p_class_id: Number(classId),
      p_subject_id: Number(subjectId),
      p_term_id: Number(termId),
      p_sub_term_id: Number(subTermId)
    })

    if (rpcError) {
      console.error(rpcError)
      return { error: rpcError.message }
    }
  }

  return { success: true }
}
