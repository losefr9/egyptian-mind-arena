import { Component, ReactNode } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from './contexts/LanguageContext';
import { MainLayout } from './components/layout/MainLayout';
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Games from "./pages/Games";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Admin from "./pages/Admin";
import Referral from "./pages/Referral";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('React Error Boundary caught:', error);
    if (error.message.includes('useRef') || error.message.includes('TooltipProvider')) {
      setTimeout(() => window.location.reload(), 100);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-foreground">حدث خطأ</h1>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark">
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Toaster />
            <MainLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/games" element={<Games />} />
              <Route path="/deposit" element={<Deposit />} />
              <Route path="/withdraw" element={<Withdraw />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/referral" element={<Referral />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
