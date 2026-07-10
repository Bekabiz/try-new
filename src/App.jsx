import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Bot, Braces, BrainCircuit, Building2, ChevronDown, Database, Globe2, Menu, Network, Sparkles, Workflow, X, Zap } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const services = [
  { n:'01', icon:BrainCircuit, title:'AI implementation', text:'Practical AI embedded into the work your team already does — from copilots and knowledge systems to intelligent decision support.', tags:['AI strategy','Custom copilots','Knowledge systems'] },
  { n:'02', icon:Workflow, title:'Business automation', text:'We connect tools, data and people into reliable workflows that remove repetitive work and accelerate execution.', tags:['Workflow design','Integrations','Operations'] },
  { n:'03', icon:Braces, title:'Custom software', text:'Purpose-built web platforms, internal tools and digital products designed around the way your business actually works.', tags:['Web platforms','MVPs','Internal tools'] },
  { n:'04', icon:Network, title:'Intelligent systems', text:'Connected digital infrastructure that learns, reports and scales — transforming scattered processes into one operating system.', tags:['System architecture','Data flows','Dashboards'] }
];
const cases = [
  {type:'OPERATIONS PLATFORM',title:'AG Project Monitor',desc:'A mobile-first project operating system for a technical office — tasks, site visits, voice updates, reports and accountability in one place.',stat:'1 workspace',sub:'replacing fragmented work'},
  {type:'SEMANTIC INTELLIGENCE',title:'DomainIntel',desc:'An AI-powered matching engine that turns thousands of websites into relevant, searchable business opportunities.',stat:'20K+',sub:'domains structured'},
  {type:'WORKFORCE SYSTEM',title:'ClockET',desc:'A modern workforce platform for attendance, remote work, leave, budgets and operational visibility.',stat:'Real-time',sub:'workforce visibility'}
];

function City(){
  const buildings = Array.from({length:34},(_,i)=>({i,h:50+((i*47)%180),x:(i*83)%100,d:(i*37)%100,w:18+((i*13)%30)}));
  return <div className="city" aria-hidden="true"><div className="city-grid"/><div className="city-halo"/><div className="city-core"><span/><span/><span/></div>{buildings.map(b=><div key={b.i} className="building" style={{'--h':`${b.h}px`,'--x':`${b.x}%`,'--d':`${b.d}%`,'--w':`${b.w}px`,'--delay':`${(b.i%8)*-.35}s`}}><i/><b/></div>)}<svg className="city-lines" viewBox="0 0 1000 700" preserveAspectRatio="none"><path d="M90 560 C260 420 320 520 470 360 S730 400 930 170"/><path d="M110 250 C290 350 390 180 520 300 S760 180 900 360"/><path d="M220 610 C340 440 500 620 650 420 S820 480 940 310"/></svg></div>
}

function Orb(){return <div className="orb" aria-hidden="true"><div className="orb-ring r1"/><div className="orb-ring r2"/><div className="orb-ring r3"/><div className="orb-core"><Sparkles size={30}/></div>{Array.from({length:18},(_,i)=><i key={i} style={{'--i':i}}/>)}</div>}

