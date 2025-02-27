//aboutMe.tsx
import React, { useState, useEffect, useRef } from "react";
import Col from "react-bootstrap/esm/Col";
import Container from "react-bootstrap/esm/Container";
import Row from "react-bootstrap/esm/Row";
import "../App.scss";
import { motion } from "framer-motion";
import profilePicture from "../assets/profilePicture.png";
import { FaReact, FaNodeJs, FaMobile, FaCode, FaServer, FaDatabase } from "react-icons/fa";
import { SiTypescript, SiJavascript, SiFirebase, SiDocker, SiApachekafka } from "react-icons/si";

// Define skill interface
interface Skill {
  name: string;
  icon: React.ReactNode;
  level: number; // 1-10
}

// Custom typing effect hook
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
  const typingSpeed = 60; // Slightly faster typing
  const [isTextFinished, setIsTextFinished] = useState(false);
  const [displayedText, completeTypingInstantly] = useTypingEffect(
    "Hello World, I'm John.",
    typingSpeed,
    () => setIsTextFinished(true)
  );

  const completeTyping = () => {
    if (!isTextFinished) {
      completeTypingInstantly();
      setIsTextFinished(true);
    }
  };

  // Skills data
  const skills: Skill[] = [
    { name: "React", icon: <FaReact />, level: 9 },
    { name: "TypeScript", icon: <SiTypescript />, level: 8 },
    { name: "JavaScript", icon: <SiJavascript />, level: 9 },
    { name: "Node.js", icon: <FaNodeJs />, level: 8 },
    { name: "React Native", icon: <FaMobile />, level: 7 },
    { name: "Firebase", icon: <SiFirebase />, level: 7 },
    { name: "Docker", icon: <SiDocker />, level: 6 },
    { name: "Kafka", icon: <SiApachekafka />, level: 5 },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <Container fluid onClick={completeTyping} className="p-md-5">
      <Row
        className="justify-content-center align-items-stretch"
        style={{ width: "100%", minHeight: "100vh", paddingTop: "2rem", paddingBottom: "8rem" }}
      >
        {/* Desktop layout - side by side with equal heights */}
        <Col lg={6} xl={5} className="d-none d-lg-block mb-lg-0">
          <motion.div 
            className="neomorphic-box about-content h-100"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="d-flex flex-column h-100">
              <div className="cursor-container mb-4">
                <h2 className="typing-text">
                  {displayedText}
                  <span className={`cursor ${isTextFinished ? 'hidden' : ''}`}>|</span>
                </h2>
              </div>
              
              <motion.div
                className="flex-grow-1 d-flex flex-column"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: isTextFinished ? 1 : 0,
                }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <div className="about-bio mb-4">
                  <p>I'm a Full Stack Software Engineer with a passion for creating elegant, efficient solutions to complex problems.</p>
                  <p>With a strong foundation in the MERN stack, I build robust, performant, and scalable web applications. My coding journey began in middle school with robotics and game design, and has evolved into a professional career focused on delivering high-quality software.</p>
                </div>
                
                <div className="skills-section mt-auto">
                  <h4 className="mb-3">Skills & Expertise</h4>
                  <motion.div 
                    className="skills-container"
                    variants={containerVariants}
                    initial="hidden"
                    animate={isTextFinished ? "visible" : "hidden"}
                  >
                    {skills.map((skill, index) => (
                      <motion.div 
                        key={skill.name} 
                        className="skill-item"
                        variants={itemVariants}
                      >
                        <div className="skill-icon">{skill.icon}</div>
                        <div className="skill-name">{skill.name}</div>
                        <div className="skill-bar-container">
                          <div 
                            className="skill-bar" 
                            style={{ width: `${skill.level * 10}%` }}
                          ></div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </Col>
        
        <Col lg={6} xl={5} className="d-none d-lg-block mb-lg-0">
          <motion.div 
            className="neomorphic-box profile-container h-100"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="profile-wrapper desktop">
              <div className="desktop-profile-header">
                <motion.div
                  className="profile-picture-container desktop-img"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: isTextFinished ? 1 : 0.8,
                    opacity: isTextFinished ? 1 : 0 
                  }}
                  transition={{ 
                    duration: 0.5,
                    delay: 0.2
                  }}
                >
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="profile-picture"
                  />
                </motion.div>
                
                <motion.div
                  className="profile-intro"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: isTextFinished ? 1 : 0,
                    y: isTextFinished ? 0 : 20
                  }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <h3>John Collandra</h3>
                  <p className="profile-title">Full Stack Software Engineer</p>
                </motion.div>
              </div>
              
              <motion.div
                className="profile-details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: isTextFinished ? 1 : 0,
                  y: isTextFinished ? 0 : 20
                }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="profile-highlights">
                  <div className="highlight-item">
                    <FaCode className="highlight-icon" />
                    <div>Clean, maintainable code</div>
                  </div>
                  <div className="highlight-item">
                    <FaServer className="highlight-icon" />
                    <div>API & Backend Architecture</div>
                  </div>
                  <div className="highlight-item">
                    <FaDatabase className="highlight-icon" />
                    <div>Database Design</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </Col>
        
        {/* Mobile layout - stacked */}
        {/* Profile picture first */}
        <Col xs={12} className="d-block d-lg-none mb-4">
          <motion.div 
            className="neomorphic-box profile-container"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="profile-wrapper">
              <motion.div
                className="profile-picture-container"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: isTextFinished ? 1 : 0.8,
                  opacity: isTextFinished ? 1 : 0 
                }}
                transition={{ 
                  duration: 0.5,
                  delay: 0.2
                }}
              >
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="profile-picture"
                />
              </motion.div>
              
              <motion.div
                className="profile-details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: isTextFinished ? 1 : 0,
                  y: isTextFinished ? 0 : 20
                }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <h3>John Collandra</h3>
                <p className="profile-title">Full Stack Software Engineer</p>
              </motion.div>
            </div>
          </motion.div>
        </Col>
        
        {/* Intro text second */}
        <Col xs={12} className="d-block d-lg-none mb-4">
          <motion.div 
            className="neomorphic-box about-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="cursor-container">
              <h2 className="mb-4 typing-text">
                {displayedText}
                <span className={`cursor ${isTextFinished ? 'hidden' : ''}`}>|</span>
              </h2>
            </div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: isTextFinished ? 1 : 0,
              }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="about-bio mb-4">
                <p>I'm a Full Stack Software Engineer with a passion for creating elegant, efficient solutions to complex problems.</p>
                <p>With a strong foundation in the MERN stack, I build robust, performant, and scalable web applications. My coding journey began in middle school with robotics and game design, and has evolved into a professional career focused on delivering high-quality software.</p>
              </div>
            </motion.div>
          </motion.div>
        </Col>
        
        <Col xs={12} className="d-block d-lg-none">
          <motion.div 
            className="neomorphic-box"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="skills-section">
              <h4 className="mb-3 text-center">Skills & Expertise</h4>
              <motion.div 
                className="skills-container"
                variants={containerVariants}
                initial="hidden"
                animate={isTextFinished ? "visible" : "hidden"}
              >
                {skills.map((skill, index) => (
                  <motion.div 
                    key={skill.name} 
                    className="skill-item"
                    variants={itemVariants}
                  >
                    <div className="skill-icon">{skill.icon}</div>
                    <div className="skill-name">{skill.name}</div>
                    <div className="skill-bar-container">
                      <div 
                        className="skill-bar" 
                        style={{ width: `${skill.level * 10}%` }}
                      ></div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              
              <div className="profile-highlights mt-4">
                <div className="highlight-item">
                  <FaCode className="highlight-icon" />
                  <div>Clean, maintainable code</div>
                </div>
                <div className="highlight-item">
                  <FaServer className="highlight-icon" />
                  <div>API & Backend Architecture</div>
                </div>
                <div className="highlight-item">
                  <FaDatabase className="highlight-icon" />
                  <div>Database Design</div>
                </div>
              </div>
            </div>
          </motion.div>
        </Col>
      </Row>
    </Container>
  );
}
