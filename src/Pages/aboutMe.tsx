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
): [string, () => void] {
  const [displayedText, setDisplayedText] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    if (indexRef.current < text.length) {
      const timerId = setTimeout(() => {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      }, speed);

      return () => clearTimeout(timerId);
    } else {
      onFinish();
    }
  }, [displayedText, text, speed, onFinish]);

  const completeTypingInstantly = () => {
    setDisplayedText(text);
    onFinish();
  };

  return [displayedText, completeTypingInstantly];
}


export default function AboutMe() {
  const typingSpeed = 100;
  const [isTextFinished, setIsTextFinished] = useState(false);
  const [displayedText, completeTypingInstantly] = useTypingEffect(
    "Hello World, my name is John.",
    typingSpeed,
    () => setIsTextFinished(true)
  );

  const completeTyping = () => {
    if (!isTextFinished) {
      completeTypingInstantly();
      setIsTextFinished(true);
    }
  };

  return (
    <>
      <Container fluid onClick={completeTyping}>
        <Row
          className="justify-content-center align-items-center"
          style={{ width: "100%", minHeight: "100vh" }}
        >
          <Col xs={12} lg={5} className="text-center text-col">
            <div className="neomorphic-box">
              <h2>{displayedText}</h2>
              <ul style={{
                  opacity: isTextFinished ? 1 : 0,
                  transition: "opacity 1s ease-in-out",
                  textAlign: "left",
                  maxWidth: "500px",
                  margin: "0 auto",
                  overflowWrap: "break-word",
                }}>
                <li>Role: Full Stack Software Engineer</li>
                <li>Key Skills: Proficient in React, React Native, Node.js and TypeScript.</li>
                <li>Technical Expertise: Strong foundation in the MERN stack for building robust, performant, and scalable web applications.</li>
                <li>Coding Journey: Began in middle school with robotics and game design.</li>
                <li>Additional Skills: Firebase, Kafka, Docker, Apigee and various other tools and frameworks.</li>
                <li>Code Quality: Emphasis on clean, maintainable code that adheres to best practices.</li>
                <li>Portfolio: Showcases a range of projects, demonstrating skill and versatility.</li>
                <li>Collaboration: Open to partnering on new projects and bringing visions to life.</li>
              </ul>
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
