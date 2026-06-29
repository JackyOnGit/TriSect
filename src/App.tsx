import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateTrip from './pages/CreateTrip';
import AddExpense from './pages/AddExpense';
import TripDetail from './pages/TripDetail';
import EditTrip from './pages/EditTrip';
import EditExpense from './pages/EditExpense';
import NotFound from './pages/NotFound';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trip/new"
            element={
              <ProtectedRoute>
                <CreateTrip />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trip/:tripId"
            element={
              <ProtectedRoute>
                <TripDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trip/:tripId/edit"
            element={
              <ProtectedRoute>
                <EditTrip />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trip/:tripId/expense/new"
            element={
              <ProtectedRoute>
<<<<<<< HEAD
                <div className="min-h-screen flex items-center justify-center">Coming Soon</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trip/:tripId/expense/:expenseId/edit"
            element={
              <ProtectedRoute>
                <EditExpense />
=======
                <AddExpense />
>>>>>>> feature/add-expense
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;