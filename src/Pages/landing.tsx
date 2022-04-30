import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

export default function Landing() {
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
        <Row style={{ height: "auto" }}>
          <Col>
            <h1>hello</h1>
          </Col>
        </Row>
      </Container>
    </>
  );
}
