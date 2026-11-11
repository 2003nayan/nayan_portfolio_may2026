"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Copy } from "lucide-react";
import Reveal from "@/components/ui/reveal";
import { buttonClasses } from "@/components/ui/button";
import { RailLabel, SECTION_BOX } from "@/components/ui/section";
import { SITE } from "@/data/site";

type FormState = "idle" | "loading" | "success" | "error";

const FIELD =
  "w-full border-0 border-b border-line-strong bg-transparent py-3 text-base text-ink placeholder:text-faint transition-colors focus:border-accent focus:outline-none";

const LINKS = [
  { label: "GitHub", href: SITE.social.github },
  { label: "LinkedIn", href: SITE.social.linkedin },
  { label: "X", href: SITE.social.x },
  { label: "Medium", href: SITE.social.medium },
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError("All fields are required.");
      return;
    }
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setState("success");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setState("error");
      setError("Something went wrong. Try emailing me directly.");
    }
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SITE.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${SITE.email}`;
    }
  };

  return (
    <section id="contact" className="relative border-t border-line">
      <div className={SECTION_BOX}>
        <Reveal stagger>
          <div className="mb-8 flex items-center justify-between gap-4 border-b border-line pb-4 md:mb-10">
            <p className="hud-label text-muted">
              <span className="text-ink">07</span>
              <span className="mx-2 text-faint">/</span>
              Contact
            </p>
            <p className="hud-label text-faint">Replies within 24 hours</p>
          </div>

          <h2 className="display-1 max-w-5xl">
            Let&apos;s build <span className="serif-accent">something</span>.
          </h2>
          <p className="mt-6 max-w-md text-base text-muted md:text-lg">
            Have a project in mind or want to discuss opportunities? Drop me a
            message.
          </p>
        </Reveal>

        <Reveal
          stagger
          className="mt-14 grid border-t border-l border-line md:mt-20 lg:grid-cols-12"
        >
            {/* A — form */}
            <div className="border-r border-b border-line p-6 sm:p-8 md:p-10 lg:col-span-7">
              <p className="hud-label text-faint">A / Send a message</p>

              {state === "success" ? (
                <div className="mt-10 space-y-4" role="status">
                  <p className="font-display text-3xl font-medium tracking-tight text-ink-strong">
                    Message sent.
                  </p>
                  <p className="text-muted">
                    Thanks for reaching out. I&apos;ll get back to you within
                    24 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setState("idle")}
                    className="hud-label text-accent-ink underline underline-offset-4 hover:text-ink"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-8">
                  <div className="grid gap-8 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contact-name" className="hud-label text-muted">
                        Name
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        className={FIELD}
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="hud-label text-muted">
                        Email
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className={FIELD}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="hud-label text-muted">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={4}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Tell me about your project or opportunity..."
                      className={`${FIELD} resize-none`}
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-danger" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={state === "loading"}
                    className={buttonClasses(
                      "primary",
                      "w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto",
                    )}
                  >
                    {state === "loading" ? (
                      <>
                        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Sending…
                      </>
                    ) : (
                      <>
                        Send message <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* B — direct */}
            <div className="flex flex-col border-r border-b border-line p-6 sm:p-8 md:p-10 lg:col-span-5">
              <p className="hud-label text-faint">B / Direct</p>

              <div className="mt-8 flex items-start justify-between gap-4">
                <a
                  href={`mailto:${SITE.email}`}
                  className="font-display text-xl font-medium tracking-tight break-all text-ink-strong transition-colors hover:text-accent-ink sm:text-2xl"
                >
                  {SITE.email}
                </a>
                <button
                  type="button"
                  onClick={copyEmail}
                  aria-label={copied ? "Email copied" : "Copy email address"}
                  className="invert-block flex size-9 shrink-0 items-center justify-center border border-line text-muted hover:border-invert-bg hover:bg-invert-bg hover:text-invert-fg"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>

              <Link
                href={SITE.resume}
                target="_blank"
                className={buttonClasses("ghost", "mt-8 w-full")}
              >
                Download resume <ArrowUpRight size={13} />
              </Link>

              <ul className="mt-auto pt-10">
                {LINKS.map((link) => (
                  <li key={link.label} className="border-t border-line last:border-b">
                    <Link
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hud-label group flex items-center justify-between py-4 text-muted transition-colors hover:text-ink"
                    >
                      {link.label}
                      <ArrowUpRight
                        size={13}
                        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
        </Reveal>
      </div>
      <RailLabel id="contact" />
    </section>
  );
}
