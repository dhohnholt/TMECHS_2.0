// Update the checkUserRole function to use teachers table instead of auth.users
const checkUserRole = async (userId: string) => {
  try {
    const { data: userData, error } = await supabase
      .from("teachers")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) throw error;

    setUserRole(userData.role);
    setIsAdmin(userData.role === "admin");
  } catch (error) {
    console.error("Error checking user role:", error);
    setUserRole("");
    setIsAdmin(false);
  }
};
