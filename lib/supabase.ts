// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vezjqrtbicwwcxyssmop.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlempxcnRiaWN3d2N4eXNzbW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODcwNTQsImV4cCI6MjA5NzM2MzA1NH0.oy6tD0uusXIxUJR-1hnd631ZQwIOLiAugQJV2DCklRE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
// ... (mantenha os imports e a criação do client supabase) ...

// Tipos para o perfil
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  user_type: 'normal' | 'company'; // Apenas 2 tipos agora
  skills: string[] | null;
  is_available_now: boolean;
  trust_score: number;
  level: string;
  completed_jobs: number;
  created_at: string;
  updated_at: string;
}
// ... (mantenha o código do supabase client e a interface Profile) ...

export interface Task {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  location_name?: string;   // <-- ADICIONADO
  budget: number;
  status: string;
  latitude?: number;        // <-- ADICIONADO
  longitude?: number;       // <-- ADICIONADO
  created_at: string;
  is_recurring: boolean;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'none';
  recurrence_end_date: string | null;
  parent_task_id: string | null;
  updated_at: string;
  recurrence_interval?: 'daily' | 'weekly' | 'monthly' | null;
  end_date?: string | null;
  next_occurrence_date?: string | null;
}
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}
export interface Proposal {
  id: string;
  task_id: string;
  worker_id: string;
  price: number;
  deadline_days: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  // Dados do trabalhador (vêm do join com profiles)
  worker?: {
    full_name: string | null;
    company_name: string | null;
    avatar_url: string | null;
    trust_score: number;
    level: string;
    user_type: 'normal' | 'company';
  };
}
export interface Message {
  id: string;
  proposal_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender?: {
    full_name: string | null;
    company_name: string | null;
    avatar_url: string | null;
    user_type: 'normal' | 'company';
  };
}
export interface Review {
  id: string;
  task_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: {
    full_name: string | null;
    company_name: string | null;
    avatar_url: string | null;
    user_type: 'normal' | 'company';
  };
}
export interface Contract {
  id: string;
  employer_id: string;
  worker_id: string;
  job_title: string;
  description: string | null;
  monthly_salary: number;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'terminated' | 'completed';
  working_hours: string | null;
  created_at: string;
  updated_at: string;
  worker?: {
    full_name: string | null;
    company_name: string | null;
    avatar_url: string | null;
    trust_score: number;
    level: string;
    user_type: 'normal' | 'company';
  };
  employer?: {
    full_name: string | null;
    company_name: string | null;
    avatar_url: string | null;
    user_type: 'normal' | 'company';
  };
}
export interface JobVacancy {
  id: string;
  employer_id: string;
  title: string;
  description: string;
  requirements: string[] | null;
  benefits: string[] | null;
  job_type: 'full_time' | 'part_time' | 'contract' | 'temporary';
  salary_min: number | null;
  salary_max: number | null;
  location: string;
  is_remote: boolean;
  experience_level: 'junior' | 'mid' | 'senior' | 'any';
  status: 'open' | 'closed' | 'cancelled';
  deadline: string | null;
  vacancies_count: number;
  created_at: string;
  updated_at: string;
  employer?: {
    full_name: string | null;
    company_name: string | null;
    avatar_url: string | null;
    user_type: 'normal' | 'company';
  };
  applications_count?: number;
}

export interface JobApplication {
  id: string;
  vacancy_id: string;
  candidate_id: string;
  cover_letter: string | null;
  expected_salary: number | null;
  availability: string | null;
  status: 'pending' | 'reviewed' | 'interview' | 'approved' | 'rejected' | 'withdrawn';
  rejection_reason: string | null;
  rating: number | null;
  notes: string | null;
  applied_at: string;
  updated_at: string;
  candidate?: {
    full_name: string | null;
    company_name: string | null;
    avatar_url: string | null;
    trust_score: number;
    level: string;
    user_type: 'normal' | 'company';
    bio: string | null;
    skills: string[] | null;
    location: string | null;
  };
  documents?: JobDocument[];
}

export interface JobDocument {
  id: string;
  application_id: string;
  document_type: 'cv' | 'certificate' | 'portfolio' | 'id' | 'other';
  file_name: string;
  file_url: string;
  file_size: number | null;
  uploaded_at: string;
}

export interface JobInterview {
  id: string;
  application_id: string;
  interview_type: 'online' | 'in_person';
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_link: string | null;
  interviewers: string[] | null;
  questions: string[] | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  created_at: string;
}

export interface InterviewEvaluation {
  id: string;
  interview_id: string;
  evaluator_id: string;
  technical_score: number;
  communication_score: number;
  culture_fit_score: number;
  overall_score: number;
  strengths: string | null;
  weaknesses: string | null;
  recommendation: 'hire' | 'no_hire' | 'maybe';
  comments: string | null;
  created_at: string;
}