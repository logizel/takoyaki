import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Features } from "@/components/Features";
import { Commands } from "@/components/Commands";
import { Footer } from "@/components/Footer";
import BonitoCursor from "@/components/BonitoCursor";
import FooterMotion from "@/components/FooterMotion";
import ScrollProgress from "@/components/ScrollProgress";
import { SvgDefs } from "@/components/SvgDefs";

export default function Page() {
  return (
    <main id="main">
      <SvgDefs />
      <ScrollProgress />
      <BonitoCursor />
      <FooterMotion />
      <Hero />
      <About />
      <Features />
      <Commands />
      <Footer />
    </main>
  );
}
