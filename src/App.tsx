import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import CreatePost from "@/pages/CreatePost";
import LeadMagnet from "@/pages/LeadMagnet";
import PostLibrary from "@/pages/PostLibrary";
import ContentCalendar from "@/pages/ContentCalendar";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* PROTECTED */}
      <Route path="/" element={<Layout><Index /></Layout>} />
      <Route path="/create-post" element={<Layout><CreatePost /></Layout>} />
      <Route path="/lead-magnet" element={<Layout><LeadMagnet /></Layout>} />
      <Route path="/post-library" element={<Layout><PostLibrary /></Layout>} />
      <Route path="/content-calendar" element={<Layout><ContentCalendar /></Layout>} />
      <Route path="/admin" element={<Layout><AdminPanel /></Layout>} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}