import Hero from "@/components/sections/hero";
import About from "@/components/sections/about";
import Journey from "@/components/sections/journey";
import Technologies from "@/components/sections/technologies";
import Projects from "@/components/sections/projects";
import Twins from "@/components/sections/twins";
import OpenSource from "@/components/sections/opensource";
import { WritingSection } from "@/components/sections/writing";
import Contact from "@/components/sections/contact";
import Intro from "@/components/ui/intro";
import SectionTracker from "@/components/ui/section-tracker";
import { getAllPosts } from "@/lib/blog";

export default function Home() {
  const posts = getAllPosts();

  return (
    <>
      <Intro />
      <SectionTracker />
      {/* Hero runs full width; everything after it is inset from the
          tracker's rail on xl screens (see .home-shell in globals.css) */}
      <Hero />
      <div className="home-shell">
        <Technologies />
        <About />
        <Journey />
        <Projects />
        <Twins />
        <OpenSource />
        <WritingSection posts={posts} />
        <Contact />
      </div>
    </>
  );
}
