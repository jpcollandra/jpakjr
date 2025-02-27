import React, { useState } from "react";
import Col from "react-bootstrap/esm/Col";
import Row from "react-bootstrap/esm/Row";
import "../App.scss";
import { Container } from "react-bootstrap";
import { motion } from "framer-motion";
import { BsBriefcaseFill } from "react-icons/bs";
import { FaReact, FaNodeJs, FaMobile } from "react-icons/fa";
import { SiTypescript, SiJavascript, SiRailway } from "react-icons/si";

// Define experience interface
interface WorkExperience {
  id: string;
  company: string;
  location: string;
  title: string;
  period: string;
  responsibilities: string[];
  skills: string[];
  icon: React.ReactNode;
}

export default function Resume() {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const toggleExpand = (jobId: string) => {
    setExpandedJob(expandedJob === jobId ? null : jobId);
  };

  const experiences: WorkExperience[] = [
    {
      id: "elevance",
      company: "Elevance Health",
      location: "Jacksonville, FL",
      title: "Software Engineer (Contractor)",
      period: "June 2022 - Present",
      responsibilities: [
        "Developed and maintained the mobile dashboard experience for both iOS and Android, adhering to enterprise-level best practices.",
        "Implemented bilingual pop-up notifications on iOS, improving accessibility and user experience.",
        "Built global utils to decrease dependence on third-party libraries (such as lodash) emphasizing performance and type safety.",
        "Fixed defects demonstrating a commitment to quality and detail orientation."
      ],
      skills: ["React Native", "TypeScript", "JavaScript", "Mobile Development"],
      icon: <FaMobile />
    },
    {
      id: "crsc",
      company: "CRSC (USA) INC",
      location: "Jacksonville, FL",
      title: "Sales Engineer",
      period: "March 2020 - September 2021",
      responsibilities: [
        "Coded signaling/communication logic for railway control points.",
        "Collaborated with cross-functional teams to deliver solutions.",
        "Analyzed complex technical requirements and translated them into practical implementations."
      ],
      skills: ["Railway Systems", "Technical Documentation", "Communication"],
      icon: <SiRailway />
    }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2
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
    <Container
      fluid
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh", padding: "2rem 0" }}
    >
      <div className="neomorphic-box" style={{ width: "90%", maxWidth: "1000px" }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-4"
        >
          <h1 className="d-flex align-items-center justify-content-center">
            <BsBriefcaseFill className="me-3" /> Work Experience
          </h1>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {experiences.map((job, index) => (
            <motion.div 
              key={job.id}
              variants={itemVariants}
              className="mb-4"
            >
              <div 
                className={`neomorphic-box experience-card ${expandedJob === job.id ? 'expanded' : ''}`} 
                style={{ 
                  cursor: "pointer", 
                  transition: "all 0.3s ease",
                  marginBottom: "1.5rem"
                }}
                onClick={() => toggleExpand(job.id)}
              >
                <Row>
                  <Col md={10}>
                    <h3 className="mb-0">{job.company}</h3>
                    <p className="text-muted mb-2">{job.location}</p>
                    <h5>{job.title}</h5>
                    <p className="mb-0">{job.period}</p>
                  </Col>
                  <Col md={2} className="d-flex align-items-center justify-content-center">
                    <div className="experience-icon">
                      {job.icon}
                    </div>
                  </Col>
                </Row>

                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ 
                    height: expandedJob === job.id ? "auto" : 0,
                    opacity: expandedJob === job.id ? 1 : 0
                  }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: "hidden" }}
                >
                  <hr className="my-3" />
                  <div className="mt-3">
                    <h6>Responsibilities:</h6>
                    <ul>
                      {job.responsibilities.map((task, idx) => (
                        <li key={idx}>{task}</li>
                      ))}
                    </ul>
                    
                    <h6>Skills:</h6>
                    <div className="d-flex flex-wrap">
                      {job.skills.map((skill, idx) => (
                        <div key={idx} className="skill-badge me-2 mb-2">
                          {skill}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Container>
  );
}
