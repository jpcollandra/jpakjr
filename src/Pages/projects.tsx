import React from 'react'
import Col from 'react-bootstrap/esm/Col';
import Row from 'react-bootstrap/esm/Row';
import "../App.scss";

export default function Work() {
  return (
      <Row className="workTitle">
        <div>
          <h1>Projects</h1>
        </div>
        <Col>
        <div style={{ flex:1, paddingLeft:"40%", paddingTop: "20%" }}>
              <button className="navProject" >
                <h1>Variable Generator</h1>
              </button>
            </div>
        </Col>
      </Row>
  )
}
