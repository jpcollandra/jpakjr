// Sidebar.tsx
import React from 'react';
import { BsFillPersonFill, BsStack } from 'react-icons/bs';
import { RiPagesFill, RiContactsBookFill } from 'react-icons/ri';
import { FaCalendarAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

type SidebarProps = {
  isVisible: boolean;
  changeVisible: (component: 'home' | 'stack' | 'about' | 'contact') => void;
};

const Sidebar: React.FC<SidebarProps> = ({ isVisible, changeVisible }) => {
  const navigate = useNavigate();
  const sidebarClass = isVisible ? 'sidebar visible' : 'sidebar';

  return (
    <nav id="portfolio-navigation" className={sidebarClass} aria-label="Portfolio navigation" aria-hidden={!isVisible}>
      <button tabIndex={isVisible ? 0 : -1} onClick={() => changeVisible('home')}>
        <BsFillPersonFill className="icon" /> <span>Home</span>
      </button>
      <button tabIndex={isVisible ? 0 : -1} onClick={() => changeVisible('stack')}>
        <BsStack className="icon" /> <span>Projects</span>
      </button>
      <button tabIndex={isVisible ? 0 : -1} onClick={() => changeVisible('about')}>
        <RiPagesFill className="icon" /> <span>About</span>
      </button>
      <button tabIndex={isVisible ? 0 : -1} onClick={() => changeVisible('contact')}>
        <RiContactsBookFill className="icon" /> <span>Contact</span>
      </button>
      <button
        className="sidebar-schedule-button"
        tabIndex={isVisible ? 0 : -1}
        onClick={() => navigate('/calendar')}
      >
        <FaCalendarAlt className="icon" /> <span>Schedule a meeting</span>
      </button>
    </nav>
  );
};

export default Sidebar;
