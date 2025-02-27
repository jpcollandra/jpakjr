import React, { useState, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "../App.scss";
import { FaArrowRight } from "react-icons/fa";

export default function Landing() {
  const navigate = useNavigate();
  const [spin, setSpin] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (spin) {
      setTimeout(() => {
        navigate("/nav");
      }, 2000);
    }
  }, [spin, navigate]);

  function handleStart() {
    setSpin(true);
  }

  // Animation variants
  const quoteVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 1,
        ease: "easeOut"
      }
    }
  };

  const avatarContainerVariants = {
    hover: { 
      scale: 1.05,
      transition: { duration: 0.3 }
    }
  };

  const buttonVariants = {
    hover: { 
      scale: 1.05,
      transition: { duration: 0.3 }
    }
  };

  return (
    <Container
      fluid
      className="landing-container d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", overflow: "hidden", padding: "2rem" }}
    >
      <div className="neomorphic-box landing-content">
        <Row className="align-items-center">
          <Col lg={6} className="text-center text-lg-start mb-5 mb-lg-0">
            <motion.div
              className="quote-container"
              initial="hidden"
              animate="visible"
              variants={quoteVariants}
            >
              <h2 className="landing-quote">
                "The best way to predict the future is to invent it."
              </h2>
              <p className="landing-author">- Alan Kay</p>
            </motion.div>
            
            <motion.div 
              className="mt-5 d-flex justify-content-center justify-content-lg-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <motion.button 
                className="landing-button buttonNeomorphic"
                onClick={handleStart}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                variants={buttonVariants}
                whileHover="hover"
                disabled={spin}
              >
                <span className="d-flex align-items-center justify-content-center">
                  Enter 
                  <motion.div 
                    initial={{ x: 0 }}
                    animate={isHovered && !spin ? { x: 5 } : { x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="ms-2"
                  >
                    <FaArrowRight />
                  </motion.div>
                </span>
              </motion.button>
            </motion.div>
          </Col>
          
          <Col lg={6} className="d-flex justify-content-center">
            <motion.div
              className="avatar-container"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              variants={avatarContainerVariants}
              whileHover="hover"
            >
              <motion.div
                className="neomorphic-circle"
                animate={spin ? { rotate: 360 } : {}}
                transition={{ duration: 2 }}
              >
                <motion.img
                  src="/assets/jpakjrFig.png"
                  className="avatar-image"
                  alt="jpakjr"
                  animate={
                    spin 
                      ? { rotate: 360, scale: 0.8 } 
                      : { 
                          y: [0, 15, 0],
                          transition: {
                            y: {
                              repeat: Infinity,
                              duration: 2,
                              ease: "easeInOut"
                            }
                          }
                        }
                  }
                />
              </motion.div>
              
              <AnimatePresence>
                {spin && (
                  <motion.div 
                    className="loading-ring"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </Col>
        </Row>
      </div>
    </Container>
  );
}
