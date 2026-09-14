'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jmxyopohngslqvzknjnt.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yGvqUxGlwiJuSkFN4VOpWw_nKYmo-vl'
const supabase = createClient(supabaseUrl, supabaseKey)

// Configuration for sub-term visible fields based on business logic assumptions
const subTermFieldsConfig: Record<string, string[]> = {
  'Half Term': ['first_cat', 'second_cat'],
  'Full Term': ['first_cat', 'second_cat', 'exam']
}

export default function ReportClient() {
  const [initLoading, setInitLoading] = useState(true)
  const [globalError, setGlobalError] = useState<string | null>(null)
  
  const [session, setSession] = useState<any>(null)
  const [terms, setTerms] = useState<any[]>([])
  const [subTerms, setSubTerms] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, any[]>>({})
  const [userId, setUserId] = useState<string | null>(null)

  const [selectedTerm, setSelectedTerm] = useState('')
  const [selectedSubTerm, setSelectedSubTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')

  const [results, setResults] = useState<any[]>([])
  const [isFinal, setIsFinal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    loadMetadata()
  }, [])

  async function loadMetadata() {
    try {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData?.user?.id
      if (!uid) {
        setGlobalError('Not authenticated. Please log in.')
        setInitLoading(false)
        return
      }
      setUserId(uid)

      const { data: sessionData, error: sessionError } = await supabase.from('sessions').select('*').eq('is_active', true).single()
      if (sessionError || !sessionData) {
        setGlobalError('No active session found.')
        setInitLoading(false)
        return
      }
      setSession(sessionData)

      const { data: t } = await supabase.from('terms').select('*').eq('session_id', sessionData.id)
      const termArr = t || []
      setTerms(termArr)

      const { data: st } = await supabase.from('sub_terms').select('*').in('term_id', termArr.map((x: any) => x.id))
      setSubTerms(st || [])

      const { data: mappings } = await supabase.from('teacher_class_subjects').select(`
        class_id,
        classes (id, name),
        subject_id,
        subjects (id, name)
      `).eq('teacher_id', uid)

      const clsArr: any[] = []
      const subMap: Record<string, any[]> = {}

      mappings?.forEach((m: any) => {
        if (!clsArr.find(c => c.id === m.class_id) && m.classes) {
          clsArr.push(m.classes)
        }
        if (!subMap[m.class_id]) subMap[m.class_id] = []
        if (!subMap[m.class_id].find(s => s.id === m.subject_id) && m.subjects) {
            subMap[m.class_id].push(m.subjects)
        }
      })

      setClasses(clsArr)
      setSubjectsByClass(subMap)
    } catch (err: any) {
      setGlobalError(err.message)
    }
    setInitLoading(false)
  }

  // Selected object references for label lookups
  const subTermObj = subTerms.find((s: any) => String(s.id) === String(selectedSubTerm))
  const subTermLabel = subTermObj ? subTermObj.label : ''
  const subjectObj = subjectsByClass[selectedClass]?.find((s: any) => String(s.id) === String(selectedSubject))
  const subjectLabel = subjectObj ? subjectObj.name : ''
  const sessionLabel = session?.label || session?.name || 'Current'

  const visibleFields = subTermFieldsConfig[subTermLabel] || ['first_cat', 'second_cat', 'exam']
  const isFormComplete = selectedTerm && selectedSubTerm && selectedClass && selectedSubject

  useEffect(() => {
    if (isFormComplete) {
      loadGrid()
    } else {
      setResults([])
      setIsFinal(false)
    }
  }, [selectedTerm, selectedSubTerm, selectedClass, selectedSubject])

  async function loadGrid() {
    setIsLoading(true)
    try {
      // 1. Get all students in the class
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', selectedClass)
        .order('name', { ascending: true })

      if (studentError) throw studentError

      // 2. Get existing results if any
      const { data: termResults, error: resultsError } = await supabase
        .from('term_results')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)
        .eq('term_id', selectedTerm)
        .eq('sub_term_id', selectedSubTerm)

      if (resultsError) throw resultsError

      // Combine
      const merged = students?.map((student: any) => {
        const existing = termResults?.find((r: any) => r.student_id === student.id)
        return {
          student_id: student.id,
          student_name: student.name,
          first_cat: existing?.first_cat ?? '',
          second_cat: existing?.second_cat ?? '',
          exam: existing?.exam ?? '',
          status: existing?.status ?? 'draft'
        }
      }) || []

      setResults(merged)
      setIsFinal(termResults?.some((r: any) => r.status === 'final') ?? false)
    } catch (err: any) {
      alert("Error loading roster: " + err.message)
    }
    setIsLoading(false)
  }

  async function handleImportCBT() {
    setIsLoading(true)
    try {
      const { data: cbtTests } = await supabase
        .from('cbt_tests')
        .select('id')
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)
        .eq('term_id', selectedTerm)
        .eq('sub_term_id', selectedSubTerm)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!cbtTests || cbtTests.length === 0) {
        showToast('No CBT found for this class/subject/term')
        setIsLoading(false)
        return
      }

      const { data: cbtScores } = await supabase
        .from('cbt_scores')
        .select('student_id, score')
        .eq('cbt_test_id', cbtTests[0].id)

      const scores = cbtScores || []
      const updated = [...results]
      let foundAny = false
      updated.forEach(row => {
        const cbtRecord = scores.find((s: any) => s.student_id === row.student_id)
        if (cbtRecord) {
          row.first_cat = cbtRecord.score
          foundAny = true
        }
      })
      if (foundAny) {
        setResults(updated)
        showToast('Imported CBT scores successfully.')
      } else {
        showToast('No matching student scores found in CBT records.')
      }
    } catch (err: any) {
      showToast("Error importing CBT: " + err.message)
    }
    setIsLoading(false)
  }

  function handleScoreChange(studentId: string, field: string, val: string) {
    if (isFinal) return

    setResults(prev => prev.map(r => {
      if (r.student_id === studentId) {
        return { ...r, [field]: val }
      }
      return r
    }))
  }

  function validateResults() {
    for (const r of results) {
      if (r.first_cat !== '' && Number(r.first_cat) > 20) return `1st CAT cannot exceed 20 for ${r.student_name}`
      if (r.second_cat !== '' && Number(r.second_cat) > 20) return `2nd CAT cannot exceed 20 for ${r.student_name}`
      if (visibleFields.includes('exam') && r.exam !== '' && Number(r.exam) > 60) return `Exam cannot exceed 60 for ${r.student_name}`
    }
    return null
  }

  async function handleSave(submitFinal: boolean) {
    if (isFinal) return

    const validationError = validateResults()
    if (validationError) {
      alert(validationError)
      return
    }

    if (submitFinal) {
      for (const r of results) {
        if (visibleFields.includes('first_cat') && r.first_cat === '') return alert(`Missing 1st CAT score for ${r.student_name}`)
        if (visibleFields.includes('second_cat') && r.second_cat === '') return alert(`Missing 2nd CAT score for ${r.student_name}`)
        if (visibleFields.includes('exam') && r.exam === '') return alert(`Missing Exam score for ${r.student_name}`)
      }
      
      const confirm = window.confirm("Results cannot be modified after submission. Are you sure?")
      if (!confirm) return
    }

    setIsLoading(true)
    try {
      const upsertData = results.map(r => ({
        student_id: r.student_id,
        class_id: Number(selectedClass),
        subject_id: Number(selectedSubject),
        term_id: Number(selectedTerm),
        sub_term_id: Number(selectedSubTerm),
        first_cat: r.first_cat === '' ? null : Number(r.first_cat),
        second_cat: r.second_cat === '' ? null : Number(r.second_cat),
        exam: r.exam === '' ? null : Number(r.exam),
        status: 'draft',
        created_by: userId
      }))

      const { error } = await supabase
        .from('term_results')
        .upsert(upsertData, { 
          onConflict: 'student_id, class_id, subject_id, term_id, sub_term_id'
        })

      if (error) throw error

      if (submitFinal) {
        const { error: rpcError } = await supabase.rpc('submit_final_term_results', {
          p_class_id: Number(selectedClass),
          p_subject_id: Number(selectedSubject),
          p_term_id: Number(selectedTerm),
          p_sub_term_id: Number(selectedSubTerm)
        })

        if (rpcError) throw rpcError
        setIsFinal(true)
      }

      showToast(submitFinal ? 'Final Results Submitted!' : 'Draft Saved Successfully.')
    } catch (err: any) {
      alert("System Error: " + err.message)
    }
    setIsLoading(false)
  }

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4000)
  }

  if (initLoading) {
    return <div className="p-5 text-center"><i className="fas fa-spinner fa-spin fa-2x text-muted"></i></div>
  }

  if (globalError) {
    return <div className="alert alert-danger m-4">{globalError}</div>
  }

  return (
    <div style={{ paddingBottom: '100px' }}>
      
      {/* FILTER CARD */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '8px', overflow: 'hidden' }}>
        <div className="card-header bg-success text-white py-3 fw-bold border-0">
          <i className="fas fa-file-medical me-2"></i> Make Term Result For {sessionLabel} Session
        </div>
        <div className="card-body p-4 bg-white">
          <div className="row mb-3">
            <div className="col-md-3 text-md-end text-muted fw-bold pt-2">Term</div>
            <div className="col-md-6">
              <select className="form-select" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
                <option value="">Select Term...</option>
                {terms.map((t: any) => <option key={t.id} value={t.id}>{t.label || t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-3 text-md-end text-muted fw-bold pt-2">Sub-Term</div>
            <div className="col-md-6">
              <select className="form-select" value={selectedSubTerm} onChange={e => setSelectedSubTerm(e.target.value)} disabled={!selectedTerm}>
                <option value="">Select Sub-Term...</option>
                {subTerms.filter((s: any) => String(s.term_id) === String(selectedTerm)).map((s: any) => <option key={s.id} value={s.id}>{s.label || s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-3 text-md-end text-muted fw-bold pt-2">Class</div>
            <div className="col-md-6">
              <select className="form-select" value={selectedClass} onChange={e => {setSelectedClass(e.target.value); setSelectedSubject('')}} disabled={!selectedSubTerm}>
                <option value="">Select Class...</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-3 text-md-end text-muted fw-bold pt-2">Subject</div>
            <div className="col-md-6">
              <select className="form-select" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!selectedClass}>
                <option value="">Select Subject...</option>
                {subjectsByClass[selectedClass]?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* RESULTS GRID CARD */}
      {isFormComplete && (
        <div className="card shadow-sm border-0" style={{ borderRadius: '8px', overflow: 'hidden' }}>
          <div className="card-header bg-success text-white py-3 fw-bold border-0 d-flex justify-content-between align-items-center">
            <span><i className="fas fa-list-ol me-2"></i> Enter the scores for {subjectLabel} below</span>
            {!isFinal && (
               <button className="btn btn-sm btn-danger fw-bold" onClick={handleImportCBT} disabled={isLoading}>
                 <i className="fas fa-download me-1"></i> Import From CBT
               </button>
            )}
          </div>
          
          <div className="card-body p-0 bg-white">
            <div className="bg-danger text-white text-center py-2 px-3 fw-bold" style={{ fontSize: '0.85rem' }}>
               *Please verify results before clicking on 'Submit Final' Button. Results cannot be modified afterwards.
            </div>

            {isLoading && results.length === 0 ? (
              <div className="text-center p-5"><i className="fas fa-spinner fa-spin fa-2x text-muted"></i></div>
            ) : (
              <div className="table-responsive p-3">
                <table className="table table-bordered table-hover align-middle">
                  <thead className="table-light text-muted" style={{ fontSize: '0.85rem' }}>
                    <tr>
                      <th style={{ width: '60px' }}>SN</th>
                      <th>Student Name</th>
                      {visibleFields.includes('first_cat') && <th>1ST CAT(20)</th>}
                      {visibleFields.includes('second_cat') && <th>2ND CAT(20)</th>}
                      {visibleFields.includes('exam') && <th>EXAM(60)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {results.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-4 text-muted">No data available in table</td></tr>
                    ) : (
                      results.map((r, idx) => (
                        <tr key={r.student_id}>
                          <td>{idx + 1}</td>
                          <td className="fw-bold text-dark">{r.student_name}</td>
                          {visibleFields.includes('first_cat') && (
                            <td>
                              <input type="number" max="20" min="0" className={`form-control form-control-sm ${r.first_cat !== '' && Number(r.first_cat) > 20 ? 'is-invalid' : ''}`} value={r.first_cat} onChange={e => handleScoreChange(r.student_id, 'first_cat', e.target.value)} disabled={isFinal} />
                            </td>
                          )}
                          {visibleFields.includes('second_cat') && (
                            <td>
                              <input type="number" max="20" min="0" className={`form-control form-control-sm ${r.second_cat !== '' && Number(r.second_cat) > 20 ? 'is-invalid' : ''}`} value={r.second_cat} onChange={e => handleScoreChange(r.student_id, 'second_cat', e.target.value)} disabled={isFinal} />
                            </td>
                          )}
                          {visibleFields.includes('exam') && (
                            <td>
                              <input type="number" max="60" min="0" className={`form-control form-control-sm ${r.exam !== '' && Number(r.exam) > 60 ? 'is-invalid' : ''}`} value={r.exam} onChange={e => handleScoreChange(r.student_id, 'exam', e.target.value)} disabled={isFinal} />
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {results.length > 0 && !isFinal && (
                  <div className="d-flex justify-content-end gap-2 mt-4 border-top pt-3">
                    <button className="btn btn-outline-primary" onClick={() => handleSave(false)} disabled={isLoading}>
                      <i className="fas fa-save me-1"></i> Save Result
                    </button>
                    <button className="btn btn-danger" onClick={() => handleSave(true)} disabled={isLoading}>
                      <i className="fas fa-check-circle me-1"></i> Submit Final
                    </button>
                  </div>
                )}
                {isFinal && (
                  <div className="mt-4 border-top pt-3 text-end text-success fw-bold">
                    <i className="fas fa-lock me-1"></i> Results are locked and submitted.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOAST MESSAGE FLOATER */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, background: '#333', color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toastMessage}
        </div>
      )}

    </div>
  )
}
