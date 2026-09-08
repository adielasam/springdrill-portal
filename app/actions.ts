'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/?error=' + encodeURIComponent(error.message))
  }

  // 2. Fetch User Profile to determine role
  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('role')
    .eq('id', authData.user.id)
    .single()

  if (profileErr || !profile) {
    redirect('/?error=' + encodeURIComponent('Could not verify account role.'))
  }

  // 3. Route to Correct Legacy Dashboard
  if (profile.role === 'admin') {
    redirect('/admin_dashboard')
  } else if (profile.role === 'teacher') {
    redirect('/teacher_dashboard')
  } else if (profile.role === 'student') {
    redirect('/student_dashboard')
  } else {
    redirect('/?error=' + encodeURIComponent('Invalid role assigned to this account.'))
  }
}
