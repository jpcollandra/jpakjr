import React from "react";
import Col from "react-bootstrap/esm/Col";
import Container from "react-bootstrap/esm/Container";
import Row from "react-bootstrap/esm/Row";

export default function AboutMe() {
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
          <Col>
            <div style={{position: "absolute", right: "30%", left: "20%", width: "600px", marginTop: "15%"}}>
              <h2>
                <span> Hello World</span>
                <span style={{ fontSize: "24px" }}>
                  , my name is John. I am the founder of Negnan.com, a
                  revolutionary way of understanding current events. I also do
                  freelance sofware development to supplement my income. If you
                  have an idea you want to work on, or just want to say hi,
                  please get in touch.
                </span>
              </h2>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
}
