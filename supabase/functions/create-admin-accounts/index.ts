import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // إنشاء عميل Supabase مع service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('Starting admin accounts creation...');

    // إنشاء حساب admin1
    const { data: admin1, error: error1 } = await supabaseAdmin.auth.admin.createUser({
      email: '9bo5om9@gmail.com',
      password: 'Hms1hms2hms3',
      user_metadata: {
        username: 'admin1'
      },
      email_confirm: true
    });

    if (error1) {
      console.error('Error creating admin1:', error1);
    } else {
      console.log('Admin1 created successfully:', admin1.user?.id);
    }

    // إنشاء حساب admin2
    const { data: admin2, error: error2 } = await supabaseAdmin.auth.admin.createUser({
      email: 'totolosefr@gmail.com',
      password: 'Hms1hms2hms3',
      user_metadata: {
        username: 'admin2'
      },
      email_confirm: true
    });

    if (error2) {
      console.error('Error creating admin2:', error2);
    } else {
      console.log('Admin2 created successfully:', admin2.user?.id);
    }

    // التحقق من الحسابات المنشأة
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    console.log('Total auth users:', authUsers?.users?.length);

    return new Response(JSON.stringify({
      success: true,
      message: 'Admin accounts creation process completed',
      admin1: admin1?.user ? 'Created' : 'Error: ' + error1?.message,
      admin2: admin2?.user ? 'Created' : 'Error: ' + error2?.message,
      totalAuthUsers: authUsers?.users?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-admin-accounts:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to create admin accounts'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});