import React from "react";
import Col from "react-bootstrap/esm/Col";
import Container from "react-bootstrap/esm/Container";
import Row from "react-bootstrap/esm/Row";
import { BsFillPersonFill } from "react-icons/bs";
import { RiPagesFill } from "react-icons/ri";
import { RiContactsBookFill } from "react-icons/ri";
import { BsStack } from "react-icons/bs";
import "../App.scss";

export default function NavPage() {
  return (
    <>
      <Container
        fluid
        className="p-0"
        style={{
          display: "flex",
          height: "100vh",
          margin: "0",
          padding: "0",
          width: "100%",
        }}
      >
        <Row>
          <Col></Col>
          <Col className="mainNav">
            <div style={{ paddingLeft: "5%" }}>
              <button className="navButton">
                <BsFillPersonFill className="icon" />
              </button>
            </div>

            <div style={{ paddingLeft: "5%" }}>
              <button className="navButton">
                <BsStack className="icon" />
              </button>
            </div>

            <div style={{ paddingLeft: "5%" }}>
              <button className="navButton">
                <RiPagesFill className="icon" />
              </button>
            </div>

            <div style={{ paddingLeft: "5%" }}>
              <button className="navButton">
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
