import React, { useState, useEffect, useRef } from "react";
import Col from "react-bootstrap/esm/Col";
import Container from "react-bootstrap/esm/Container";
import Row from "react-bootstrap/esm/Row";
import "../App.scss";

function useTypingEffect(text: string, speed: number): string {
  const [displayedText, setDisplayedText] = useState("");
  const indexRef = useRef(-1);

  useEffect(() => {
    const timer = setInterval(() => {
      if (indexRef.current < text.length - 1) {
        indexRef.current++;
        setDisplayedText((prevText) => prevText + text[indexRef.current]);
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return displayedText;
}

export default function AboutMe() {
  const typingSpeed = 100; // Adjust the typing speed (in milliseconds)
  const fullText = useTypingEffect("Hello World, my name is John.", typingSpeed);

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
            <div style={{ paddingTop: "10vh", paddingLeft: "10vh", position: "absolute", width: "60%" }}>
              <h2>
                {fullText}
              </h2>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
}
