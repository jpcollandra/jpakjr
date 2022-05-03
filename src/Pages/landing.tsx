import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { useLoader } from "@react-three/fiber";
import { motion } from "framer-motion";

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
        <Row >
          <Col>
            <motion.div
              animate={{ x: 100 }}
              transition={{ ease: "easeOut", duration: 2 }}
            >
            <div
              style={{ position: "relative", marginTop: "20%", width: "40rem" }}
            >
              <h2>"If it can be designed I can</h2>
              <h2>code it"</h2>
            </div>
            </motion.div>
            <button className="buttonNeomorphic" style={{margin: "10%"}}> Start </button>
          </Col>
        </Row>
      </Container>
    </>
  );
}
