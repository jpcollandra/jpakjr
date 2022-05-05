import React from 'react'
import Col from 'react-bootstrap/esm/Col'
import Container from 'react-bootstrap/esm/Container'
import Row from 'react-bootstrap/esm/Row'

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
        <Col style={{position: "relative", justifyContent: "center"}}>

        <h2 > Hello </h2>
        </Col>
      </Row>
    </Container>
    </>
  )
}
