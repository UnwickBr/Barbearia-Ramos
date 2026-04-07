import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import Agendamentos from "./pages/Agendamentos.tsx";
import AdminAgendamentos from "./pages/AdminAgendamentos.tsx";
import ColaboradorAgendamentos from "./pages/ColaboradorAgendamentos.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <NotificationsBell />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/agendamentos" element={<Agendamentos />} />
            <Route path="/admin/agendamentos" element={<AdminAgendamentos />} />
            <Route path="/colaborador/agendamentos" element={<ColaboradorAgendamentos />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
