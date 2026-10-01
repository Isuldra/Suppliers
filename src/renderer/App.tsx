import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Workspace from './workspace/Workspace';
import Dashboard from './components/Dashboard';

export default function App() {
  return (
    <HashRouter>
      <Toaster position="bottom-center" />
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Workspace />} />
      </Routes>
    </HashRouter>
  );
}
