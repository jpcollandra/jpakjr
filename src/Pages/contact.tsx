import React, { useState } from "react";
import { Container } from "react-bootstrap";
import "../App.scss";
import { motion } from "framer-motion";
import { FaGithub, FaLinkedin, FaEnvelope, FaTwitter } from "react-icons/fa";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

interface ContactLink {
  name: string;
  icon: React.ReactNode;
  url: string;
  label: string;
}

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitStatus, setSubmitStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const contactLinks: ContactLink[] = [
    {
      name: "GitHub",
      icon: <FaGithub />,
      url: "https://github.com/jpcollandra",
      label: "jpcollandra",
    },
    {
      name: "LinkedIn",
      icon: <FaLinkedin />,
      url: "https://www.linkedin.com/in/jpakjr/",
      label: "jpakjr",
    },
    {
      name: "Email",
      icon: <FaEnvelope />,
      url: "mailto:jpakjr101@gmail.com",
      label: "jpakjr101@gmail.com",
    },
    {
      name: "Twitter / X",
      icon: <FaTwitter />,
      url: "https://x.com/jpakjr",
      label: "@jpakjr",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus("sending");
    try {
      await addDoc(collection(db, "messages"), {
        ...formData,
        createdAt: serverTimestamp(),
      });
      setSubmitStatus("sent");
      setFormData({ name: "", email: "", message: "" });
    } catch {
      setSubmitStatus("error");
    }
  };

  return (
    <Container
      fluid
      className="d-flex justify-content-center align-items-start"
      style={{ padding: "2rem 0" }}
    >
      <div className="neomorphic-box" style={{ width: "90%", maxWidth: "800px" }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-4"
        >
          <h1 className="d-flex align-items-center justify-content-center">
            <FaEnvelope className="me-3" /> Get In Touch
          </h1>
          <p style={{ fontSize: "1.1rem", opacity: 0.9, marginTop: "1rem" }}>
            I'm always open to new opportunities, collaborations, or just a friendly chat. Feel free to reach out!
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Social / Contact Cards */}
          <div className="contact-cards-grid">
            {contactLinks.map((link) => (
              <motion.a
                key={link.name}
                variants={itemVariants}
                href={link.url}
                target={link.url.startsWith("mailto:") ? undefined : "_blank"}
                rel={link.url.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                className="contact-card"
              >
                <div className="contact-card-icon">{link.icon}</div>
                <div className="contact-card-info">
                  <div className="contact-card-name">{link.name}</div>
                  <div className="contact-card-label">{link.label}</div>
                </div>
              </motion.a>
            ))}
          </div>

          {/* Contact Form */}
          <motion.div variants={itemVariants}>
            <form className="contact-form" onSubmit={handleSubmit}>
              <h4 className="mb-3">Send a Message</h4>
              <input
                type="text"
                name="name"
                className="contact-input"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                className="contact-input"
                placeholder="Your Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <textarea
                name="message"
                className="contact-textarea"
                placeholder="Your Message"
                rows={5}
                value={formData.message}
                onChange={handleChange}
                required
              />
              <button
                type="submit"
                className="contact-send-btn"
                disabled={submitStatus === "sending"}
              >
                {submitStatus === "sending" ? "Sending..." : submitStatus === "sent" ? "Sent!" : "Send Message"}
              </button>
              {submitStatus === "error" && (
                <p style={{ color: "#ff6b6b", marginTop: "0.5rem", fontSize: "0.9rem" }}>
                  Something went wrong. Please try again.
                </p>
              )}
            </form>
          </motion.div>
        </motion.div>
      </div>
    </Container>
  );
}
