import React, { useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { BsFillPersonFill, BsStack } from "react-icons/bs";
import { RiPagesFill, RiContactsBookFill } from "react-icons/ri";
import "../App.scss";
import AboutMe from "./aboutMe";
import Projects from "./projects";
import Referral from "./referral";
import Contact from "./contact";

type VisibleComponent = "home" | "stack" | "about" | "contact";

export default function NavPage() {
  const [visible, setVisible] = useState<VisibleComponent>("home");

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
