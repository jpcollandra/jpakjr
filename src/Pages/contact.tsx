import React from "react";
import Col from "react-bootstrap/esm/Col";
import Row from "react-bootstrap/esm/Row";
import "../App.scss";
import { Container } from "react-bootstrap";

export default function Contact() {
  return (
    <Container
      fluid
      className="d-flex justify-content-center align-items-center"
      style={{ height: "100vh" }}
    >
      <Col>
        <Row className="timeTitle">
          <div>
            <h1>Contact</h1>
          </div>
        </Row>
      </Col>
    </Container>
  );
}
