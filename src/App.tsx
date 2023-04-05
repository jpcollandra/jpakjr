// App.tsx
import './App.scss';
import Landing from './Pages/landing';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'animate.css';
import { Routes, Route } from 'react-router-dom';
import NavPage from './Pages/navPage';
import { useTheme } from './ThemeContext';

function App() {
  const { theme } = useTheme() ?? { theme: 'light' };

  return (
    <div className={`App ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/nav" element={<NavPage />} />
      </Routes>
    </div>
  );
}

export default App;