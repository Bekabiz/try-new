import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, Bot, BrainCircuit, Braces,
  Building2, Check, ChevronRight, CircleDot, Database, Globe2,
  Layers3, Menu, Network, Radar, Sparkles, Workflow, X, Zap
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CityCanvas from './CityCanvas.jsx';

gsap.registerPlugin(ScrollTrigger);

const capabilities = [
  { id:'01', icon:BrainCircuit, title:'AI Integration', cover:'Assistants · Knowledge systems', text:'Practical AI built into the systems your teams already use — assistants, knowledge tools and intelligent platforms.', signal:'INTELLIGENCE' },
  { id:'02', icon:Workflow, title:'Automation', cover:'Workflows · Digital transformation', text:'Reduce repetitive work and modernize operations through intelligent process automation.', signal:'MOMENTUM' },
  { id:'03', icon:Database, title:'Business Intelligence', cover:'Analytics · Decision support', text:'Transform business information into actionable insight, operational visibility and confident decisions.', signal:'CLARITY' },
  { id:'04', icon:Braces, title:'Industry Solutions', cover:'Custom platforms · Internal tools', text:'Custom-built systems designed around the unique operational needs of each organization.', signal:'ADVANTAGE' }
];

const projects = [
  { num:'01', title:'AI Business Integration', label:'CIVIL ENGINEERING', text:'An AI-powered communication system for a civil engineering firm — classifying emails, identifying urgency and generating professional draft responses.', chips:['AI communication','Email classification','Transformation roadmap'], visual:'inbox' },
  { num:'02', title:'Domain Intel', label:'SEMANTIC INTELLIGENCE', text:'An intelligent platform that analyzes, compares and qualifies domains while surfacing relevance, authority and opportunity potential.', chips:['20K+ domains','Opportunity discovery','SEO intelligence'], visual:'network' },
  { num:'03', title:'Workforce AI', label:'OPERATIONS PLATFORM', text:'A unified mobile and web system for attendance verification, workforce management and real-time operational visibility.', chips:['GPS attendance','Identity verification','Workforce analytics'], visual:'workforce' },
  { num:'04', title:'Project Vision', label:'IN DEVELOPMENT', text:'A construction intelligence environment connecting voice notes, site photographs, drawings, documentation and AI-powered reporting.', chips:['Voice intelligence','Site progress','Project knowledge'], visual:'construction' }
];

const industries = ['Construction & Engineering','Manufacturing & Industrial','Tourism & Hospitality','Retail & Commerce','Import & Export','Professional Services','Marketing & SEO','European Projects','Education & Training','Startups & SMEs'];

function Mark({ compact=false }) {
  return <span className={`mark ${compact?'compact':''}`} aria-hidden="true"><i/><i/><i/><b>E</b></span>;
}

function ProjectVisual({ type }) {
  if(type==='network') return <div className="project-visual network-visual"><div className="network-globe"><span className="net-core">DI</span>{Array.from({length:16},(_,i)=><i key={i} style={{'--i':i}}/>)}{Array.from({length:5},(_,i)=><b key={i} style={{'--i':i}}/>)}</div><div className="visual-readout"><span>SEMANTIC MATCH</span><strong>94.8%</strong></div></div>;
  if(type==='workforce') return <div className="project-visual workforce-visual"><div className="phone"><div className="phone-top"><span>09:41</span><i/></div><div className="avatar-ring"><div>BT</div><Check/></div><h4>Checked in</h4><p>Pyrgos Office · Verified</p><div className="mini-stats"><span><b>08:03</b>Start</span><span><b>4.8 km</b>Location</span></div></div><div className="pulse-map"><i/><i/><i/><b/></div></div>;
  if(type==='construction') return <div className="project-visual construction-visual"><div className="blueprint"><i/><i/><i/><i/><div className="tower-wire"><span/><span/><span/><span/></div></div><div className="voice-card"><div className="wave">{Array.from({length:18},(_,i)=><i key={i} style={{'--i':i}}/> )}</div><span>Site note transcribed</span></div></div>;
  return <div className="project-visual inbox-visual"><div className="inbox-shell"><div className="inbox-nav"><span/><span/><span/><i/></div><div className="mail-list">{['URGENT','PROJECT','INVOICE','GENERAL'].map((x,i)=><div key={x}><b className={`tone t${i}`}/><span><strong>{x}</strong><small>{['Structural review required','New site documentation','Payment confirmation','Meeting follow-up'][i]}</small></span><em>{['Now','4m','18m','1h'][i]}</em></div>)}</div><div className="ai-draft"><Sparkles/><span><b>AI response ready</b>Professional draft generated from project context.</span><ArrowUpRight/></div></div></div>;
}

