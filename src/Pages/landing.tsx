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
            <div style={{position: "relative" , margin: "30%", width: "40rem"}}>
            <h2>"If it can be designed I can</h2>
            <h2>code it"</h2>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
}