function App(){
  const root=useRef(null); const [menu,setMenu]=useState(false);
  useEffect(()=>{const ctx=gsap.context(()=>{
    gsap.from('.nav-inner',{y:-30,opacity:0,duration:.9,ease:'power3.out'});
    gsap.from('.hero-copy > *',{y:50,opacity:0,stagger:.1,duration:1.1,ease:'power3.out',delay:.15});
    gsap.from('.city',{scale:.76,rotateX:16,opacity:0,duration:1.5,ease:'power3.out',delay:.25});
    gsap.to('.city',{yPercent:-12,scale:1.08,rotateX:-3,scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1.2}});
    gsap.to('.hero-copy',{yPercent:-28,opacity:.18,scrollTrigger:{trigger:'.hero',start:'top top',end:'80% top',scrub:1}});
    gsap.utils.toArray('.reveal').forEach(el=>gsap.from(el,{y:60,opacity:0,duration:1,scrollTrigger:{trigger:el,start:'top 85%'}}));
    gsap.utils.toArray('.service-panel').forEach((el,i)=>gsap.from(el,{x:i%2?80:-80,rotateY:i%2?-4:4,opacity:0,duration:1.15,scrollTrigger:{trigger:el,start:'top 82%'}}));
    gsap.to('.signal-line',{strokeDashoffset:0,scrollTrigger:{trigger:'.system-section',start:'top 70%',end:'bottom 40%',scrub:1}});
    gsap.to('.system-orbit',{rotate:360,duration:30,repeat:-1,ease:'none'});
  },root); return()=>ctx.revert()},[]);
  return <div ref={root}>
    <nav><div className="nav-inner"><a className="brand" href="#top"><span className="brand-mark">E</span><span>EVRIEL</span></a><div className={`nav-links ${menu?'open':''}`}><a href="#services">Services</a><a href="#work">Work</a><a href="#approach">Approach</a><a href="#contact">Contact</a></div><a className="nav-cta" href="#contact">Start a project <ArrowUpRight size={16}/></a><button className="menu" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></div></nav>

    <main id="top">
      <section className="hero"><div className="noise"/><City/><div className="hero-copy"><div className="eyebrow"><span/> AI · AUTOMATION · SOFTWARE</div><h1>We build the systems<br/>your business <em>becomes.</em></h1><p>Evriel Systems turns ambitious ideas and inefficient operations into intelligent software, automated workflows and measurable momentum.</p><div className="hero-actions"><a className="button primary" href="#contact">Build with us <ArrowUpRight/></a><a className="button ghost" href="#work">Explore our work</a></div></div><div className="scroll-cue"><span>SCROLL TO ENTER</span><ChevronDown/></div></section>

      <section className="manifesto section"><div className="section-index">00 / WHY EVRIEL</div><div className="manifesto-grid"><div className="reveal"><p className="kicker">Businesses do not need more software.</p><h2>They need a better way to <span>operate.</span></h2></div><div className="reveal manifesto-copy"><p>We design technology around outcomes, not trends. Every system starts with one question: where can intelligence create the most value?</p><p>The answer becomes an experience that feels simple on the surface — and works powerfully underneath.</p></div></div><div className="metric-row reveal"><div><strong>01</strong><span>Understand the operation</span></div><div><strong>02</strong><span>Design the intelligence</span></div><div><strong>03</strong><span>Engineer the system</span></div><div><strong>04</strong><span>Measure the impact</span></div></div></section>

      <section id="services" className="services section"><div className="section-head reveal"><div><div className="section-index">01 / CAPABILITIES</div><h2>Four disciplines.<br/><span>One connected system.</span></h2></div><p>From first strategy to final deployment, we bring together intelligence, automation and software engineering.</p></div><div className="service-stack">{services.map((s,i)=><article className="service-panel" key={s.title}><div className="service-number">{s.n}</div><div className="service-icon"><s.icon/></div><div><h3>{s.title}</h3><p>{s.text}</p><div className="tags">{s.tags.map(t=><span key={t}>{t}</span>)}</div></div><ArrowUpRight className="service-arrow"/></article>)}</div></section>

      <section id="approach" className="system-section section"><div className="system-copy reveal"><div className="section-index">02 / THE EVRIEL ENGINE</div><h2>From disconnected work<br/>to an <span>intelligent operation.</span></h2><p>We map the entire flow — customers, teams, data and decisions — then build the digital layer that connects them.</p><div className="system-list"><div><i>01</i><span><b>Observe</b>Find friction, repetition and lost information.</span></div><div><i>02</i><span><b>Orchestrate</b>Design the future workflow and intelligence layer.</span></div><div><i>03</i><span><b>Operationalize</b>Deploy, train and continuously improve.</span></div></div></div><div className="system-visual reveal"><div className="system-orbit"><span className="node n1"><Bot/></span><span className="node n2"><Database/></span><span className="node n3"><Building2/></span><span className="node n4"><Globe2/></span></div><svg viewBox="0 0 500 500"><circle cx="250" cy="250" r="195"/><circle cx="250" cy="250" r="130"/><path className="signal-line" d="M250 55 C410 110 440 270 350 390 C270 495 80 420 60 260 C40 100 180 35 250 55Z"/></svg><Orb/><div className="data-badge b1"><span>WORKFLOW</span><b>Connected</b></div><div className="data-badge b2"><span>DECISIONS</span><b>Intelligent</b></div><div className="data-badge b3"><span>OPERATIONS</span><b>Visible</b></div></div></section>

      <section id="work" className="work section"><div className="section-head reveal"><div><div className="section-index">03 / SELECTED SYSTEMS</div><h2>Built for the<br/><span>real world.</span></h2></div><p>Products and platforms created around real operations, real users and real business value.</p></div><div className="case-grid">{cases.map((c,i)=><article className={`case case-${i+1} reveal`} key={c.title}><div className="case-top"><span>{c.type}</span><ArrowUpRight/></div><div className="case-art"><div className="mini-ui"><div className="ui-bar"/><div className="ui-grid">{Array.from({length:9},(_,j)=><i key={j}/>)}</div></div></div><h3>{c.title}</h3><p>{c.desc}</p><div className="case-stat"><strong>{c.stat}</strong><span>{c.sub}</span></div></article>)}</div></section>

      <section className="difference section"><div className="difference-card reveal"><div className="difference-glow"/><div className="section-index">04 / OUR DIFFERENCE</div><h2>Small enough to care.<br/>Technical enough to <span>deliver.</span></h2><p>You work directly with the people designing and building your system. No layers, no theatre, no generic transformation decks.</p><div className="principles"><span><Zap/>Fast, focused execution</span><span><BrainCircuit/>AI-native thinking</span><span><Building2/>Business-first design</span><span><Globe2/>Built to scale globally</span></div></div></section>

      <section id="contact" className="contact section"><div className="contact-orbit"><Orb/></div><div className="contact-copy reveal"><div className="section-index">05 / START SOMETHING</div><h2>Your next system<br/>starts with a <span>conversation.</span></h2><p>Tell us what is slowing your business down, what you want to build, or where you see an opportunity. We will help turn it into a clear path forward.</p><a className="button primary large" href="mailto:contact@evrielsystems.com?subject=Project inquiry — Evriel Systems">contact@evrielsystems.com <ArrowUpRight/></a></div></section>
    </main>
    <footer><div className="brand"><span className="brand-mark">E</span><span>EVRIEL</span></div><p>AI implementation · Automation · Software development</p><div><a href="mailto:contact@evrielsystems.com">Email</a><a href="https://www.linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a></div><span>© {new Date().getFullYear()} Evriel Systems</span></footer>
  </div>
}
export default App;
