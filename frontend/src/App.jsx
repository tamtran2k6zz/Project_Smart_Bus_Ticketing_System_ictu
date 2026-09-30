import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NetworkStatusProvider } from './contexts/NetworkStatusContext';
import AppRoutes from './routes/AppRoutes';

export const App = () => {
  return (
    <BrowserRouter>
      <NetworkStatusProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </NetworkStatusProvider>
    </BrowserRouter>
  );
};

export default App;
