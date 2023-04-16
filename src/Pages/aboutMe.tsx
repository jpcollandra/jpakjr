import React from "react";
import Col from "react-bootstrap/esm/Col";
import Container from "react-bootstrap/esm/Container";
import Row from "react-bootstrap/esm/Row";
import "../App.scss";

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
            <div style={{ paddingTop:"10vh", paddingLeft:"10vh", position:"absolute", width:"60%"}}>
              <h2>
                <span> Hello World</span>
                <span style={{ fontSize: "24px" }}>
                  , my name is John.
                </span>
              </h2>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
}
