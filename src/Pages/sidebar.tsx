// Sidebar.tsx
import React from 'react';
import { BsFillPersonFill, BsStack } from 'react-icons/bs';
import { RiPagesFill, RiContactsBookFill } from 'react-icons/ri';

type SidebarProps = {
  isVisible: boolean;
  changeVisible: (component: 'home' | 'stack' | 'about' | 'contact') => void;
};

const Sidebar: React.FC<SidebarProps> = ({ isVisible, changeVisible }) => {
  const sidebarClass = isVisible ? 'sidebar visible' : 'sidebar';

  return (
    <div className={sidebarClass}>
      <button onClick={() => changeVisible('home')}>
        <BsFillPersonFill className="icon" /> <span>Home</span>
      </button>
      <button onClick={() => changeVisible('stack')}>
        <BsStack className="icon" /> <span>Stack</span>
      </button>
      <button onClick={() => changeVisible('about')}>
        <RiPagesFill className="icon" /> <span>About</span>
      </button>
      <button onClick={() => changeVisible('contact')}>
        <RiContactsBookFill className="icon" /> <span>Contact</span>
      </button>
    </div>
  );
};

export default Sidebar;
