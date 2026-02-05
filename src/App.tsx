import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrdersProvider } from "@/contexts/OrdersContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import CreateOrder from "./pages/CreateOrder";
import OrderDetails from "./pages/OrderDetails";
import TreatmentSteps from "./pages/TreatmentSteps";
import Statistics from "./pages/Statistics";
import ProductionScreen from "./pages/ProductionScreen";
import PriceList from "./pages/PriceList";
import Documents from "./pages/Documents";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";

const App = () => {
  // Initialize QueryClient with stable reference - disable refetch on window focus
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 30000,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <AuthProvider>
            <OrdersProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/create" element={<ProtectedRoute><CreateOrder /></ProtectedRoute>} />
                <Route path="/order/:id" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
                <Route path="/steps" element={<ProtectedRoute><TreatmentSteps /></ProtectedRoute>} />
                <Route path="/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
                <Route path="/production" element={<ProtectedRoute><ProductionScreen /></ProtectedRoute>} />
                <Route path="/prices" element={<ProtectedRoute><PriceList /></ProtectedRoute>} />
                <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </OrdersProvider>
          </AuthProvider>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
