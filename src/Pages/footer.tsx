import React from "react";
import "../App.scss";
import { FaGithub, FaLinkedin, FaEnvelope, FaTwitter } from "react-icons/fa";

interface SocialLink {
  icon: React.ReactNode;
  url: string;
  label: string;
}

const socialLinks: SocialLink[] = [
  { icon: <FaGithub />, url: "https://github.com/jpcollandra", label: "GitHub" },
  { icon: <FaLinkedin />, url: "https://www.linkedin.com/in/jpakjr/", label: "LinkedIn" },
  { icon: <FaEnvelope />, url: "mailto:jpakjr101@gmail.com", label: "Email" },
  { icon: <FaTwitter />, url: "https://x.com/jpakjr", label: "Twitter" },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-social-links">
        {socialLinks.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target={link.url.startsWith("mailto:") ? undefined : "_blank"}
            rel={link.url.startsWith("mailto:") ? undefined : "noopener noreferrer"}
            className="footer-social-link"
            aria-label={link.label}
          >
            {link.icon}
          </a>
        ))}
      </div>
      <p className="footer-copyright">&copy; 2026 John Collandra</p>
    </footer>
  );
}
