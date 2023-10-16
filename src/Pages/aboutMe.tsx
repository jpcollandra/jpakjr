//aboutMe.tsx
import React, { useState, useEffect, useRef } from "react";
import Col from "react-bootstrap/esm/Col";
import Container from "react-bootstrap/esm/Container";
import Row from "react-bootstrap/esm/Row";
import "../App.scss";
import profilePicture from "../assets/profilePicture.png";

function useTypingEffect(
  text: string,
  speed: number,
  onFinish: () => void
): string {
  const [displayedText, setDisplayedText] = useState("");
  const indexRef = useRef(-1);

  useEffect(() => {
    const timer = setInterval(() => {
      if (indexRef.current < text.length - 1) {
        indexRef.current++;
        setDisplayedText((prevText) => prevText + text[indexRef.current]);
      } else {
        clearInterval(timer);
        onFinish();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, onFinish]);

  return displayedText;
}

export default function AboutMe() {
  const typingSpeed = 100;
  const [isTextFinished, setIsTextFinished] = useState(false);
  const fullText = useTypingEffect(
    "Hello World, my name is John.",
    typingSpeed,
    () => setIsTextFinished(true)
  );

  return (
    <>
      <Container
        fluid
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <Row
          className="justify-content-center align-items-center"
          style={{ width: "100%" }}
        >
          <Col xs={12} lg={5} className="text-center text-col">
            <div>
              <h2>{fullText}</h2>
              <p
                style={{
                  opacity: isTextFinished ? 1 : 0,
                  transition: "opacity 1s ease-in-out",
                  textAlign: "left",
                  maxWidth: "500px",
                  margin: "0 auto",
                  overflowWrap: "break-word",
                }}
              >
                  I'm a Software Engineer specializing in front-end development
                  with React and TypeScript. With a strong foundation in the
                  MERN stack, I'm proficient in building robust, performant, and
                  scalable web applications. My journey in the tech world began
                  in middle school robotics and game design, which sparked my
                  interest in coding. I've spent countless hours honing my
                  skills, embracing both the challenges and rewards that come
                  with software development. Skilled in various tools and
                  frameworks beyond React—like Node.js and Firebase. My code is
                  clean, maintainable, and follows best practices to ensure
                  long-term viability. Feel free to explore my portfolio to see
                  the projects I've worked on, or get in touch if you'd like to
                  collaborate. I'm excited to bring your vision to life!
                </p>
              </div>
          </Col>
          <Col xs={12} lg={5} className="image-col">
            <div style={{ padding: "10vh", textAlign: "center" }}>
              <img
                src={profilePicture}
                alt="Profile"
                style={{
                  width: "200px",
                  height: "200px",
                  borderRadius: "50%",
                  opacity: isTextFinished ? 1 : 0,
                  transition: "opacity 1s ease-in-out",
                }}
              />
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
}