function App() {
  const root = useRef(null);
  const cityProgress = useRef(0);
  const [menuOpen,setMenuOpen] = useState(false);
  const [loaded,setLoaded] = useState(false);

  useEffect(()=>{
    const timer=setTimeout(()=>setLoaded(true),500);
    return()=>clearTimeout(timer);
  },[]);

  useEffect(()=>{
    if(!loaded) return;
    const ctx=gsap.context(()=>{
      const mm=gsap.matchMedia();
      gsap.from('.nav-shell',{y:-28,opacity:0,duration:1,ease:'power3.out'});
      gsap.from('.hero-intro > *',{y:46,opacity:0,duration:1.1,stagger:.1,ease:'power3.out',delay:.15});

      ScrollTrigger.create({
        trigger:'.city-journey',start:'top top',end:'bottom bottom',scrub:true,
        onUpdate:self=>{cityProgress.current=self.progress;}
      });

      const stageEls=gsap.utils.toArray('.journey-stage');
      stageEls.forEach((stage,i)=>{
        const start=i===0?0:i*.245-.02;
        const end=i===0?.23:start+.26;
        gsap.timeline({scrollTrigger:{trigger:'.city-journey',start:`top+=${start*100}% top`,end:`top+=${end*100}% top`,scrub:1}})
          .fromTo(stage,{autoAlpha:i===0?1:0,y:i===0?0:36},{autoAlpha:1,y:0,duration:.35})
          .to(stage,{autoAlpha:i===3?1:0,y:i===3?0:-30,duration:.35},.65);
      });

      gsap.utils.toArray('[data-reveal]').forEach((el)=>{
        gsap.from(el,{y:60,opacity:0,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 84%'}});
      });
      gsap.utils.toArray('.capability-row').forEach((el,i)=>{
        gsap.from(el,{x:i%2===0?-70:70,opacity:0,duration:1.05,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 86%'}});
      });
      gsap.to('.orbit-system',{rotate:360,duration:42,repeat:-1,ease:'none'});
      gsap.to('.orbit-system .orbit-node',{rotate:-360,duration:42,repeat:-1,ease:'none'});
      gsap.to('.process-rail-progress',{scaleX:1,ease:'none',scrollTrigger:{trigger:'.process',start:'top 70%',end:'bottom 70%',scrub:1}});
      gsap.utils.toArray('.project-card').forEach((card,i)=>{
        gsap.from(card,{y:90,opacity:0,rotateX:4,duration:1.2,ease:'power3.out',scrollTrigger:{trigger:card,start:'top 84%'}});
      });
      mm.add('(min-width: 901px)',()=>{
        gsap.to('.capability-visual-inner',{yPercent:35,ease:'none',scrollTrigger:{trigger:'.capabilities',start:'top bottom',end:'bottom top',scrub:1}});
      });
      return()=>mm.revert();
    },root);
    return()=>ctx.revert();
  },[loaded]);

  return <div ref={root} className={`app ${loaded?'loaded':''}`}>
    <div className="preloader"><Mark/><div className="load-word">EVRIEL <span>SYSTEMS</span></div><div className="load-line"><i/></div></div>

    <nav className="nav-shell">
      <a href="#top" className="logo"><Mark compact/><span>EVRIEL<small>SYSTEMS</small></span></a>
      <div className={`nav-links ${menuOpen?'open':''}`}>
        <a href="#capabilities" onClick={()=>setMenuOpen(false)}>Capabilities</a>
        <a href="#work" onClick={()=>setMenuOpen(false)}>Systems</a>
        <a href="#process" onClick={()=>setMenuOpen(false)}>Process</a>
        <a href="#about" onClick={()=>setMenuOpen(false)}>About</a>
      </div>
      <a className="nav-contact" href="mailto:contact@evrielsystems.com">LET'S TALK <ArrowUpRight size={14}/></a>
      <button className="menu-button" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen?<X/>:<Menu/>}</button>
    </nav>

    <main id="top">
      <section className="city-journey">
        <div className="city-sticky">
          <CityCanvas progressRef={cityProgress}/>
          <div className="city-noise"/>
          <div className="city-hud"><span>EVRIEL // INTELLIGENT OPERATIONS</span><span className="hud-right"><i/> SYSTEM ONLINE</span></div>

          <div className="journey-stage hero-intro stage-one">
            <div className="eyebrow"><i/> AI · AUTOMATION · INTELLIGENT SYSTEMS</div>
            <h1>Connecting<br/><span>Intelligence</span><br/>with Business.</h1>
            <p>We turn disconnected operations into intelligent systems that help organizations work better, decide faster and grow with confidence.</p>
            <div className="hero-actions"><a href="#capabilities" className="btn btn-primary">EXPLORE SOLUTIONS <ArrowUpRight/></a><a href="mailto:contact@evrielsystems.com" className="btn btn-ghost">DISCUSS YOUR PROJECT</a></div>
          </div>

          <div className="journey-stage stage-two">
            <div className="stage-number">01</div><div className="eyebrow"><i/> THE OPERATION</div>
            <h2>Every business is already<br/>a <span>living system.</span></h2>
            <p>People, processes, information and technology are constantly moving. The challenge is making them move together.</p>
            <div className="floating-tags"><span>PEOPLE</span><span>PROCESSES</span><span>INFORMATION</span><span>TECHNOLOGY</span></div>
          </div>

          <div className="journey-stage stage-three">
            <div className="stage-number">02</div><div className="eyebrow"><i/> THE INTELLIGENCE LAYER</div>
            <h2>We connect the signals<br/>others leave <span>scattered.</span></h2>
            <p>AI understands. Automation moves. Software holds everything together. The result is one operation with visibility and momentum.</p>
            <div className="system-legend"><span><BrainCircuit/> AI</span><span><Workflow/> AUTOMATION</span><span><Database/> DATA</span><span><Braces/> SOFTWARE</span></div>
          </div>

          <div className="journey-stage stage-four">
            <div className="eyebrow"><i/> THE OUTCOME</div>
            <h2>One connected system.<br/><span>Built around you.</span></h2>
            <p>Not technology for technology’s sake. Practical intelligence designed around how your organization really works.</p>
            <a href="#work" className="text-link">ENTER THE SYSTEM <ArrowDown/></a>
          </div>

          <div className="scroll-meter"><span>SCROLL TO EXPLORE</span><div><i/></div><em>00 — 04</em></div>
        </div>
      </section>

      <section className="signal-strip" aria-label="Services"><div className="signal-track">{[...Array(2)].flatMap((_,r)=>['AI INTEGRATION','DIGITAL TRANSFORMATION','BUSINESS INTELLIGENCE','WORKFLOW AUTOMATION','INTELLIGENT SYSTEMS','DATA ANALYTICS','INDUSTRY SOLUTIONS','OPERATIONAL EXCELLENCE'].map((x,i)=><span key={`${r}-${i}`}>{x}<i/></span>))}</div></section>

      <section className="shift section-pad">
        <div className="section-code">EVR / 001</div>
        <div className="shift-grid">
          <div data-reveal><div className="eyebrow"><i/> WHY INTELLIGENCE</div><h2>Manual.<br/>Repetitive.<br/>Slow.<br/><span>Disconnected.</span></h2></div>
          <div className="shift-right" data-reveal><p className="large-copy">Intelligence turns scattered work into a connected system.</p><div className="shift-diagram"><div className="chaos-nodes">{['Email','Files','Tasks','Data','Teams','Clients'].map((x,i)=><span key={x} style={{'--i':i}}>{x}</span>)}</div><div className="shift-core"><Sparkles/><b>EVRIEL</b><small>INTELLIGENCE LAYER</small></div><div className="outcome-stack"><span><Check/>Efficiency</span><span><Check/>Visibility</span><span><Check/>Decisions</span><span><Check/>Growth</span></div></div></div>
        </div>
      </section>

      <section id="capabilities" className="capabilities section-pad">
        <div className="section-heading" data-reveal><div><div className="eyebrow"><i/> CAPABILITIES</div><h2>Four disciplines.<br/><span>One operating system.</span></h2></div><p>From the first operational question to the final deployed platform, we bring strategy, intelligence and engineering into one connected process.</p></div>
        <div className="capabilities-layout">
          <div className="capability-list">{capabilities.map((c)=><article className="capability-row" key={c.id}><span className="cap-id">{c.id}</span><div className="cap-icon"><c.icon/></div><div className="cap-main"><span>{c.cover}</span><h3>{c.title}</h3><p>{c.text}</p></div><div className="cap-signal"><i/>{c.signal}</div><ArrowUpRight className="cap-arrow"/></article>)}</div>
          <div className="capability-visual"><div className="capability-visual-inner"><div className="orbit-system"><div className="orbit-ring ring-a"/><div className="orbit-ring ring-b"/><div className="orbit-ring ring-c"/><div className="orbit-core"><Mark compact/><span>EVRIEL</span><small>CONNECTED INTELLIGENCE</small></div>{capabilities.map((c,i)=><div className={`orbit-node node-${i+1}`} key={c.id}><c.icon/><span>{c.title}</span></div>)}</div><div className="orbit-caption"><span><i/> 4 DISCIPLINES</span><strong>ONE SYSTEM</strong></div></div></div>
        </div>
      </section>

      <section id="work" className="work section-pad">
        <div className="section-heading" data-reveal><div><div className="eyebrow"><i/> SELECTED SYSTEMS</div><h2>Built around real<br/><span>operational needs.</span></h2></div><p>Platforms, automations and intelligent tools created to solve specific business challenges — not to imitate generic technology trends.</p></div>
        <div className="project-stack">{projects.map((p,i)=><article className={`project-card project-${i+1}`} key={p.title}><div className="project-copy"><div className="project-meta"><span>{p.num}</span><i/>{p.label}</div><h3>{p.title}</h3><p>{p.text}</p><div className="project-chips">{p.chips.map(x=><span key={x}>{x}</span>)}</div><a href="mailto:contact@evrielsystems.com?subject=Project%20enquiry" className="project-link">BUILD A SYSTEM LIKE THIS <ArrowUpRight/></a></div><ProjectVisual type={p.visual}/></article>)}</div>
      </section>

      <section id="process" className="process section-pad">
        <div className="process-top" data-reveal><div className="eyebrow"><i/> HOW WE BUILD</div><h2>From complexity<br/>to <span>clarity.</span></h2><p>We begin with your operation, not a technology list. Each step turns uncertainty into a system your team can understand, use and improve.</p></div>
        <div className="process-rail"><div className="process-rail-progress"/>{[
          ['01','Discovery','We learn how your organization operates — its objectives, challenges, workflows and opportunities.'],
          ['02','Assessment','We identify where intelligence can remove friction and create measurable value.'],
          ['03','Design','We shape a solution around your real operation. No generic template. No one-size-fits-all.'],
          ['04','Implementation','We build and integrate the system into your working environment.'],
          ['05','Optimization','We improve performance, usability, automation and business outcomes over time.']
        ].map((x,i)=><div className="process-step" key={x[0]} data-reveal><div className="step-node"><span>{x[0]}</span><i/></div><h3>{x[1]}</h3><p>{x[2]}</p></div>)}</div>
      </section>

      <section className="industries section-pad">
        <div className="industry-shell">
          <div className="industry-copy" data-reveal><div className="eyebrow"><i/> ACROSS INDUSTRIES</div><h2>Different environments.<br/><span>The same hidden friction.</span></h2><p>Disconnected information, repetitive workflows and slow decisions appear everywhere. We adapt the system to the reality of each industry.</p><a href="mailto:contact@evrielsystems.com" className="btn btn-ghost">DISCUSS YOUR INDUSTRY <ArrowUpRight/></a></div>
          <div className="industry-orbit" data-reveal><div className="industry-rings"><i/><i/><i/></div><div className="industry-center"><Globe2/><span>MULTI-INDUSTRY</span><b>INTELLIGENCE</b></div>{industries.map((x,i)=><span className="industry-item" style={{'--i':i,'--total':industries.length}} key={x}>{x}</span>)}</div>
        </div>
      </section>

      <section id="about" className="about section-pad">
        <div className="about-shell">
          <div className="about-title" data-reveal><div className="section-code">EVR / 006</div><div className="eyebrow"><i/> ABOUT EVRIEL</div><h2>Intelligence<br/><span>with purpose.</span></h2></div>
          <div className="about-copy" data-reveal><p className="large-copy">The challenge is not accessing AI. It is implementing it correctly.</p><p>Evriel Systems helps organizations bridge the gap between emerging technology and practical business value. We design intelligent systems that connect people, processes, information and technology.</p><p>Founded by Bereket Teshome, Evriel was shaped through experience across business, marketing, European projects and digital transformation initiatives in Poland, Spain, Italy and Greece.</p><div className="about-values"><span><Zap/>Practical solutions</span><span><CircleDot/>Business-first thinking</span><span><Layers3/>Scalable foundations</span><span><Globe2/>Global perspective</span></div></div>
        </div>
      </section>

      <section className="final-cta section-pad">
        <div className="cta-grid"/><div className="cta-orb"><div className="cta-orb-core"><Mark/><i/><i/><i/></div></div>
        <div className="cta-copy" data-reveal><div className="eyebrow"><i/> START SOMETHING INTELLIGENT</div><h2>Your business already has the signals.<br/><span>Let’s connect them.</span></h2><p>Tell us where work feels slow, fragmented or unnecessarily manual. We’ll help you see the system that could replace it.</p><a className="btn btn-primary btn-large" href="mailto:contact@evrielsystems.com?subject=New%20project%20with%20Evriel%20Systems">START A CONVERSATION <ArrowUpRight/></a></div>
      </section>
    </main>

    <footer><a href="#top" className="logo footer-logo"><Mark compact/><span>EVRIEL<small>SYSTEMS</small></span></a><p>AI · AUTOMATION · INTELLIGENT SYSTEMS</p><div className="footer-links"><a href="#capabilities">Capabilities</a><a href="#work">Systems</a><a href="#about">About</a><a href="mailto:contact@evrielsystems.com">Contact</a></div><div className="footer-bottom"><span>© 2026 EVRIEL SYSTEMS</span><span>CONNECTING INTELLIGENCE WITH BUSINESS</span></div></footer>
  </div>;
}

export default App;
