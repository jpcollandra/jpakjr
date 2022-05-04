import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { useLoader } from "@react-three/fiber";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Landing() {

  const navigate = useNavigate();

  function onClick() {
    navigate("/about");
  }

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
              <div
                style={{
                  position: "relative",
                  marginTop: "20%",
                  marginLeft: "20%",
                  width: "40rem",
                }}
              >
                <h2>"If it can be designed I can</h2>
                <h2>code it"</h2>
              </div>
            <motion.div
              animate={{ y: 100 }}
              transition={{
                type: "spring",
                duration: 10,
                damping: 1,
                stiffness: 5,
              }}
            >
              <img
                src="/assets/jpakjrFig.png"
                style={{
                  display: "flex",
                  width: "20rem",
                  marginLeft: "110%",
                }}
                alt="me"
              />
            </motion.div>
            <button
              className="buttonNeomorphic"
              style={{ marginTop: "5%", marginLeft: "20%" }}
              onClick={onClick}
            >
              {" "}
              Start{" "}
            </button>
          </Col>
        </Row>
      </Container>
    </>
  );
}
