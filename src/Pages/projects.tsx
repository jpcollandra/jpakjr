import React, { useState } from 'react'
import Col from 'react-bootstrap/esm/Col';
import Row from 'react-bootstrap/esm/Row';
import "../App.scss";
import { Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { motion } from 'framer-motion';

// Define project interfaces
interface Project {
  id: string;
  title: string;
  description: string;
  link: string;
  iframe?: string;
}

export default function Projects() {
  // Project data
  const projects: Project[] = [
    {
      id: "json-formatter",
      title: "JSON Formatter",
      description: "A simple tool to format and validate JSON data",
      link: "/json-formatter",
      iframe: "../htmlScripts/json-prettier.html"
    },
    {
      id: "json-to-ts",
      title: "JSON to TypeScript Interface",
      description: "Convert JSON objects to TypeScript interfaces",
      link: "/json-to-ts",
      iframe: "../html/json-to-ts-interface.html"
    },
    {
      id: "json-to-graphql",
      title: "JSON to GraphQL",
      description: "Generate GraphQL schemas from JSON data",
      link: "/json-to-graphql",
      iframe: "/path/to/json-to-graphql.html"
    }
  ];

  const [activeProject, setActiveProject] = useState<string | null>(null);

  const handleProjectClick = (projectId: string) => {
    setActiveProject(activeProject === projectId ? null : projectId);
  };

  return (
    <Container
      fluid
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh", padding: "2rem 0" }}
    >
      <div className="neomorphic-box" style={{ width: "90%", maxWidth: "1000px" }}>
        <Row className="mb-4">
          <Col>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-4"
            >
              My Projects
            </motion.h1>
          </Col>
        </Row>
        
        <Row>
          {projects.map((project, index) => (
            <Col lg={4} md={6} className="mb-4" key={project.id}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.03 }}
                className="h-100"
              >
                <div 
                  className="project-card neomorphic-box h-100" 
                  style={{ 
                    padding: "1.5rem",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer" 
                  }}
                  onClick={() => handleProjectClick(project.id)}
                >
                  <h3 className="mb-3">{project.title}</h3>
                  <p>{project.description}</p>
                  <div className="mt-auto">
                    <Link to={project.link}>
                      <button className="buttonNeomorphic" style={{ position: "relative", width: "100%" }}>
                        Try it
                      </button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </Col>
          ))}
        </Row>
        
        {activeProject && (
          <Row className="mt-4">
            <Col>
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
                className="neomorphic-box"
                style={{ padding: "1rem" }}
              >
                <iframe 
                  src={projects.find(p => p.id === activeProject)?.iframe} 
                  title={projects.find(p => p.id === activeProject)?.title}
                  style={{ width: "100%", height: "400px", border: "none" }}
                />
              </motion.div>
            </Col>
          </Row>
        )}
      </div>
    </Container>  
  )
}
