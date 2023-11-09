// navPage.tsx
import React, { useState, useEffect } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { FaHamburger } from "react-icons/fa";
import { BsFillPersonFill, BsStack } from "react-icons/bs";
import { RiPagesFill, RiContactsBookFill, RiLightbulbFlashFill, RiLightbulbFlashLine } from "react-icons/ri";
import "../App.scss";
import AboutMe from "./aboutMe";
import Projects from "./projects";
import Resume from "./resume";
import Contact from "./contact";
import { useTheme } from "../ThemeContext";
import Sidebar from "./sidebar";

type VisibleComponent = "home" | "stack" | "about" | "contact";

export default function NavPage() {
  const [visible, setVisible] = useState<VisibleComponent>("home");
  const themeContext = useTheme();

  if (!themeContext) {
    console.error('ThemeContext not available');
    return null; // or your fallback UI here
  }

  const { theme, toggleTheme } = themeContext;
  
  const [isDark, updateIsDark] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      updateIsDark(true);
      document.documentElement.classList.add('dark-theme');
    } else {
      updateIsDark(false);
      document.documentElement.classList.remove('dark-theme');
    }

    // Handle window resize
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);

    // Cleanup event listener on component unmount
    return () => window.removeEventListener('resize', handleResize);
  }, [theme]);

  const changeVisible = (newVisible: VisibleComponent) => {
    setVisible(newVisible);
    setIsSidebarVisible(false); // Close sidebar when an item is selected
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const renderComponent = () => {
    switch (visible) {
      case "contact":
        return <Contact />;
      case "stack":
        return <Projects />;
      case "about":
        return <Resume />;
      default:
        return <AboutMe />;
    }
  };

  return (
    <>
      <Container fluid className="p-0 d-flex align-items-stretch" style={{ overflow: "auto" }}>
        <Row className="flex-grow-1 m-0" style={{ overflow: "auto" }}>
          <Col className="d-flex">{renderComponent()}</Col>
        </Row>
      </Container>
      <button
        className="toggle-theme-btn"
        onClick={toggleTheme}
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 9999,
        }}
      >
        {isDark ? <RiLightbulbFlashFill className="icon"/> : <RiLightbulbFlashLine className="icon"/>}
      </button>
      
      {isMobile && (
        <>
          <button
            className="toggle-theme-btn"
            onClick={toggleSidebar}
            style={{
              position: "fixed",
              top: "20px",
              left: "20px",
              zIndex: 9999,
            }}
          >
            <FaHamburger />
          </button>
          <Sidebar isVisible={isSidebarVisible} changeVisible={changeVisible} />
        </>
      )}

      {!isMobile && (
        <div className="d-flex justify-content-between align-items-center fixed-bottom pb-5 px-3" style={{ width: "100%", maxWidth: "40rem", margin: "0 auto" }}>
          <button className="navButton" onClick={() => changeVisible("home")}>
            <BsFillPersonFill className="icon" />
          </button>

          <button className="navButton" onClick={() => changeVisible("stack")}>
            <BsStack className="icon" />
          </button>

          <button className="navButton" onClick={() => changeVisible("about")}>
            <RiPagesFill className="icon" />
          </button>

          <button className="navButton" onClick={() => changeVisible("contact")}>
            <RiContactsBookFill className="icon" />
          </button>
        </div>
      )}
    </>
  );
}
