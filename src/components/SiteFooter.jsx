import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";

const footerDialogs = {
  "About Us": {
    title: "About Us",
    content:
      "KFLIX HINDI is a platform for K-drama fans who enjoy Korean dramas in Hindi. We aim to make discovering and enjoying Korean drama content simple and convenient.",
  },
  "Privacy Policy": {
    title: "Privacy Policy",
    content:
      "KFLIX HINDI uses account information to provide sign-in features and review information to display reviews. Please avoid including sensitive personal information in reviews.",
  },
  "Terms & Conditions": {
    title: "Terms & Conditions",
    content:
      "Use KFLIX HINDI lawfully and respectfully. Content availability may change, and you are responsible for ensuring your use of the site complies with applicable laws.",
  },
};

// Replace these temporary profile URLs with the official KFLIX HINDI accounts.
const socialLinks = [
  {
    name: "Instagram",
    url: "https://www.instagram.com/REPLACE_WITH_YOUR_ACCOUNT/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle className="site-footer-icon-dot" cx="17.5" cy="6.8" r="1" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    url: "https://www.facebook.com/REPLACE_WITH_YOUR_ACCOUNT",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 21v-8h2.7l.4-3.1H14V8c0-.9.3-1.5 1.6-1.5h1.7V3.7c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2H8v3.1h2.6v8H14Z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com/@REPLACE_WITH_YOUR_ACCOUNT",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.5 3h-3.2v12.1a2.8 2.8 0 1 1-2.4-2.8v-3.3a6.1 6.1 0 1 0 5.6 6.1V9a8 8 0 0 0 4.6 1.5V7.2c-2.5 0-4.6-1.9-4.6-4.2Z" />
      </svg>
    ),
  },
];

export default function SiteFooter() {
  const [activeDialog, setActiveDialog] = useState(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!activeDialog) return undefined;

    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveDialog(null);
      } else if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [activeDialog]);

  const dialog = activeDialog
    ? createPortal(
        <div
          className="site-footer-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveDialog(null);
          }}
        >
          <section
            className="site-footer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-footer-modal-title"
          >
            <button
              className="site-footer-modal-close"
              type="button"
              aria-label="Close dialog"
              onClick={() => setActiveDialog(null)}
              ref={closeButtonRef}
            >
              ×
            </button>
            <h2 id="site-footer-modal-title">
              {footerDialogs[activeDialog].title}
            </h2>
            <p>{footerDialogs[activeDialog].content}</p>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <footer className="site-footer">
        <div className="site-footer-brand">
          <Link className="logo" to="/">
            KFLIX <span>HINDI</span>
          </Link>
          <div className="site-footer-socials" aria-label="Social media">
            {socialLinks.map(({ name, url, icon }) => (
              <a
                href={url}
                key={name}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name} (opens in a new tab)`}
                title={name}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>
        <div className="site-footer-info">
          <p>Made for K-drama fans. © 2026 Kflix Hindi</p>
          <nav className="site-footer-legal" aria-label="Footer information">
            {Object.keys(footerDialogs).map((label) => (
              <button
                type="button"
                key={label}
                onClick={() => setActiveDialog(label)}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </footer>
      {dialog}
    </>
  );
}
