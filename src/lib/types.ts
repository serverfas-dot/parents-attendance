export interface KeyStage {
  id: string;
  name: string;
  created_at: string;
}

export interface Grade {
  id: string;
  name: string;
  key_stage_id: string;
  created_at: string;
  key_stages?: KeyStage;
}

export interface Parent {
  id: string;
  student_id: string;
  name: string;
  type: 'mother' | 'father' | 'guardian';
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  grade_id: string;
  created_at: string;
  parents?: Parent[];
  grades?: Grade;
}

export interface Attendance {
  id: string;
  student_id: string;
  grade_id: string;
  mother_attended: boolean;
  father_attended: boolean;
  guardian_name: string | null;
  guardian_attended: boolean;
  attendee_name: string | null;
  attendance_date: string;
  created_at: string;
}

export interface AttendanceWithDetails extends Attendance {
  student_name: string;
  grade_name: string;
  key_stage_id: string | null;
  key_stage_name: string | null;
}

export interface FormSettings {
  id: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  manual_override: boolean;
  updated_at: string;
}
