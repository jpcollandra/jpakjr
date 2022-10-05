import React, { useState } from "react";
import Col from "react-bootstrap/esm/Col";
import Container from "react-bootstrap/esm/Container";
import Row from "react-bootstrap/esm/Row";
import { BsFillPersonFill } from "react-icons/bs";
import { RiPagesFill } from "react-icons/ri";
import { RiContactsBookFill } from "react-icons/ri";
import { BsStack } from "react-icons/bs";
import "../App.scss";
import AboutMe from "./aboutMe";
import Work from "./work";
import Referral from "./referral";
import Contact from "./contact";

export default function NavPage() {
  const [visible, setVisible] = useState("home");

  function home() {
    setVisible("home");
  }

  function stack() {
    setVisible("stack");
  }

  function about() {
    setVisible("about");
  }

  function contact() {
    setVisible("contact");
  }

  return (
    <>
      <Container
        fluid
        className="p-0"
        style={{
          display: "flex",
          height: "100vh",
          width: "100%",
        }}
      >
        <Row>
          <Col>
            {visible === "contact" ? (
              <Contact />
            ) : visible === "stack" ? (
              <Work />
            ) : visible === "about" ? (
              <Referral />
            ) : (
              <AboutMe />
            )}
          </Col>
          <Col className="mainNav">
            <div style={{ paddingLeft: "5%" }}>
              <button className="navButton" onClick={home}>
                <BsFillPersonFill className="icon" />
              </button>
            </div>

            <div style={{ paddingLeft: "5%" }}>
              <button className="navButton" onClick={stack}>
                <BsStack className="icon" />
              </button>
            </div>

            <div style={{ paddingLeft: "5%" }}>
              <button className="navButton" onClick={about}>
                <RiPagesFill className="icon" />
              </button>
            </div>

            <div style={{ paddingLeft: "5%" }}>
              <button className="navButton" onClick={contact}>
                <RiContactsBookFill className="icon" />
              </button>
            </div>
          </Col>
          <Col></Col>
        </Row>
      </Container>
    </>
  );
}
