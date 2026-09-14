'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jmxyopohngslqvzknjnt.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yGvqUxGlwiJuSkFN4VOpWw_nKYmo-vl'
const supabase = createClient(supabaseUrl, supabaseKey)

const STATIC_TERMS = ['First Term', 'Second Term', 'Third Term']
const STATIC_SUB_TERMS = ['Half Term', 'Full Term']

const subTermFieldsConfig: Record<string, string[]> = {
  'Half Term': ['first_cat', 'second_cat'],
  'Full Term': ['first_cat', 'second_cat', 'exam']
}

export default function ReportClient() {
  const [initLoading, setInitLoading] = useState(true)
  const [globalError, setGlobalError] = useState<string | null>(null)
  
  const [sessions, setSessions] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, any[]>>({})
  const [userId, setUserId] = useState<string | null>(null)

  const [selectedSession, setSelectedSession] = useState('')
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

      const { data: sessionData, error: sessionError } = await supabase.from('sessions').select('*')
      if (sessionError || !sessionData || sessionData.length === 0) {
        setGlobalError('No sessions found in the database. Please create a session first.')
        setInitLoading(false)
        return
      }
      setSessions(sessionData)

      // Fetch all classes directly
      const { data: classData } = await supabase.from('classes').select('id, name').order('id', { ascending: true })
      setClasses(classData || [])

      // Fetch all subjects directly
      const { data: subjectData } = await supabase.from('subjects').select('id, name').order('name', { ascending: true })
      // For backwards compatibility with the UI state structure which expects subjectsByClass
      // Since they are now global, we can just assign the same full list to every class
      const subMap: Record<string, any[]> = {}
      classData?.forEach((c: any) => {
        subMap[c.id] = subjectData || []
      })
      setSubjectsByClass(subMap)

    } catch (err: any) {
      setGlobalError(err.message)
    }
    setInitLoading(false)
  }

  const sessionObj = sessions.find((s: any) => String(s.id) === String(selectedSession))
  const sessionLabel = sessionObj ? (sessionObj.label || sessionObj.name) : '...'
  const subjectObj = subjectsByClass[selectedClass]?.find((s: any) => String(s.id) === String(selectedSubject))
  const subjectLabel = subjectObj ? subjectObj.name : ''

  const visibleFields = subTermFieldsConfig[selectedSubTerm] || ['first_cat', 'second_cat', 'exam']
  const isFormComplete = selectedSession && selectedTerm && selectedSubTerm && selectedClass && selectedSubject

  useEffect(() => {
    if (isFormComplete) {
      loadGrid()
    } else {
      setResults([])
      setIsFinal(false)
    }
  }, [selectedSession, selectedTerm, selectedSubTerm, selectedClass, selectedSubject])

  async function loadGrid() {
    setIsLoading(true)
    try {
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', selectedClass)
        .order('surname', { ascending: true })

      if (studentError) throw studentError

      const { data: termResults, error: resultsError } = await supabase
        .from('term_results')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)
        .eq('term', selectedTerm)
        .eq('sub_term', selectedSubTerm)

      if (resultsError) throw resultsError

      const merged = students?.map((student: any) => {
        // Handle both possible ID fields depending on schema
        const studId = student.id || student.user_id;
        // Construct full name from legacy columns
        const studName = student.name || `${student.surname || ''} ${student.first_name || ''}`.trim() || 'Unknown Student';
        
        const existing = termResults?.find((r: any) => r.student_id === studId)
        
        return {
          student_id: studId,
          student_name: studName,
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
        .eq('term', selectedTerm)
        .eq('sub_term', selectedSubTerm)
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
    setResults(prev => prev.map(r => r.student_id === studentId ? { ...r, [field]: val } : r))
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
    if (validationError) return alert(validationError)

    if (submitFinal) {
      for (const r of results) {
        if (visibleFields.includes('first_cat') && r.first_cat === '') return alert(`Missing 1st CAT score for ${r.student_name}`)
        if (visibleFields.includes('second_cat') && r.second_cat === '') return alert(`Missing 2nd CAT score for ${r.student_name}`)
        if (visibleFields.includes('exam') && r.exam === '') return alert(`Missing Exam score for ${r.student_name}`)
      }
      if (!window.confirm("Results cannot be modified after submission. Are you sure?")) return
    }

    setIsLoading(true)
    try {
      const upsertData = results.map(r => ({
        student_id: r.student_id,
        class_id: Number(selectedClass),
        subject_id: Number(selectedSubject),
        term: selectedTerm,
        sub_term: selectedSubTerm,
        first_cat: r.first_cat === '' ? null : Number(r.first_cat),
        second_cat: r.second_cat === '' ? null : Number(r.second_cat),
        exam: r.exam === '' ? null : Number(r.exam),
        status: 'draft',
        created_by: userId
      }))

      const { error } = await supabase
        .from('term_results')
        .upsert(upsertData, { 
          onConflict: 'student_id, class_id, subject_id, term, sub_term'
        })

      if (error) throw error

      if (submitFinal) {
        const { error: rpcError } = await supabase.rpc('submit_final_term_results', {
          p_class_id: Number(selectedClass),
          p_subject_id: Number(selectedSubject),
          p_term: selectedTerm,
          p_sub_term: selectedSubTerm
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

  if (initLoading) return <div className="p-5 text-center"><i className="fas fa-spinner fa-spin fa-2x text-muted"></i></div>
  if (globalError) return <div className="alert alert-danger m-4">{globalError}</div>

  return (
    <div style={{ paddingBottom: '100px' }}>
      
      {/* MODERN FILTER CARD */}
      <div className="card shadow border-0 mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div className="card-header bg-success text-white py-3 fw-bold border-0 d-flex align-items-center">
          <i className="fas fa-filter me-2 opacity-75"></i> 
          <span>Make Term Result For <span className="badge bg-white text-success ms-2">{sessionLabel}</span></span>
        </div>
        <div className="card-body p-4 bg-white">
          <div className="row g-4">
            
            <div className="col-md-4">
              <label className="form-label text-muted fw-bold small text-uppercase">Session</label>
              <div className="input-group input-group-lg shadow-sm" style={{ borderRadius: '8px' }}>
                <span className="input-group-text bg-light border-end-0"><i className="fas fa-calendar-alt text-success"></i></span>
                <select className="form-select border-start-0 ps-0" style={{ backgroundColor: '#f8f9fa' }} value={selectedSession} onChange={e => {setSelectedSession(e.target.value); setSelectedTerm(''); setSelectedSubTerm('')}}>
                  <option value="">Select Session...</option>
                  {sessions.map((s: any) => <option key={s.id} value={s.id}>{s.label || s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="col-md-4">
              <label className="form-label text-muted fw-bold small text-uppercase">Term</label>
              <div className="input-group input-group-lg shadow-sm" style={{ borderRadius: '8px' }}>
                <span className="input-group-text bg-light border-end-0"><i className="fas fa-layer-group text-success"></i></span>
                <select className="form-select border-start-0 ps-0" style={{ backgroundColor: '#f8f9fa' }} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} disabled={!selectedSession}>
                  <option value="">Select Term...</option>
                  {STATIC_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="col-md-4">
              <label className="form-label text-muted fw-bold small text-uppercase">Sub-Term</label>
              <div className="input-group input-group-lg shadow-sm" style={{ borderRadius: '8px' }}>
                <span className="input-group-text bg-light border-end-0"><i className="fas fa-columns text-success"></i></span>
                <select className="form-select border-start-0 ps-0" style={{ backgroundColor: '#f8f9fa' }} value={selectedSubTerm} onChange={e => setSelectedSubTerm(e.target.value)} disabled={!selectedTerm}>
                  <option value="">Select Sub-Term...</option>
                  {STATIC_SUB_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label text-muted fw-bold small text-uppercase">Class</label>
              <div className="input-group input-group-lg shadow-sm" style={{ borderRadius: '8px' }}>
                <span className="input-group-text bg-light border-end-0"><i className="fas fa-users text-success"></i></span>
                <select className="form-select border-start-0 ps-0" style={{ backgroundColor: '#f8f9fa' }} value={selectedClass} onChange={e => {setSelectedClass(e.target.value); setSelectedSubject('')}} disabled={!selectedSubTerm}>
                  <option value="">Select Class...</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label text-muted fw-bold small text-uppercase">Subject</label>
              <div className="input-group input-group-lg shadow-sm" style={{ borderRadius: '8px' }}>
                <span className="input-group-text bg-light border-end-0"><i className="fas fa-book text-success"></i></span>
                <select className="form-select border-start-0 ps-0" style={{ backgroundColor: '#f8f9fa' }} value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!selectedClass}>
                  <option value="">Select Subject...</option>
                  {subjectsByClass[selectedClass]?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* RESULTS GRID CARD */}
      {isFormComplete && (
        <div className="card shadow border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <div className="card-header bg-success text-white py-3 fw-bold border-0 d-flex justify-content-between align-items-center">
            <span><i className="fas fa-list-ol me-2"></i> Enter the scores for {subjectLabel} below</span>
            {!isFinal && (
               <button className="btn btn-sm btn-light text-success fw-bold px-3 shadow-sm rounded-pill" onClick={handleImportCBT} disabled={isLoading}>
                 <i className="fas fa-download me-1"></i> Import From CBT
               </button>
            )}
          </div>
          
          <div className="card-body p-0 bg-white">
            <div className="bg-warning text-dark text-center py-2 px-3 fw-bold" style={{ fontSize: '0.85rem' }}>
               <i className="fas fa-exclamation-triangle me-2"></i>Please verify results before clicking on 'Submit Final'. Results cannot be modified afterwards.
            </div>

            {isLoading && results.length === 0 ? (
              <div className="text-center p-5"><i className="fas fa-spinner fa-spin fa-3x text-success"></i></div>
            ) : (
              <div className="table-responsive p-4">
                <table className="table table-bordered table-hover align-middle shadow-sm">
                  <thead className="table-success text-dark text-center" style={{ fontSize: '0.9rem', letterSpacing: '0.5px' }}>
                    <tr>
                      <th style={{ width: '60px' }}>SN</th>
                      <th className="text-start">STUDENT NAME</th>
                      {visibleFields.includes('first_cat') && <th>1ST CAT (20)</th>}
                      {visibleFields.includes('second_cat') && <th>2ND CAT (20)</th>}
                      {visibleFields.includes('exam') && <th>EXAM (60)</th>}
                      <th className="text-primary">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-5 text-muted"><i className="fas fa-inbox fa-3x mb-3 opacity-25 d-block"></i>No data available in table</td></tr>
                    ) : (
                      results.map((r, idx) => (
                        <tr key={r.student_id}>
                          <td className="text-center fw-bold text-muted">{idx + 1}</td>
                          <td className="fw-bold text-dark">{r.student_name}</td>
                          {visibleFields.includes('first_cat') && (
                            <td>
                              <input type="number" max="20" min="0" className={`form-control form-control-sm text-center fw-bold ${r.first_cat !== '' && Number(r.first_cat) > 20 ? 'is-invalid' : ''}`} value={r.first_cat} onChange={e => handleScoreChange(r.student_id, 'first_cat', e.target.value)} disabled={isFinal} />
                            </td>
                          )}
                          {visibleFields.includes('second_cat') && (
                            <td>
                              <input type="number" max="20" min="0" className={`form-control form-control-sm text-center fw-bold ${r.second_cat !== '' && Number(r.second_cat) > 20 ? 'is-invalid' : ''}`} value={r.second_cat} onChange={e => handleScoreChange(r.student_id, 'second_cat', e.target.value)} disabled={isFinal} />
                            </td>
                          )}
                          {visibleFields.includes('exam') && (
                            <td>
                              <input type="number" max="60" min="0" className={`form-control form-control-sm text-center fw-bold ${r.exam !== '' && Number(r.exam) > 60 ? 'is-invalid' : ''}`} value={r.exam} onChange={e => handleScoreChange(r.student_id, 'exam', e.target.value)} disabled={isFinal} />
                            </td>
                          )}
                          <td className="text-center fw-bold text-primary fs-5 bg-light">
                            {(Number(r.first_cat || 0) + Number(r.second_cat || 0) + Number(r.exam || 0))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {results.length > 0 && !isFinal && (
                  <div className="d-flex justify-content-end gap-3 mt-4 pt-3">
                    <button className="btn btn-outline-success px-4 py-2 rounded-pill fw-bold" onClick={() => handleSave(false)} disabled={isLoading}>
                      <i className="fas fa-save me-2"></i> Save Draft
                    </button>
                    <button className="btn btn-success px-4 py-2 rounded-pill fw-bold shadow-sm" onClick={() => handleSave(true)} disabled={isLoading}>
                      <i className="fas fa-paper-plane me-2"></i> Submit Final
                    </button>
                  </div>
                )}
                {isFinal && (
                  <div className="mt-4 border-top pt-3 text-center text-success fw-bold fs-5">
                    <i className="fas fa-lock me-2 text-warning"></i> Results are locked and submitted.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOAST MESSAGE FLOATER */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, background: '#198754', color: 'white', padding: '15px 25px', borderRadius: '50px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', fontWeight: 'bold' }}>
          <i className="fas fa-info-circle me-2"></i>{toastMessage}
        </div>
      )}

    </div>
  )
}
