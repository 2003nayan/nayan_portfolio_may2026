"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

type FormState = "idle" | "loading" | "success" | "error";

export default function Contact() {
  const { ref, isVisible } = useScrollAnimation();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");

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

  return (
    <section id="contact" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div
          ref={ref}
          className={`transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="text-center mb-10">
            <p className="section-label mb-3">Get In Touch</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
              Let&apos;s Work Together
            </h2>
            <p className="text-[#A0A0A0] text-base max-w-md mx-auto">
              Have a project in mind or want to discuss opportunities? Drop me a
              message.
            </p>
          </div>

          {state === "success" ? (
            <div className="max-w-lg mx-auto card text-center space-y-3">
              <div className="text-4xl">🎉</div>
              <h3 className="text-white font-semibold">Message sent!</h3>
              <p className="text-[#A0A0A0] text-sm">
                Thanks for reaching out. I&apos;ll get back to you within 24
                hours.
              </p>
              <button
                onClick={() => setState("idle")}
                className="text-[#FF6B35] text-sm hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="max-w-lg mx-auto card space-y-4"
            >
              {/* Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="contact-name"
                  className="text-[#A0A0A0] text-sm font-medium"
                >
                  Name
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder:text-[#606060] text-sm focus:outline-none focus:border-[#FF6B35] transition-colors"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="contact-email"
                  className="text-[#A0A0A0] text-sm font-medium"
                >
                  Email
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder:text-[#606060] text-sm focus:outline-none focus:border-[#FF6B35] transition-colors"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label
                  htmlFor="contact-message"
                  className="text-[#A0A0A0] text-sm font-medium"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell me about your project or opportunity..."
                  className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder:text-[#606060] text-sm focus:outline-none focus:border-[#FF6B35] transition-colors resize-none"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={state === "loading"}
                className="w-full flex items-center justify-center gap-2 bg-[#FF6B35] hover:bg-[#FF8550] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {state === "loading" ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <>
                    <Send size={15} />
                    Send Message
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
