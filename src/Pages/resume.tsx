import React from 'react';
import Col from 'react-bootstrap/esm/Col';
import Row from 'react-bootstrap/esm/Row';
import "../App.scss";

export default function Resume() {
  return (
    <Row className="timeTitle">
      <div>
        <h1>Work Experience</h1>
      </div>
      <Col className="resumeContent">
        <h3>Elevance Health (Contractor) — Jacksonville FL</h3>
        <p>Software Engineer June 2022 – Current</p>
        <ul>
          <li>Developed and maintained the mobile dashboard experience for both iOS and Android, adhering to enterprise-level best practices.</li>
          <li>Implemented bilingual pop-up notifications on iOS, improving accessibility and user experience.</li>
          <li>Built global utils to decrease dependence on third-party libraries (such as lodash) emphasizing performance and type safety.</li>
          <li>Fixed defects demonstrating a commitment to quality and detail orientation.</li>
        </ul>
        <h3>CRSC (USA) INC — Jacksonville FL</h3>
        <p>Sales Engineer March 2020 – September 2021</p>
        <ul>
          <li>Coded signaling/communication logic for railway control points.</li>
        </ul>
      </Col>
    </Row>
  )
}

