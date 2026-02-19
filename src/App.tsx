// App.tsx
import './App.scss';
import Landing from './Pages/landing';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'animate.css';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import NavPage from './Pages/navPage';
import { useTheme } from './ThemeContext';
import PageTransition from './components/PageTransition';

function App() {
  const { theme } = useTheme() ?? { theme: 'light' };
  const location = useLocation();

  return (
    <div className={`App ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <AnimatePresence exitBeforeEnter>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
          <Route path="/nav" element={<PageTransition><NavPage /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;