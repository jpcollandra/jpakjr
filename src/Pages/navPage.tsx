import React, { useState, useEffect } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { BsFillPersonFill, BsStack } from "react-icons/bs";
import { RiPagesFill, RiContactsBookFill } from "react-icons/ri";
import { RiLightbulbFlashFill, RiLightbulbFlashLine } from "react-icons/ri";
import "../App.scss";
import AboutMe from "./aboutMe";
import Projects from "./projects";
import Referral from "./referral";
import Contact from "./contact";
import { useTheme } from "../ThemeContext";

type VisibleComponent = "home" | "stack" | "about" | "contact";

export default function NavPage() {
  const [visible, setVisible] = useState<VisibleComponent>("home");
  const { theme = 'light', toggleTheme = () => {} } = useTheme() ?? {};
  const [isDark , updateIsDark]= useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      updateIsDark(true);
      document.documentElement.classList.add('dark-theme');
    } else {
      updateIsDark(false);
      document.documentElement.classList.remove('dark-theme');
    }
  }, [theme]);

  const changeVisible = (newVisible: VisibleComponent) => {
    setVisible(newVisible);
  };
  const renderComponent = () => {
    switch (visible) {
      case "contact":
        return <Contact />;
      case "stack":
        return <Projects />;
      case "about":
        return <Referral />;
      default:
        return <AboutMe />;
    }
  };

  return (
    <>
      <Container
        fluid
        className="p-0 d-flex align-items-stretch"
        style={{ height: "100vh", width: "100%", overflow: "hidden" }}
      >
        <Row className="flex-grow-1 m-0" style={{ overflow: "hidden" }}>
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
    </>
  );
}
