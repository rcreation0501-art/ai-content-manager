import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminPanel() {
  const { userRole, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (userRole !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <p>You are an admin. 🎉</p>
    </div>
  );
}
