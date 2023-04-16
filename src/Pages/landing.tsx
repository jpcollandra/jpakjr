import React, { useState, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "../App.scss";

export default function Landing() {
  const navigate = useNavigate();
  const [spin, setSpin] = useState(false);

  useEffect(() => {
    if (spin) {
      setTimeout(() => {
        navigate("/nav");
      }, 2000);
    }
  }, [spin, navigate]);

  function onClick() {
    setSpin(true);
  }

  return (
    <>
      <Container
        fluid
        className="p-0 d-flex align-items-stretch"
        style={{ height: "100vh", width: "100%", overflow: "hidden" }}
      >
        <Row>
          <Col>
            <div
              style={{
                paddingTop: "20%",
                marginLeft: "10%",
              }}
            >
              <h2>"The best way to predict the future is to invent it." - Alan Kay</h2>
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
              <motion.img
                src="/assets/jpakjrFig.png"
                className="Avatar"
                alt="jpakjr"
                animate={spin ? { rotate: 360 } : {}}
                transition={{ duration: 2 }}
              />
            </motion.div>
            <div
              style={{
                position: "static",
                top: "100%",
                paddingLeft: "75%",
              }}
            >
              <button className="buttonNeomorphic" onClick={onClick}>
                {" "}
                Start{" "}
              </button>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
}
