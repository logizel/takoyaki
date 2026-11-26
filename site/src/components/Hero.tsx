import { TakoyakiPlate } from "@/components/TakoyakiPlate";

export function Hero() {
  return (
    <section id="home" className="screen screen--home">
      <div className="screen__inner">
        <TakoyakiPlate className="hero-plate" />
        <h1 className="wordmark">
          <span className="wordmark__jp">たこやき</span>
          <span className="wordmark__rm">ta ko ya ki</span>
        </h1>
      </div>
      <span className="scroll-cue" aria-hidden="true">scroll</span>
    </section>
  );
}
