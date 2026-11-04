import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import { setPageMetadata } from "../utils/pageMetadata";

const aboutSections = [
  {
    title: "About KFLIX HINDI",
    description:
      "KFLIX HINDI is a platform created for K-drama fans who enjoy Korean dramas in Hindi. Our goal is to make discovering and enjoying Korean drama content simple and convenient.",
  },
  {
    title: "Our Mission",
    description:
      "Our mission is to bring Korean drama entertainment closer to Hindi-speaking audiences and provide a smooth and enjoyable browsing experience.",
  },
  {
    title: "What We Offer",
    description: [
      "Korean drama discovery.",
      "Hindi-dubbed drama content.",
      "Easy episode browsing.",
      "A simple and user-friendly platform.",
    ],
  },
  {
    title: "Our Vision",
    description:
      "We aim to build a welcoming entertainment platform for K-drama fans where discovering and enjoying dramas is easy and enjoyable.",
  },
];

export default function AboutPage() {
  const [activeSection, setActiveSection] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeButtonRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    return setPageMetadata({
      title: "About Us | Kflix Hindi",
      description:
        "Learn about Kflix Hindi, our mission, what we offer, and our vision for Hindi-speaking K-drama fans.",
      url: "https://kflix-hindi.pages.dev/about",
    });
  }, []);

  useEffect(() => {
    if (!activeSection) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsClosing(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [activeSection]);

  useEffect(() => {
    if (!isClosing) return undefined;

    const timeoutId = window.setTimeout(() => {
      setActiveSection(null);
      setIsClosing(false);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [isClosing]);

  const openSection = (section, event) => {
    triggerRef.current = event.currentTarget;
    setActiveSection(section);
    setIsClosing(false);
  };

  const closeModal = () => {
    if (activeSection && !isClosing) setIsClosing(true);
  };

  return (
    <div className="app about-page">
      <header className="about-navbar">
        <Link className="logo" to="/" aria-label="Kflix Hindi home">
          KFLIX <span>HINDI</span>
        </Link>
        <Link className="about-home-link" to="/">Back to Home</Link>
      </header>

      <main className="about-main">
        <section className="about-intro" aria-labelledby="about-page-title">
          <span className="eyebrow">THE STORY BEHIND THE SCREEN</span>
          <h1 id="about-page-title">
            About <span>KFLIX HINDI</span>
          </h1>
          <p>
            Made for K-drama fans. Discover what we stand for and where we’re
            headed.
          </p>
        </section>

        <section className="about-sections" aria-label="About Kflix Hindi">
          {aboutSections.map((section, index) => (
            <button
              className="about-section-link"
              type="button"
              key={section.title}
              onClick={(event) => openSection(section, event)}
              aria-haspopup="dialog"
            >
              <span className="about-section-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{section.title}</span>
              <span className="about-section-arrow" aria-hidden="true">↗</span>
            </button>
          ))}
        </section>

        {activeSection ? (
          <div
            className={`about-modal-backdrop${isClosing ? " is-closing" : ""}`}
            onClick={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <section
              className={`about-modal${isClosing ? " is-closing" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="about-modal-title"
            >
              <button
                className="about-modal-close"
                type="button"
                aria-label="Close dialog"
                onClick={closeModal}
                ref={closeButtonRef}
              >
                ×
              </button>
              <span className="eyebrow">KFLIX HINDI</span>
              <h2 id="about-modal-title">{activeSection.title}</h2>
              {Array.isArray(activeSection.description) ? (
                <ul>
                  {activeSection.description.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>{activeSection.description}</p>
              )}
            </section>
          </div>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
