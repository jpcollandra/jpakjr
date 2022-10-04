import React from 'react';
import './App.scss';
import Landing from './Pages/landing';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'animate.css';
import { Routes, Route } from "react-router-dom"
import NavPage from './Pages/navPage';

function App() {
  return (
    <div className="App">
      <Routes>
      <Route path="/" element={<Landing/>} />
      <Route path="/nav" element={<NavPage/>} />
      </Routes>
    </div>
  );
}

export default App;
