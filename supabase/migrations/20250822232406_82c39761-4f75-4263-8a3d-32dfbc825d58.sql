-- Create a function to get user email by username
CREATE OR REPLACE FUNCTION get_user_email_by_username(username_input text)
RETURNS TABLE(email text) AS $$
BEGIN
  RETURN QUERY
  SELECT u.email::text
  FROM auth.users u
  WHERE u.raw_user_meta_data->>'username' = username_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_email_by_username(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_email_by_username(text) TO anon;