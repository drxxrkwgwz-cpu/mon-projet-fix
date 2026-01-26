import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

const SUPABASE_URL = 'https://hlxveuwdqigqpctunhzl.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_O6SSrgQBPAOqxY4YOYtS-w_Pam0Bbkk'

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)
