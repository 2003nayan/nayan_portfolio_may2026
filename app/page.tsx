import Hero from "@/components/sections/hero";
import About from "@/components/sections/about";
import Journey from "@/components/sections/journey";
import Technologies from "@/components/sections/technologies";
import Projects from "@/components/sections/projects";
import OpenSource from "@/components/sections/opensource";
import { WritingSection } from "@/components/sections/writing";
import Contact from "@/components/sections/contact";
import { getAllPosts } from "@/lib/blog";

export default function Home() {
  const posts = getAllPosts();

  return (
    <>
      <Hero />
      <About />
      <Journey />
      <Technologies />
      <Projects />
      <OpenSource />
      <WritingSection posts={posts} />
      <Contact />
    </>
  );
}
