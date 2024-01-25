import React from 'react'
import Col from 'react-bootstrap/esm/Col';
import Row from 'react-bootstrap/esm/Row';
import "../App.scss";
import { Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';

function JsonFormatter() {
  return <iframe src="../htmlScripts/json-prettier.html" title="JSON Formatter" />;
}

function JsonToTsInterface() {
  return <iframe src="../htmlScripts/json-to-ts-interface.html" title="JSON to Typescript Interface" />;
}

function JsonToGraphQL() {
  return <iframe src="/path/to/json-to-graphql.html" title="JSON to GraphQL" />;
}

export default function Work() {
  return (
    <Container
    fluid
    className="d-flex justify-content-center align-items-center"
    style={{ height: "100vh" }}
  >
      <Row className="workTitle">
        <div>
          <h1>Projects</h1>
        </div>
        <Col>
        <div>
        <Link to="/json-formatter">
            <button className="navProject">
              <h4>JSON Formatter</h4>
            </button>
          </Link>
         </div>
         <div style={{marginTop: '30px'}}>
              <button className="navProject" >
                <h4>JSON to Typescript Interface</h4>
              </button>
         </div>
         <div style={{marginTop: '30px'}}>
              <button className="navProject" >
                <h4>JSON to GRAPHQL</h4>
              </button>
         </div>
        </Col>
      </Row>
    </Container>  
  )
}
